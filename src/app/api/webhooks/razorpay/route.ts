import { NextResponse, after } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, orderConfirmationEmailHtml, generateInvoicePdfBase64 } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured on the server");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Verify the webhook signature securely
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const eventType = payload.event;

    // Fulfill order only on payment success events
    if (eventType !== "order.paid" && eventType !== "payment.captured") {
      return NextResponse.json({ success: true, message: `Ignored event: ${eventType}` });
    }

    let razorpayOrderId: string | null = null;
    let razorpayPaymentId: string | null = null;

    if (eventType === "order.paid") {
      razorpayOrderId = payload.payload?.order?.entity?.id || null;
      razorpayPaymentId = payload.payload?.payment?.entity?.id || null;
    } else if (eventType === "payment.captured") {
      razorpayOrderId = payload.payload?.payment?.entity?.order_id || null;
      razorpayPaymentId = payload.payload?.payment?.entity?.id || null;
    }

    if (!razorpayOrderId) {
      return NextResponse.json({ error: "No Razorpay Order ID found in webhook payload" }, { status: 400 });
    }

    const supabase = createServiceClient(); // service client bypasses RLS

    // Retrieve order details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    if (orderErr) {
      console.error("Error looking up order in webhook:", orderErr);
      return NextResponse.json({ error: "Database lookup failed" }, { status: 500 });
    }

    if (!order) {
      console.warn(`Order not found for Razorpay Order ID: ${razorpayOrderId}`);
      return NextResponse.json({ success: true, message: "Order not found in database" });
    }

    // If order is already paid, do not repeat execution (deduplication)
    if (order.payment_status === "paid") {
      return NextResponse.json({ success: true, message: "Order already marked as paid" });
    }

    // Fetch payments if payment ID was missing from payload
    if (!razorpayPaymentId) {
      try {
        const Razorpay = (await import("razorpay")).default;
        const rzp = new Razorpay({
          key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
          key_secret: process.env.RAZORPAY_KEY_SECRET!
        });
        const payments = await rzp.orders.fetchPayments(razorpayOrderId);
        if (payments && payments.items && payments.items.length > 0) {
          const successfulPayment = payments.items.find((p: any) => p.status === "captured" || p.status === "authorized");
          if (successfulPayment) {
            razorpayPaymentId = successfulPayment.id;
          }
        }
      } catch (fetchErr) {
        console.error("Failed to fetch payments from Razorpay for order:", fetchErr);
      }
    }

    // 1. Update order payment status to paid
    const { error: orderUpdateErr } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
        placed_at: new Date().toISOString()
      })
      .eq("id", order.id);

    if (orderUpdateErr) {
      console.error("Failed to update order status in webhook:", orderUpdateErr);
      return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
    }

    // 2. Perform post-payment database operations concurrently
    const postInsertWrites: any[] = [
      supabase.from("order_events").insert({
        order_id: order.id,
        status: "pending",
        note: "Order payment confirmed via webhook",
      })
    ];

    // Decrement stock based on order items
    const dbItems = order.order_items || [];
    for (const item of dbItems) {
      const { data: prod } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
      if (prod) {
        postInsertWrites.push(
          supabase.from("products").update({ stock: Math.max(0, prod.stock - item.quantity) }).eq("id", item.product_id)
        );
      }

      if (item.size || item.color) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("id, stock")
          .eq("product_id", item.product_id)
          .eq("size", item.size)
          .eq("color", item.color)
          .maybeSingle();

        if (variant) {
          postInsertWrites.push(
            supabase.from("product_variants").update({ stock: Math.max(0, variant.stock - item.quantity) }).eq("id", variant.id)
          );
        }
      }
    }

    // Update coupon usage count
    if (order.coupon_id) {
      const { data: coupon } = await supabase.from("coupons").select("used_count").eq("id", order.coupon_id).single();
      const nextUsed = (coupon?.used_count || 0) + 1;
      postInsertWrites.push(supabase.from("coupons").update({ used_count: nextUsed }).eq("id", order.coupon_id));
    }

    // Process wallet credits deductions
    if (order.wallet_used_paise > 0) {
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("amount_paise, type, expires_at")
        .eq("user_id", order.user_id);

      let activeBalance = 0;
      if (txns) {
        const nowTime = new Date();
        txns.forEach((t) => {
          if (t.type === "cashback_credit") {
            const exp = t.expires_at ? new Date(t.expires_at) : null;
            if (!exp || exp > nowTime) {
              activeBalance += t.amount_paise;
            }
          } else {
            activeBalance += t.amount_paise;
          }
        });
        activeBalance = Math.max(0, activeBalance);
      }

      const finalBal = Math.max(0, activeBalance - order.wallet_used_paise);
      postInsertWrites.push(
        supabase.from("wallet_transactions").insert({
          user_id: order.user_id,
          type: "redeem",
          amount_paise: -order.wallet_used_paise,
          order_id: order.id,
          note: `Redeemed for order ${order.order_number} (Webhook confirmed)`,
        }),
        supabase
          .from("wallets")
          .update({ balance_paise: finalBal, updated_at: new Date().toISOString() })
          .eq("user_id", order.user_id)
      );
    }

    const writeResults = await Promise.all(postInsertWrites);
    const failedWrite = writeResults.find((r: any) => r?.error);
    if (failedWrite?.error) {
      console.error("Failed post-payment database writes in webhook:", failedWrite.error);
    }

    // 3. Dispatch confirmation email with invoice PDF asynchronously
    let dbUserEmail: string | undefined = undefined;
    let dbFullName: string | undefined = undefined;
    let dbUserId: string | number | undefined = undefined;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("id", order.user_id)
        .single();
      if (profile) {
        dbUserId = profile.user_id;
        dbUserEmail = profile.email;
        dbFullName = profile.full_name;
      }
    } catch (err) {
      console.error("Failed to fetch user profile for invoice in webhook:", err);
    }

    if (dbUserEmail) {
      after(async () => {
        let pdfBase64 = "";
        try {
          pdfBase64 = generateInvoicePdfBase64({
            orderNumber: order.order_number,
            name: dbFullName || "Customer",
            items: dbItems.map((i: any) => ({
              product_id: i.product_id,
              name: i.name,
              variant: i.variant,
              sku: i.sku,
              size: i.size,
              color: i.color,
              image_url: i.image_url,
              unit_price_paise: i.unit_price_paise,
              quantity: i.quantity,
              cashback_paise: i.cashback_paise,
            })),
            shippingAddress: order.shipping_address,
            subtotalPaise: order.subtotal_paise,
            discountPaise: order.discount_paise,
            shippingPaise: order.shipping_paise,
            walletUsedPaise: order.wallet_used_paise,
            totalPaise: order.total_paise,
            cashbackEarnedPaise: order.cashback_earned_paise,
            userId: dbUserId,
          });
        } catch (pdfErr) {
          console.error("PDF generation failed in webhook:", pdfErr);
        }

        await sendEmail({
          to: dbUserEmail!,
          subject: `Order Confirmed — ${order.order_number} | JAI SRI RAM TEXTILES`,
          html: orderConfirmationEmailHtml({
            orderNumber: order.order_number,
            name: dbFullName || "Customer",
            items: dbItems.map((i: any) => ({
              product_id: i.product_id,
              name: i.name,
              variant: i.variant,
              sku: i.sku,
              size: i.size,
              color: i.color,
              image_url: i.image_url,
              unit_price_paise: i.unit_price_paise,
              quantity: i.quantity,
              cashback_paise: i.cashback_paise,
            })),
            shippingAddress: order.shipping_address,
            subtotalPaise: order.subtotal_paise,
            discountPaise: order.discount_paise,
            shippingPaise: order.shipping_paise,
            walletUsedPaise: order.wallet_used_paise,
            totalPaise: order.total_paise,
            cashbackEarnedPaise: order.cashback_earned_paise,
            userId: dbUserId,
          }),
          ...(pdfBase64 ? {
            attachments: [
              {
                filename: `invoice_${order.order_number}.pdf`,
                content: pdfBase64,
              }
            ]
          } : {})
        }).catch((err) => console.error("Order confirmation email failed in webhook:", err));
      });
    }

    return NextResponse.json({ success: true, message: "Order successfully fulfilled via webhook" });
  } catch (err: any) {
    console.error("Razorpay webhook server error:", err);
    return NextResponse.json({ error: err.message || "Failed to process webhook" }, { status: 500 });
  }
}
