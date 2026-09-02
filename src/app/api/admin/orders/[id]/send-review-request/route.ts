import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendMarketingEmail } from "@/lib/marketing/email-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const supabase = createServiceClient();

    // 1. Fetch order details with order_items, products, and customer profiles
    let order: any = null;

    try {
      const { data: dbOrder, error: orderErr } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          placed_at,
          total_paise,
          customer_email,
          email,
          shipping_address,
          user_id,
          review_requested_at,
          order_items (
            id,
            product_id,
            name,
            quantity,
            variant,
            size,
            color,
            unit_price_paise,
            image_url
          ),
          profiles (
            id,
            email,
            full_name,
            phone
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (dbOrder) order = dbOrder;
    } catch (err) {
      console.warn("DB query for order review request error:", err);
    }

    // If order not found in DB table, check payload fallback
    if (!order && body.order) {
      order = body.order;
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If order_items is empty, fetch explicitly from order_items table
    if (!order.order_items || order.order_items.length === 0) {
      try {
        const { data: dbItems } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", id);
        if (dbItems && dbItems.length > 0) {
          order.order_items = dbItems;
        }
      } catch (e) {
        console.warn("Error fetching direct order_items:", e);
      }
    }

    // 2. Enforce strict condition: Order MUST be delivered
    const currentStatus = (order.status || "").toLowerCase().trim();
    if (currentStatus !== "delivered") {
      return NextResponse.json(
        {
          error: `Review request can only be sent for delivered orders. Current status is "${order.status}".`,
        },
        { status: 400 }
      );
    }

    // 3. Resolve customer email
    const recipientEmail = (
      body.sendToEmail ||
      order.profiles?.email ||
      order.shipping_address?.email ||
      order.customer_email ||
      order.email ||
      body.email ||
      ""
    ).trim();

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        {
          error: "No valid customer email address found for this order.",
        },
        { status: 400 }
      );
    }

    // 4. Resolve customer name
    const recipientName =
      order.shipping_address?.full_name ||
      order.shipping_address?.recipient_name ||
      order.shipping_address?.recipient ||
      order.profiles?.full_name ||
      body.recipientName ||
      "Valued Customer";

    const firstName = recipientName.split(" ")[0] || "Customer";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jaisriramtextiles.in";
    const orderNumber = order.order_number || `JSRT-${id.slice(0, 6)}`;
    const items = order.order_items || [];

    // Fetch product details (slug, images) for all product IDs
    const productIds = items
      .map((it: any) => it.product_id)
      .filter((pid: any) => Boolean(pid));

    const productsMap: Record<string, any> = {};
    if (productIds.length > 0) {
      try {
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, slug, image_url, images")
          .in("id", productIds);
        if (prods) {
          prods.forEach((p: any) => {
            productsMap[p.id] = p;
          });
        }
      } catch (err) {
        console.warn("Error fetching products map:", err);
      }
    }

    // 5. Build items HTML for review
    const itemsHtml = items
      .map((item: any) => {
        const product = productsMap[item.product_id] || item.products || item.product || {};
        const slug = product.slug || (item.name ? item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "");
        const reviewUrl = slug
          ? `${siteUrl}/product/${slug}#reviews`
          : `${siteUrl}/account?tab=orders`;

        const rawImg =
          item.image_url ||
          item.image ||
          product.image_url ||
          (Array.isArray(product.images) && product.images[0]) ||
          "";

        const imageUrl = rawImg.startsWith("http")
          ? rawImg
          : rawImg.startsWith("/")
          ? `${siteUrl}${rawImg}`
          : rawImg
          ? `${siteUrl}/${rawImg}`
          : "https://jaisriramtextiles.in/logo.png";

        const variantInfo = [item.size ? `Size: ${item.size}` : "", item.color ? `Color: ${item.color}` : ""]
          .filter(Boolean)
          .join(" | ");

        return `
          <tr style="border-bottom: 1px solid #ECE6D8;">
            <td style="padding: 16px 8px; width: 70px; vertical-align: middle;">
              <img src="${imageUrl}" alt="${item.name || "Product"}" width="64" height="64" style="width: 64px; height: 64px; min-width: 64px; min-height: 64px; max-width: 64px; max-height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #E8DFD0; display: block;" />
            </td>
            <td style="padding: 16px 12px; vertical-align: middle;">
              <div style="font-family: 'Fraunces', Georgia, serif; font-size: 15px; font-weight: 700; color: #1F1C18; line-height: 1.3;">
                ${item.name}
              </div>
              ${
                variantInfo
                  ? `<div style="font-size: 12px; color: #8C827A; margin-top: 3px;">${variantInfo}</div>`
                  : ""
              }
              <div style="margin-top: 6px;">
                <span style="color: #D4AF37; font-size: 16px; letter-spacing: 2px;">★★★★★</span>
              </div>
            </td>
            <td style="padding: 16px 8px; text-align: right; vertical-align: middle;">
              <a href="${reviewUrl}" style="display: inline-block; background-color: #B8860B; color: #FFFFFF; font-size: 12px; font-weight: 700; text-decoration: none; padding: 8px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(184, 134, 11, 0.2);">
                Rate Now ★
              </a>
            </td>
          </tr>
        `;
      })
      .join("");

    const firstProduct = productsMap[items[0]?.product_id] || items[0]?.products || items[0]?.product;
    const primaryProductSlug = firstProduct?.slug || (items[0]?.name ? items[0].name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "");
    const primaryReviewUrl = primaryProductSlug
      ? `${siteUrl}/product/${primaryProductSlug}#reviews`
      : `${siteUrl}/account?tab=orders`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rate your recent purchase — Jai Sri Ram Textiles</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F1C18; line-height: 1.6;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #FFFFFF; border: 1px solid #ECE6D8; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.04);">
    
    <!-- Header Banner -->
    <div style="background-color: #1F1C18; padding: 28px 24px; text-align: center; border-bottom: 3px solid #D4AF37;">
      <div style="font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 800; color: #FAF8F5; letter-spacing: 1px; text-transform: uppercase;">
        JAI SRI RAM TEXTILES
      </div>
      <div style="font-size: 10px; color: #D4AF37; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px;">
        Traditional Handloom & Heritage Dhotis
      </div>
    </div>

    <!-- Main Body Content -->
    <div style="padding: 32px 28px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background-color: #FAF6EC; border: 1px solid #E9DBB7; color: #8C6D2D; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; letter-spacing: 1px;">
          Order #${orderNumber} Delivered
        </span>
        <h1 style="font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 700; color: #1F1C18; margin: 16px 0 8px;">
          How was your experience, ${firstName}?
        </h1>
        <p style="font-size: 14px; color: #6E655A; margin: 0; line-height: 1.5;">
          We hope you are loving your new authentic handloom pieces! Your feedback helps us continually perfect our weaving craftsmanship.
        </p>
      </div>

      <!-- Star Rating Prompt Box -->
      <div style="background-color: #FAF8F5; border: 1px solid #E8DFD0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px;">
        <div style="font-size: 13px; font-weight: 700; color: #1F1C18; margin-bottom: 6px;">
          Tap to rate your overall satisfaction:
        </div>
        <div style="font-size: 28px; color: #D4AF37; letter-spacing: 6px;">
          <a href="${primaryReviewUrl}" style="text-decoration: none; color: #D4AF37;">★ ★ ★ ★ ★</a>
        </div>
        <div style="font-size: 11px; color: #8C827A; margin-top: 6px;">
          (Click any star to leave your review)
        </div>
      </div>

      <!-- Items Section -->
      <div style="margin-bottom: 28px;">
        <div style="font-size: 12px; font-weight: 800; color: #1F1C18; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 2px solid #D4AF37; padding-bottom: 6px;">
          Delivered Products
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Central CTA Button -->
      <div style="text-align: center; margin: 32px 0 16px;">
        <a href="${primaryReviewUrl}" style="display: inline-block; background-color: #1F1C18; color: #FAF8F5; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(31, 28, 24, 0.2);">
          Write A Review &amp; Upload Photos →
        </a>
      </div>
      <p style="text-align: center; font-size: 11px; color: #8C827A; margin: 8px 0 0;">
        It only takes 30 seconds and helps fellow customers choose with confidence.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #FAF8F5; border-top: 1px solid #ECE6D8; padding: 24px; text-align: center; font-size: 11px; color: #8C827A; line-height: 1.6;">
      <p style="margin: 0 0 4px; font-weight: 600; color: #1F1C18;">
        Jai Sri Ram Textiles — Authentic Handloom Since 2008
      </p>
      <p style="margin: 0 0 8px;">
        Palani, Dindigul, Tamil Nadu | +91 93457 41669 | contact@jaisriramtextiles.in
      </p>
      <p style="margin: 0;">
        <a href="${siteUrl}" style="color: #B8860B; text-decoration: none; font-weight: 600;">Visit Store</a> &bull;
        <a href="${siteUrl}/policies/privacy" style="color: #8C827A; text-decoration: none;">Privacy Policy</a> &bull;
        <a href="${siteUrl}/contact" style="color: #8C827A; text-decoration: none;">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // 6. Send the review request email via Resend
    const sendResult = await sendMarketingEmail({
      to: recipientEmail,
      subject: `⭐ How was your order #${orderNumber}? Rate your purchase with Jai Sri Ram Textiles`,
      html,
      fromName: "Jai Sri Ram Textiles",
      tags: [
        { name: "type", value: "product_review_request" },
        { name: "order_id", value: id },
        { name: "order_number", value: orderNumber },
      ],
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || "Failed to send review request email." },
        { status: 500 }
      );
    }

    // 7. Update review_requested_at in orders table if column exists
    const nowIso = new Date().toISOString();
    try {
      await supabase
        .from("orders")
        .update({
          review_requested_at: nowIso,
        })
        .eq("id", id);
    } catch {}

    // Store in app_settings review_requests log as fallback
    try {
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "order_review_requests")
        .maybeSingle();

      const reviewLogs = settingsData?.value || {};
      reviewLogs[id] = {
        order_id: id,
        order_number: orderNumber,
        email: recipientEmail,
        sent_at: nowIso,
      };

      await supabase.from("app_settings").upsert({
        key: "order_review_requests",
        value: reviewLogs,
        updated_at: nowIso,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Review request email sent to ${recipientEmail}!`,
      recipientEmail,
      sent_at: nowIso,
    });
  } catch (err: any) {
    console.error("Send review request API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
