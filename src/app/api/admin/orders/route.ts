import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, orderDeliveredEmailHtml, orderShippedEmailHtml, refundProcessedEmailHtml, orderRejectedEmailHtml, generateInvoicePdfBase64 } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

async function checkAdminAuth() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

// GET: Fetch all orders with items and profile info
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        profiles (user_id, full_name, email, phone),
        order_items (*, products(description, pieces_per_pack)),
        order_events (*),
        coupons (code, type, value)
      `)
      .order("placed_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(orders);
  } catch (error: any) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Edit order status, tracking code, or shipping address
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      id,
      status,
      tracking_id,
      courier_tracking_url,
      shipping_address,
      rejection_reason,
      note,
      payment_status,
      refund_amount_paise,
      refund_transaction_id,
      refund_screenshot_url,
      refund_note,
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    if (status === "rejected" && !rejection_reason?.trim()) {
      return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Load original order to compare status (and enough detail to email on delivery)
    const { data: originalOrder } = await supabase
      .from("orders")
      .select("status, payment_status, order_number, total_paise, subtotal_paise, discount_paise, shipping_paise, wallet_used_paise, cashback_earned_paise, shipping_address, tracking_id, courier_tracking_url, profiles(email, full_name, user_id, phone), order_items(name, variant, unit_price_paise, quantity, image_url, products(pieces_per_pack))")
      .eq("id", id)
      .single();

    // 1. Prepare fields to update
    const updateFields: any = {};
    if (status) updateFields.status = status;
    if (tracking_id !== undefined) updateFields.tracking_id = tracking_id || null;
    if (courier_tracking_url !== undefined) updateFields.courier_tracking_url = courier_tracking_url || null;
    if (shipping_address) updateFields.shipping_address = shipping_address;
    if (rejection_reason !== undefined) updateFields.rejection_reason = rejection_reason?.trim() || null;
    if (payment_status !== undefined) updateFields.payment_status = payment_status;
    if (refund_amount_paise !== undefined) updateFields.refund_amount_paise = refund_amount_paise;
    if (refund_transaction_id !== undefined) updateFields.refund_transaction_id = refund_transaction_id || null;
    if (refund_screenshot_url !== undefined) updateFields.refund_screenshot_url = refund_screenshot_url || null;
    if (refund_note !== undefined) updateFields.refund_note = refund_note || null;
    if (payment_status === "refunded") {
      updateFields.refunded_at = new Date().toISOString();
    }

    // 2. Perform update
    const { error: updateError } = await supabase
      .from("orders")
      .update(updateFields)
      .eq("id", id);

    if (updateError) throw updateError;

    // 3. Log event if status changed
    if (status && originalOrder && originalOrder.status !== status) {
      await supabase
        .from("order_events")
        .insert({
          order_id: id,
          status: status,
          note: status === "rejected" ? rejection_reason.trim() : (note || `Order status updated to '${status}' by admin/staff`),
        });

      // 4. Send delivery confirmation email on the pending -> delivered transition
      // (no invoice attached here — the invoice already went out on the shipped email)
      if (status === "delivered") {
        const profile = originalOrder.profiles as any;
        if (profile?.email) {
          await sendEmail({
            to: profile.email,
            subject: `Order Delivered — ${originalOrder.order_number} | JAI SRI RAM TEXTILES`,
            html: orderDeliveredEmailHtml({
              orderNumber: originalOrder.order_number,
              name: profile.full_name,
              items: originalOrder.order_items || [],
              totalPaise: originalOrder.total_paise,
              trackingId: originalOrder.tracking_id || tracking_id,
            }),
          }).catch((err) => console.error("Delivery email failed:", err));
        }
      }

      // Send shipment notification (with tracking + invoice attached) on the -> shipped transition
      if (status === "shipped") {
        const profile = originalOrder.profiles as any;
        if (profile?.email) {
          const finalTrackingId = tracking_id || originalOrder.tracking_id || null;
          const finalTrackingUrl = courier_tracking_url || originalOrder.courier_tracking_url || null;
          const finalCourierName = shipping_address?.courier_name || originalOrder.shipping_address?.courier_name || null;
          const finalDeliveryDate = shipping_address?.delivery_date || originalOrder.shipping_address?.delivery_date || null;

          // Generate PDF Invoice with AWB number and courier name
          let pdfBase64 = "";
          try {
            pdfBase64 = generateInvoicePdfBase64({
              orderNumber: originalOrder.order_number,
              name: profile.full_name,
              items: originalOrder.order_items || [],
              shippingAddress: originalOrder.shipping_address,
              subtotalPaise: originalOrder.subtotal_paise || 0,
              discountPaise: originalOrder.discount_paise || 0,
              shippingPaise: originalOrder.shipping_paise || 0,
              walletUsedPaise: originalOrder.wallet_used_paise || 0,
              totalPaise: originalOrder.total_paise || 0,
              cashbackEarnedPaise: originalOrder.cashback_earned_paise || 0,
              userId: profile.user_id,
              trackingId: finalTrackingId,
              carrierName: finalCourierName,
            });
          } catch (pdfErr) {
            console.error("PDF generation on shipment failed:", pdfErr);
          }

          await sendEmail({
            to: profile.email,
            subject: `Order Shipped — ${originalOrder.order_number} | JAI SRI RAM TEXTILES`,
            html: orderShippedEmailHtml({
              orderNumber: originalOrder.order_number,
              name: profile.full_name,
              items: originalOrder.order_items || [],
              totalPaise: originalOrder.total_paise,
              trackingId: finalTrackingId,
              trackingUrl: finalTrackingUrl,
              courierName: finalCourierName,
              estimatedDeliveryDate: finalDeliveryDate,
            }),
            ...(pdfBase64 ? {
              attachments: [
                {
                  filename: `invoice_${originalOrder.order_number}.pdf`,
                  content: pdfBase64,
                }
              ]
            } : {})
          }).catch((err) => console.error("Shipment email failed:", err));
        }
      }

      // Send rejection confirmation email on status transition to rejected
      if (status === "rejected") {
        const profile = originalOrder.profiles as any;
        if (profile?.email) {
          await sendEmail({
            to: profile.email,
            subject: `Order Rejected — ${originalOrder.order_number} | JAI SRI RAM TEXTILES`,
            html: orderRejectedEmailHtml({
              orderNumber: originalOrder.order_number,
              name: profile.full_name,
              items: originalOrder.order_items || [],
              totalPaise: originalOrder.total_paise,
              rejectionReason: rejection_reason?.trim() || null,
            }),
          }).catch((err) => console.error("Rejection email failed:", err));
        }
      }

      // Send WhatsApp Notification for status change
      const shippingAddr = (shipping_address || originalOrder.shipping_address) as any;
      const recipientPhone = shippingAddr?.phone || (originalOrder.profiles as any)?.phone;

      if (recipientPhone) {
        let whatsappMessage = "";

        if (status === "shipped") {
          const finalTrackingId = tracking_id || originalOrder.tracking_id || "N/A";
          const finalCourierName = shipping_address?.courier_name || originalOrder.shipping_address?.courier_name || "Courier";
          const trackingUrlMsg = courier_tracking_url || originalOrder.courier_tracking_url 
            ? `Track here: ${courier_tracking_url || originalOrder.courier_tracking_url}` 
            : "";
          whatsappMessage = `Vanakkam! 🌸\n\nGood news! Your order *${originalOrder.order_number}* has been shipped.\n\nCourier: ${finalCourierName}\nTracking ID: ${finalTrackingId}\n${trackingUrlMsg}\n\nEstimated Delivery: ${shippingAddr?.delivery_date || "4-7 business days"}`;
        } else if (status === "delivered") {
          whatsappMessage = `Vanakkam! 🌸\n\nYour order *${originalOrder.order_number}* has been delivered successfully!\n\nWe hope you love your handloom products. Thank you for choosing JAI SRI RAM TEXTILES! 🌾`;
        } else if (status === "rejected") {
          const reason = rejection_reason?.trim() || "Not specified";
          whatsappMessage = `Vanakkam! 🌸\n\nYour order *${originalOrder.order_number}* has been cancelled/rejected.\n\nReason: ${reason}\n\nIf you have already paid, your refund will be initiated shortly.`;
        } else {
          // Other statuses (confirmed, packed, out_for_delivery, returned, etc.)
          whatsappMessage = `Vanakkam! 🌸\n\nYour order *${originalOrder.order_number}* status has been updated to *${status.toUpperCase()}*.\n\nNote: ${status === "rejected" ? (rejection_reason || "") : (note || `Order status updated to '${status}'`)}`;
        }

        if (whatsappMessage) {
          await sendWhatsApp({
            phone: recipientPhone,
            message: whatsappMessage,
          }).catch((err) => console.error("WhatsApp status notification failed:", err));
        }
      }
    }

    // 5. Send refund confirmation email if payment_status transitions to refunded
    const isNewRefund = payment_status === "refunded" && originalOrder && originalOrder.payment_status !== "refunded";
    if (isNewRefund && originalOrder) {
      const { error: eventError } = await supabase
        .from("order_events")
        .insert({
          order_id: id,
          status: originalOrder.status,
          note: `Refund processed: payment_status set to 'refunded'. Amount: ₹${((refund_amount_paise || originalOrder.total_paise) / 100).toFixed(0)}. Trans ID: ${refund_transaction_id || "N/A"}`
        });
      if (eventError) {
        console.error("Log refund event failed:", eventError);
      }

      const profile = originalOrder.profiles as any;
      if (profile?.email) {
        // Fetch screenshot image to attach as a file
        let attachments: any[] = [];
        if (refund_screenshot_url) {
          try {
            const imgRes = await fetch(refund_screenshot_url);
            if (imgRes.ok) {
              const buffer = await imgRes.arrayBuffer();
              const base64Content = Buffer.from(buffer).toString("base64");
              const extension = refund_screenshot_url.split(".").pop()?.split("?")[0] || "jpg";
              attachments.push({
                filename: `refund_proof_receipt.${extension}`,
                content: base64Content,
              });
            }
          } catch (fetchErr) {
            console.error("Failed to download refund screenshot for attachment:", fetchErr);
          }
        }

        await sendEmail({
          to: profile.email,
          subject: `Refund Processed — ${originalOrder.order_number} | JAI SRI RAM TEXTILES`,
          html: refundProcessedEmailHtml({
            orderNumber: originalOrder.order_number,
            name: profile.full_name,
            items: originalOrder.order_items || [],
            totalPaidPaise: originalOrder.total_paise,
            refundAmountPaise: refund_amount_paise || originalOrder.total_paise,
            transactionId: refund_transaction_id,
            note: refund_note,
            screenshotUrl: refund_screenshot_url,
          }),
          attachments: attachments.length > 0 ? attachments : undefined,
        }).catch((err) => console.error("Refund email failed:", err));
      }

      // Send WhatsApp Notification for refund
      const recipientPhone = (originalOrder.shipping_address as any)?.phone || (originalOrder.profiles as any)?.phone;
      if (recipientPhone) {
        const refundAmount = refund_amount_paise || originalOrder.total_paise || 0;
        const formattedRefund = (refundAmount / 100).toFixed(0);
        const txnIdMsg = refund_transaction_id ? `Transaction ID: ${refund_transaction_id}` : "N/A";
        const refundMessage = `Vanakkam! 🌸\n\nYour refund of ₹${formattedRefund} for order *${originalOrder.order_number}* has been processed.\n\n${txnIdMsg}\n\nIt will reflect in your account soon.`;

        await sendWhatsApp({
          phone: recipientPhone,
          message: refundMessage,
        }).catch((err) => console.error("WhatsApp refund notification failed:", err));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: permanently remove an order
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Cascade: remove any wallet transactions tied to this order (e.g. cashback credited
    // on delivery, or a redemption used to pay for it) and keep the stored wallet balance
    // consistent, rather than leaving orphaned ledger rows or a stale total.
    const { data: linkedTxns, error: txnFetchError } = await supabase
      .from("wallet_transactions")
      .select("id, user_id, amount_paise")
      .eq("order_id", id);

    if (txnFetchError) throw txnFetchError;

    if (linkedTxns && linkedTxns.length > 0) {
      const byUser = new Map<string, number>();
      for (const t of linkedTxns) {
        byUser.set(t.user_id, (byUser.get(t.user_id) || 0) + t.amount_paise);
      }

      const { error: txnDeleteError } = await supabase
        .from("wallet_transactions")
        .delete()
        .eq("order_id", id);
      if (txnDeleteError) throw txnDeleteError;

      for (const [userId, totalToReverse] of byUser.entries()) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance_paise")
          .eq("user_id", userId)
          .maybeSingle();

        if (wallet) {
          const nextBalance = Math.max(0, wallet.balance_paise - totalToReverse);
          await supabase
            .from("wallets")
            .update({ balance_paise: nextBalance, updated_at: new Date().toISOString() })
            .eq("user_id", userId);
        }
      }
    }

    // Cascade: remove any customer review linked to this order (review_photos cascade
    // automatically via their own FK) so the order delete doesn't get blocked by the
    // reviews.order_id foreign key.
    const { error: reviewDeleteError } = await supabase
      .from("reviews")
      .delete()
      .eq("order_id", id);
    if (reviewDeleteError) throw reviewDeleteError;

    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "Cannot delete: this order still has linked records that could not be removed automatically." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
