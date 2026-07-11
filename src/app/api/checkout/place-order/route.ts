import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, orderConfirmationEmailHtml, generateInvoicePdfBase64 } from "@/lib/email";

export async function POST(request: Request) {
  try {
    // 1. Verify user auth
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in to place an order" }, { status: 401 });
    }

    const { cart, shippingAddress, couponCode, useWallet, isRazorpay, razorpayPaymentId } = await request.json();

    if (!cart || cart.length === 0) {
      return NextResponse.json({ error: "Your shopping bag is empty" }, { status: 400 });
    }
    if (!shippingAddress || !shippingAddress.recipient || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
      return NextResponse.json({ error: "Please provide a complete shipping address" }, { status: 400 });
    }

    const supabase = createServiceClient(); // bypass RLS to perform orders writes & stock decs

    // 2. Batch-fetch every product/variant referenced in the cart in two round
    // trips total (instead of one round trip per item, twice over) — this was
    // the single biggest contributor to slow checkout on multi-item carts.
    const uniqueProductIds = [...new Set(cart.map((item: any) => item.id))];
    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, price_paise, compare_at_paise, cashback_paise, stock, is_active, pieces_per_pack, product_images(url, sort_order)")
      .in("id", uniqueProductIds);
    const productsMap = new Map((productsData || []).map((p: any) => [p.id, p]));

    const uniqueVariantIds = [...new Set(cart.filter((item: any) => item.variant).map((item: any) => item.variant.id))];
    let variantsMap = new Map<string, any>();
    if (uniqueVariantIds.length > 0) {
      const { data: variantsData } = await supabase
        .from("product_variants")
        .select("id, size, color, sku, stock")
        .in("id", uniqueVariantIds);
      variantsMap = new Map((variantsData || []).map((v: any) => [v.id, v]));
    }

    // 2a. Pre-calculate regular subtotal (excluding free gifts) for threshold validations
    let regularSubtotalPaise = 0;
    for (const item of cart) {
      if (!item.isFreeGift) {
        const dbProduct = productsMap.get(item.id);
        if (dbProduct) {
          regularSubtotalPaise += dbProduct.price_paise * item.quantity;
        }
      }
    }

    // 2b. Validate prices, stock, and cashback values using the batched data above
    let subtotalPaise = 0;
    let totalCashbackEarned = 0;
    const validatedItems: any[] = [];
    const stockUpdates: any[] = []; // to run after validation succeeds

    for (const item of cart) {
      const dbProduct = productsMap.get(item.id);

      if (!dbProduct || !dbProduct.is_active) {
        return NextResponse.json({ error: `Product '${item.name}' is no longer available` }, { status: 400 });
      }

      let matchedVar: any = null;

      // Validate Variant if selected
      if (item.variant) {
        let dbVariant = variantsMap.get(item.variant.id);

        // Fallback: If variant ID is not found (e.g. regenerated during admin edit), auto-heal matching by size/color/sku
        if (!dbVariant) {
          const { data: dbVars } = await supabase
            .from("product_variants")
            .select("id, size, color, sku, stock")
            .eq("product_id", item.id);
          
          if (dbVars && dbVars.length > 0) {
            dbVariant = dbVars.find((v: any) => v.sku === item.variant.sku);
            if (!dbVariant) {
              dbVariant = dbVars.find((v: any) => 
                String(v.size || "").toLowerCase() === String(item.variant.size || "").toLowerCase() &&
                String(v.color || "").toLowerCase() === String(item.variant.color || "").toLowerCase()
              );
            }
            if (!dbVariant) {
              dbVariant = dbVars[0];
            }
          }
        }

        if (!dbVariant) {
          return NextResponse.json({ error: `Variant for '${item.name}' is not valid` }, { status: 400 });
        }
        if (dbVariant.stock < item.quantity) {
          return NextResponse.json({ error: `Insufficient stock for variant '${dbVariant.size || ""}-${dbVariant.color || ""}' of '${item.name}'` }, { status: 400 });
        }
        matchedVar = dbVariant;
      } else {
        if (dbProduct.stock < item.quantity) {
          return NextResponse.json({ error: `Insufficient stock for product '${dbProduct.name}'` }, { status: 400 });
        }
      }

      let itemPrice = dbProduct.price_paise;
      let itemCashback = dbProduct.cashback_paise;

      // Server-side validation for Free Gift campaign items
      if (item.isFreeGift) {
        if (!item.campaignId) {
          return NextResponse.json({ error: "Invalid free gift campaign context" }, { status: 400 });
        }

        const { data: campaign, error: campErr } = await supabase
          .from("free_product_campaigns")
          .select("*")
          .eq("id", item.campaignId)
          .single();

        if (campErr || !campaign || !campaign.is_active) {
          return NextResponse.json({ error: "The free gift campaign is no longer active" }, { status: 400 });
        }

        // Validate timing
        const nowTime = new Date();
        if (campaign.starts_at && nowTime < new Date(campaign.starts_at)) {
          return NextResponse.json({ error: "The free gift campaign has not started yet" }, { status: 400 });
        }
        if (campaign.expires_at && nowTime > new Date(campaign.expires_at)) {
          return NextResponse.json({ error: "The free gift campaign has expired" }, { status: 400 });
        }

        // Validate qualifying subtotal threshold
        if (regularSubtotalPaise < campaign.target_amount_paise) {
          return NextResponse.json({ error: "Your order value does not qualify for this free gift" }, { status: 400 });
        }

        // Validate product ID matching
        if (campaign.product_id !== item.id) {
          return NextResponse.json({ error: "Free gift product does not match campaign" }, { status: 400 });
        }

        // Validate variant ID matching if a specific variant is tied to the campaign
        if (campaign.variant_id && (!item.variant || campaign.variant_id !== item.variant.id)) {
          return NextResponse.json({ error: "Free gift variant does not match campaign" }, { status: 400 });
        }

        // Validate that this campaign has not already been used by this user (once-per-user constraint)
        const { data: pastUsage, error: usageErr } = await supabase
          .from("order_items")
          .select("product_id, size, color, unit_price_paise, orders!inner(status, user_id)")
          .eq("orders.user_id", user.id)
          .neq("orders.status", "rejected");

        if (usageErr) throw usageErr;

        const hasClaimed = (pastUsage || []).some((pastItem: any) => {
          // Check if product matches and unit price was 0 (free gift)
          if (pastItem.unit_price_paise === 0 && pastItem.product_id === campaign.product_id) {
            if (!campaign.variant) return true;
            if (pastItem.size === campaign.variant.size && pastItem.color === campaign.variant.color) return true;
          }
          return false;
        });

        if (hasClaimed) {
          return NextResponse.json({
            error: `You have already claimed this free gift reward (${campaign.display_name || dbProduct.name}) in a past order.`
          }, { status: 400 });
        }

        // Override price and cashback rewards to 0 for free gifts
        itemPrice = 0;
        itemCashback = 0;
      }

      const itemSubtotal = itemPrice * item.quantity;
      subtotalPaise += itemSubtotal;
      totalCashbackEarned += (itemCashback * item.quantity);

      const primaryImage = (dbProduct.product_images || [])
        .slice()
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))[0];

      validatedItems.push({
        product_id: dbProduct.id,
        name: dbProduct.name +
              (dbProduct.pieces_per_pack && dbProduct.pieces_per_pack > 1 ? ` (${dbProduct.pieces_per_pack} piece in 1 Pack)` : "") +
              (item.isFreeGift ? " (Free Gift)" : ""),
        variant: matchedVar ? `${matchedVar.size || ""} ${matchedVar.color || ""}`.trim() : null,
        sku: matchedVar?.sku || null,
        size: matchedVar?.size || null,
        color: matchedVar?.color || null,
        image_url: primaryImage?.url || null,
        unit_price_paise: itemPrice,
        quantity: item.quantity,
        cashback_paise: itemCashback,
      });

      stockUpdates.push({
        productId: dbProduct.id,
        variantId: matchedVar?.id || null,
        qty: item.quantity,
        prodStock: dbProduct.stock,
        varStock: matchedVar ? matchedVar.stock : null,
      });
    }

    // 3. Process Coupon Code
    let couponId: string | null = null;
    let discountPaise = 0;
    if (couponCode) {
      const { data: coupon, error: couponErr } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (couponErr || !coupon) {
        return NextResponse.json({ error: "Invalid or inactive coupon code" }, { status: 400 });
      }

      // Check dates
      const now = new Date();
      if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        return NextResponse.json({ error: "Coupon campaign has not started yet" }, { status: 400 });
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        return NextResponse.json({ error: "Coupon code has expired" }, { status: 400 });
      }

      // Check min order
      if (subtotalPaise < coupon.min_order_paise) {
        return NextResponse.json({ error: `Min order requirement for this coupon is ${formatINR(coupon.min_order_paise, true)}` }, { status: 400 });
      }

      // Check usage limits
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
      }

      // Check first order constraint
      if (coupon.first_order_only) {
        const { count: pastOrders, error: orderCountErr } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (orderCountErr) throw orderCountErr;
        if (pastOrders && pastOrders > 0) {
          return NextResponse.json({ error: "This code is only applicable for new users" }, { status: 400 });
        }
      }

      couponId = coupon.id;
      // Calculate discount amount
      if (coupon.type === "flat") {
        discountPaise = Math.min(coupon.value, subtotalPaise);
      } else {
        // Round to the nearest whole rupee so every on-site transaction is a whole number
        let calculated = Math.round((subtotalPaise * coupon.value) / 100 / 100) * 100;
        if (coupon.max_discount_paise) {
          calculated = Math.min(calculated, coupon.max_discount_paise);
        }
        discountPaise = Math.min(calculated, subtotalPaise);
      }
    }

    // 4. Process Wallet Credit Redemptions
    let walletUsedPaise = 0;
    let activeBalance = 0;
    if (useWallet) {
      const { data: txns } = await supabase
        .from("wallet_transactions")
        .select("amount_paise, type, expires_at")
        .eq("user_id", user.id);

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

      if (activeBalance > 0) {
        // Enforce 20% cap rule: wallet_used_paise <= (subtotal_paise / 5), rounded
        // down to the nearest whole rupee so every on-site transaction is a whole number.
        const walletCap = Math.floor(subtotalPaise / 5 / 100) * 100;
        const maxRedeemable = Math.min(activeBalance, walletCap);
        // Ensure wallet deduction doesn't exceed order value remaining after coupon
        walletUsedPaise = Math.min(maxRedeemable, subtotalPaise - discountPaise);
      }
    }

    // 5. Load shipping settings from app_settings (admin-configurable)
    let freeShippingThresholdPaise = 69900; // default ₹699
    let standardShippingPaise = 9900;       // default ₹99
    try {
      const { data: shippingSettings } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "shipping_settings")
        .maybeSingle();
      if (shippingSettings?.value) {
        freeShippingThresholdPaise = shippingSettings.value.free_shipping_threshold_paise ?? freeShippingThresholdPaise;
        standardShippingPaise = shippingSettings.value.shipping_charge_paise ?? standardShippingPaise;
      }
    } catch (err) {
      console.error("Could not load shipping settings, using defaults:", err);
    }

    // 6. Calculate Shipping Fee
    const qualifiesFree = subtotalPaise >= freeShippingThresholdPaise;
    const shippingPaise = qualifiesFree ? 0 : standardShippingPaise;

    // 6. Calculate grand total
    const totalPaise = subtotalPaise - discountPaise - walletUsedPaise + shippingPaise;

    // Verify the payment with Razorpay if key/secret are set in the environment (Production Mode)
    if (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      if (!isRazorpay || !razorpayPaymentId) {
        return NextResponse.json({ error: "Razorpay payment details are required to complete this order" }, { status: 400 });
      }

      try {
        const Razorpay = (await import("razorpay")).default;
        const rzp = new Razorpay({
          key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const payment = await rzp.payments.fetch(razorpayPaymentId);
        if (!payment) {
          return NextResponse.json({ error: "Payment transaction not found in gateway." }, { status: 400 });
        }

        // Verify amount paid matches the server calculated total
        if (Number(payment.amount) !== totalPaise) {
          return NextResponse.json({
            error: `Payment amount mismatch. Order total: ${totalPaise} paise, Paid amount: ${payment.amount} paise.`
          }, { status: 400 });
        }

        // Verify payment is successful (captured or authorized)
        if (payment.status !== "captured" && payment.status !== "authorized") {
          return NextResponse.json({ error: `Payment is incomplete (Status: ${payment.status})` }, { status: 400 });
        }
      } catch (err: any) {
        console.error("Razorpay verification failed:", err);
        return NextResponse.json({ error: "Payment verification failed: " + (err.message || err) }, { status: 400 });
      }
    }

    // 7. Generate order number e.g. JSRT-2026-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `JSRT-2026-${randomDigits}`;

    // 8. Place order (Atomic operations)
    // 8a. Insert the main order record
    const mockPaymentId = razorpayPaymentId || `pay_mock_${Math.random().toString(36).slice(2, 11)}`;

    // Calculate default delivery date (current date + 4 days)
    const defaultDeliveryDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    const { data: newOrder, error: orderInsertError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: user.id,
        status: "pending",
        payment_status: "paid", // Completed transaction
        subtotal_paise: subtotalPaise,
        discount_paise: discountPaise,
        shipping_paise: shippingPaise,
        wallet_used_paise: walletUsedPaise,
        tax_paise: 0,
        total_paise: totalPaise,
        cashback_earned_paise: totalCashbackEarned,
        coupon_id: couponId,
        shipping_address: {
          ...shippingAddress,
          delivery_date: defaultDeliveryDate
        },
        razorpay_order_id: isRazorpay ? `order_rzp_${randomDigits}` : null,
        razorpay_payment_id: mockPaymentId,
        placed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (orderInsertError || !newOrder) {
      throw orderInsertError || new Error("Failed to write order record");
    }

    const orderId = newOrder.id;

    // 8b. Insert order items
    const itemRows = validatedItems.map(item => ({
      order_id: orderId,
      ...item,
    }));
    let { error: itemsInsertErr } = await supabase.from("order_items").insert(itemRows);
    if (itemsInsertErr?.message?.match(/column .* does not exist|Could not find the .* column/i)) {
      // sku/size/color/image_url snapshot columns haven't been migrated on this database
      // yet — retry with only the guaranteed base columns so checkout still succeeds.
      const itemRowsBase = validatedItems.map(({ sku, size, color, image_url, ...item }) => ({ order_id: orderId, ...item }));
      ({ error: itemsInsertErr } = await supabase.from("order_items").insert(itemRowsBase));
    }
    if (itemsInsertErr) throw itemsInsertErr;

    // 8c. Insert order placement tracking event, decrement stock, bump coupon usage, and
    // deduct wallet balance concurrently — these are all independent writes with no
    // interdependency, so running them in parallel instead of one-by-one cuts this whole
    // block down to the latency of the single slowest write instead of the sum of all of them.
    const postInsertWrites: any[] = [
      supabase.from("order_events").insert({
        order_id: orderId,
        status: "pending",
        note: "Order placed successfully (prepaid checkout completed)",
      }),
    ];

    for (const update of stockUpdates) {
      postInsertWrites.push(
        supabase.from("products").update({ stock: Math.max(0, update.prodStock - update.qty) }).eq("id", update.productId)
      );
      if (update.variantId) {
        postInsertWrites.push(
          supabase.from("product_variants").update({ stock: Math.max(0, update.varStock - update.qty) }).eq("id", update.variantId)
        );
      }
    }

    if (couponId) {
      const { data: currentCoupon } = await supabase.from("coupons").select("used_count").eq("id", couponId).single();
      const nextUsed = (currentCoupon?.used_count || 0) + 1;
      postInsertWrites.push(supabase.from("coupons").update({ used_count: nextUsed }).eq("id", couponId));
    }

    if (walletUsedPaise > 0) {
      const finalBal = Math.max(0, activeBalance - walletUsedPaise);
      postInsertWrites.push(
        supabase.from("wallet_transactions").insert({
          user_id: user.id,
          type: "redeem",
          amount_paise: -walletUsedPaise,
          order_id: orderId,
          note: `Redeemed for order ${orderNumber}`,
        }),
        supabase
          .from("wallets")
          .update({ balance_paise: finalBal, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
      );
    }

    const writeResults = await Promise.all(postInsertWrites);
    const failedWrite = writeResults.find((r: any) => r?.error);
    if (failedWrite?.error) throw failedWrite.error;

    // Fetch user profile to get the 8-digit user_id, email, and name
    let dbUserId: string | number | undefined = undefined;
    let dbUserEmail: string | undefined = undefined;
    let dbFullName: string | undefined = undefined;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("id", user.id)
        .single();
      if (profile) {
        dbUserId = profile.user_id;
        dbUserEmail = profile.email;
        dbFullName = profile.full_name;
      }
    } catch (err) {
      console.error("Failed to fetch user profile for invoice:", err);
    }

    const recipientEmail = dbUserEmail || user.email;
    const recipientName = dbFullName || user.user_metadata?.full_name || user.user_metadata?.name;

    // 9 & 10. Order confirmation email (with invoice PDF) and WhatsApp notification are
    // both slow (PDF rendering + external API round trips) and don't affect what the
    // customer sees next, so they're deferred via after() to run once the response has
    // already been sent — this is what makes "Place Order" feel instant instead of
    // making the customer wait through PDF generation + email + WhatsApp before the
    // success animation can even start.
    after(async () => {
      if (recipientEmail) {
        let pdfBase64 = "";
        try {
          pdfBase64 = generateInvoicePdfBase64({
            orderNumber,
            name: recipientName,
            items: validatedItems,
            shippingAddress,
            subtotalPaise,
            discountPaise,
            shippingPaise,
            walletUsedPaise,
            totalPaise,
            cashbackEarnedPaise: totalCashbackEarned,
            userId: dbUserId,
          });
        } catch (pdfErr) {
          console.error("PDF generation failed:", pdfErr);
        }

        await sendEmail({
          to: recipientEmail,
          subject: `Order Confirmed — ${orderNumber} | JAI SRI RAM TEXTILES`,
          html: orderConfirmationEmailHtml({
            orderNumber,
            name: recipientName,
            items: validatedItems,
            shippingAddress,
            subtotalPaise,
            discountPaise,
            shippingPaise,
            walletUsedPaise,
            totalPaise,
            cashbackEarnedPaise: totalCashbackEarned,
            userId: dbUserId,
          }),
          ...(pdfBase64 ? {
            attachments: [
              {
                filename: `invoice_${orderNumber}.pdf`,
                content: pdfBase64,
              }
            ]
          } : {})
        }).catch((err) => console.error("Order confirmation email failed:", err));
      }
    });

    return NextResponse.json({ success: true, orderId, orderNumber, cashbackEarnedPaise: totalCashbackEarned });
  } catch (error: any) {
    console.error("Place Order Server Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process checkout" }, { status: 500 });
  }
}

function formatINR(paise: number, symbol = false) {
  const rs = paise / 100;
  return symbol ? `₹${rs}` : `Rs. ${rs}`;
}
