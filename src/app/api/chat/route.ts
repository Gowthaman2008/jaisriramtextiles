import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

const BASE_SYSTEM_PROMPT = `You are the official, highly intelligent and friendly AI Loom Assistant for **JAI SRI RAM TEXTILES**, a renowned heritage handloom weaving brand in Komarapalayam, Tamil Nadu, India.

### ⚡ Critical Response Guidelines:
- **Be Concise & Direct**: Keep answers short, punchy, and clear (2–4 lines or 2–3 brief bullet points maximum). Do NOT write huge paragraphs or repeat the whole catalog brochure unless specifically asked.
- **Answer the Exact Question**: Answer the user's specific query immediately with relevant store links.
- **Gift Cards & Rewards**: Customers earn a **₹100 Gift Card** for 5-star reviews on Amazon/Flipkart/Google at [/claim-giftcard](/claim-giftcard). Verified codes are in **Gift Card History** and can be redeemed to wallet with 1-click. Valid for 365 days.
- **Missing Gift Card**: If a customer reports a missing giftcard or pending review, explain that reviews are verified within 24 hours and all codes appear under Gift Card History at [/claim-giftcard](/claim-giftcard) or they can raise a ticket at [/account?tab=support](/account?tab=support).
- **Cashback & Wallet**: Auto-credited on delivered orders. Redeemable at checkout (up to 20% of cart subtotal, max ₹50/order) at [/account?tab=wallet](/account?tab=wallet).
- **Orders & Tracking**: Track orders under [/account?tab=orders](/account?tab=orders).
- **Shipping**: Free shipping above ₹699 (flat ₹99 below). Delivery across India in 4–7 business days.
- **Returns / Replacement**: 7-day easy replacement for damaged/defective items at [/account?tab=support](/account?tab=support).
- **Bulk & Custom**: Direct loom wholesale pricing at [/bulk-orders](/bulk-orders).
- **Support**: Priority help at [/account?tab=support](/account?tab=support) or email \`jaisriramtextilekpm@gmail.com\` (Mon–Sat 9 AM – 6 PM IST).
- **Formatting**: Use clean markdown with bold keywords and clickable markdown links. Keep replies neat and easy to read on mobile screens.`;

export async function POST(request: Request) {
  let matchedProducts: any[] = [];
  try {
    const clientIp = getClientIp(request);
    const limit = checkRateLimit(clientIp, { prefix: "ai_chat", maxRequests: 25, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many AI assistant messages. Please wait a moment before sending more." },
        { status: 429 }
      );
    }

    const { messages, userContext } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages history payload" }, { status: 400 });
    }

    // Retrieve Groq API Key from environment or database settings
    let apiKey = process.env.GROQ_API_KEY;

    let dbProducts: any[] = [];
    let dbCategories: any[] = [];
    let dbCoupons: any[] = [];
    let freeThreshold = 699;
    let shippingCharge = 99;

    try {
      const supabase = await createClient();
      const [
        productsRes,
        categoriesRes,
        couponsRes,
        settingsRes,
        groqKeyRes
      ] = await Promise.all([
        supabase.from("products").select("id, name, slug, price_paise, compare_at_paise, stock, description, categories(slug, name), product_images(url, sort_order)").eq("is_active", true),
        supabase.from("categories").select("id, name, slug, tagline").eq("is_active", true),
        supabase.from("coupons").select("code, type, value, min_order_paise").eq("is_active", true),
        supabase.from("app_settings").select("value").eq("key", "shipping_settings").maybeSingle(),
        !apiKey ? supabase.from("app_settings").select("value").eq("key", "groq_api_key").maybeSingle() : Promise.resolve(null)
      ]);

      dbProducts = productsRes.data || [];
      dbCategories = categoriesRes.data || [];
      dbCoupons = couponsRes.data || [];

      if (!apiKey && groqKeyRes?.data?.value) {
        const val = groqKeyRes.data.value;
        apiKey = typeof val === "string" ? val : val.apiKey || val.key || val.api_key;
      }

      if (settingsRes?.data?.value) {
        const val = settingsRes.data.value;
        if (typeof val.free_shipping_threshold_paise === "number") {
          freeThreshold = val.free_shipping_threshold_paise / 100;
        }
        if (typeof val.shipping_charge_paise === "number") {
          shippingCharge = val.shipping_charge_paise / 100;
        }
      }
    } catch (dbErr) {
      console.error("Chatbot failed to query database catalogs:", dbErr);
    }

    const recentMessages = (messages || []).slice(-8);
    const lastUserMsg = (recentMessages[recentMessages.length - 1]?.content || "").toLowerCase().trim();

    // Check if the user's message is ONLY a compliment / feedback
    const isPureCompliment = /^(all\s+)?(photos?|pics?|pictures?|images?|these|those)?\s*(are\s+|look\s+)?(very\s+|so\s+)?(good|nice|great|awesome|beautiful|super|perfect|fine|ok|okay|thank you|thanks)\b/i.test(lastUserMsg);

    // Check if user is asking for photos or exploring products/categories
    const isPhotoOrProductIntent = !isPureCompliment && (
      lastUserMsg.includes("photo") ||
      lastUserMsg.includes("pic") ||
      lastUserMsg.includes("image") ||
      lastUserMsg.includes("picture") ||
      lastUserMsg.includes("show") ||
      lastUserMsg.includes("send") ||
      lastUserMsg.includes("see") ||
      lastUserMsg.includes("look") ||
      lastUserMsg.includes("sample") ||
      lastUserMsg.includes("catalog") ||
      lastUserMsg.includes("explore") ||
      lastUserMsg.includes("collection") ||
      lastUserMsg.includes("dhoti") ||
      lastUserMsg.includes("veshti") ||
      lastUserMsg.includes("vesthi") ||
      lastUserMsg.includes("vetti") ||
      lastUserMsg.includes("towel") ||
      lastUserMsg.includes("thundu") ||
      lastUserMsg.includes("angavastram") ||
      lastUserMsg.includes("jute") ||
      lastUserMsg.includes("bag") ||
      lastUserMsg.includes("scarf")
    );

    matchedProducts = [];

    if (isPhotoOrProductIntent && dbProducts.length > 0) {
      let filtered = dbProducts.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const catName = (p.categories?.name || "").toLowerCase();
        const catSlug = (p.categories?.slug || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const fullText = `${name} ${catName} ${catSlug} ${desc}`;

        if (lastUserMsg.includes("white dhoti") || lastUserMsg.includes("white veshti") || lastUserMsg.includes("white vesthi")) {
          return fullText.includes("white") && (fullText.includes("dhoti") || fullText.includes("veshti") || fullText.includes("vesthi"));
        }
        if (lastUserMsg.includes("colour dhoti") || lastUserMsg.includes("color dhoti") || lastUserMsg.includes("colour veshti") || lastUserMsg.includes("color veshti")) {
          return fullText.includes("colour") || fullText.includes("color") || fullText.includes("balaji");
        }
        if (lastUserMsg.includes("dhoti") || lastUserMsg.includes("veshti") || lastUserMsg.includes("vesthi") || lastUserMsg.includes("vetti")) {
          return fullText.includes("dhoti") || fullText.includes("veshti") || fullText.includes("vesthi") || catSlug.includes("dhoti");
        }
        if (lastUserMsg.includes("towel") || lastUserMsg.includes("thundu")) {
          return fullText.includes("towel") || catSlug.includes("towel");
        }
        if (lastUserMsg.includes("angavastram") || lastUserMsg.includes("shawl")) {
          return fullText.includes("angavastram") || catSlug.includes("angavastram");
        }
        if (lastUserMsg.includes("bag") || lastUserMsg.includes("jute") || lastUserMsg.includes("canvas") || lastUserMsg.includes("tote")) {
          return fullText.includes("bag") || fullText.includes("jute") || catSlug.includes("bag") || catSlug.includes("jute");
        }
        if (lastUserMsg.includes("scarf") || lastUserMsg.includes("scarves")) {
          return fullText.includes("scarf") || catSlug.includes("scarf");
        }
        return false;
      });

      if (filtered.length === 0) {
        const seenCats = new Set();
        const diverse: any[] = [];
        for (const p of dbProducts) {
          const cat = p.categories?.slug || "general";
          if (!seenCats.has(cat)) {
            seenCats.add(cat);
            diverse.push(p);
          }
          if (diverse.length >= 4) break;
        }
        filtered = diverse.length > 0 ? diverse : dbProducts;
      }

      matchedProducts = filtered.slice(0, 4).map((p) => {
        const images = [...(p.product_images || [])].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        const imageUrl = images[0]?.url || "https://res.cloudinary.com/vgwavi5t/image/upload/v1783939101/jai-sri-ram-textiles/brand/logo-ram.jpg";
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          price: p.price_paise / 100,
          imageUrl,
        };
      });
    }

    const productsList = dbProducts.map(p => `- ${p.name} (₹${p.price_paise / 100}, Stock: ${p.stock})`).join("\n") || "None available";
    const categoriesList = dbCategories.map(c => `- ${c.name} (${c.slug})`).join("\n") || "Dhotis, Towels, Scarfs, Jute Bags";
    const couponsList = dbCoupons.map(cp => `- ${cp.code}: ${cp.type === "percent" ? `${cp.value}%` : `₹${cp.value / 100}`} off`).join("\n") || "- WELCOME10: 10% off on first order";

    let dynamicPrompt = BASE_SYSTEM_PROMPT.replace(
      "orders above ₹699 (flat ₹99 below)",
      `orders above ₹${freeThreshold} (flat ₹${shippingCharge} below)`
    );

    dynamicPrompt += `\n\n### 📦 Store Context:
- **Categories**: ${categoriesList}
- **Products**: ${productsList.slice(0, 800)}
- **Coupons**: ${couponsList}
`;

    if (userContext) {
      const { profile, orders, addresses, walletBalance } = userContext;

      const simplifiedOrders = (orders || []).slice(0, 3).map((o: any) => ({
        order_number: o.order_number,
        status: o.status,
        total: o.total_amount_paise ? `₹${o.total_amount_paise / 100}` : "",
        items: (o.order_items || []).map((oi: any) => `${oi.product_name} x ${oi.quantity}`).join(", "),
        placed_at: o.placed_at ? new Date(o.placed_at).toLocaleDateString("en-IN") : ""
      }));

      const simplifiedAddresses = (addresses || []).slice(0, 2).map((a: any) => `${a.recipient}, ${a.line1}, ${a.city} - ${a.pincode}`);

      dynamicPrompt += `\n\n### 👤 User Live Context:
- **Customer**: ${profile?.full_name || "Valued Customer"} (${profile?.email || "Signed In"})
- **Wallet Balance**: ₹${((walletBalance || 0) / 100).toFixed(0)}
- **Addresses**: ${JSON.stringify(simplifiedAddresses)}
- **Recent Orders**: ${JSON.stringify(simplifiedOrders)}
`;
    }

    // Active, high-performing Groq models
    const modelsToTry = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "llama3-70b-8192",
      "llama3-8b-8192",
      "gemma2-9b-it"
    ];

    let answer = "";

    if (apiKey) {
      for (const modelName of modelsToTry) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                { role: "system", content: dynamicPrompt },
                ...recentMessages.map((m: any) => ({
                  role: m.role === "assistant" ? "assistant" : "user",
                  content: m.content
                }))
              ],
              temperature: 0.6,
              max_tokens: 350,
            }),
            signal: AbortSignal.timeout(7000),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            let rawAnswer = data.choices?.[0]?.message?.content || "";
            rawAnswer = rawAnswer.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
            // Remove any accidental raw image markdown links
            rawAnswer = rawAnswer.replace(/!\[.*?\]\(.*?\)/g, "");
            rawAnswer = rawAnswer.replace(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/gi, "");
            if (rawAnswer && rawAnswer.length > 5) {
              answer = rawAnswer;
              break;
            }
          }
        } catch (callErr) {
          console.warn(`[Chatbot] Error calling ${modelName}:`, callErr);
        }
      }
    }

    // Intelligent context-rich fallback if API is unreachable or rate limited
    if (!answer) {
      const q = lastUserMsg;
      const isGiftCardQuery = q.includes("giftcard") || q.includes("gift card") || q.includes("gift-card") || q.includes("voucher");
      const isRewardQuery = q.includes("reward") || q.includes("claim") || q.includes("100") || q.includes("review");
      const isMissingQuery = q.includes("missing") || q.includes("not received") || q.includes("didn't get") || q.includes("not credited") || q.includes("where is") || q.includes("not showing") || q.includes("issue") || q.includes("problem") || q.includes("not working") || q.includes("pending");

      // 1. Missing or pending giftcard
      if ((isGiftCardQuery || isRewardQuery) && isMissingQuery) {
        answer = `🎁 **Gift Card Status & Missing Rewards**\n\n• **Check Gift Card History**: All generated codes appear on the **[Claim Gift Card](/claim-giftcard)** page under **Gift Card History**.\n• **Review Verification**: Reviews are verified within **24 hours**.\n• **Redemption**: Once approved, click **Redeem to Wallet** in 1-click to add ₹100 to your **[Wallet Balance](/account?tab=wallet)**.\n• **Need Help?**: Raise a quick ticket at **[Support Desk](/account?tab=support)** or email \`jaisriramtextilekpm@gmail.com\`.`;
      }
      // 2. General Giftcard / Review reward claim
      else if (isGiftCardQuery || isRewardQuery) {
        answer = `🎁 **₹100 Gift Card Review Rewards**\n\n1. Leave a 5-star review on **Amazon, Flipkart, or Google Reviews**.\n2. Submit review screenshots at **[Claim Gift Card](/claim-giftcard)**.\n3. Receive your **₹100 Gift Card** code (valid for 365 days) and redeem straight into your wallet!`;
      }
      // 3. Wallet & Cashback
      else if (q.includes("wallet") || q.includes("cashback") || q.includes("balance") || q.includes("credit")) {
        answer = `💰 **Cashback Wallet Balance**\n\n• **Earn**: Automatic cashback credited on every delivered order.\n• **Redeem at Checkout**: Use active wallet balance for up to **20% of order total (max ₹50/order)**.\n• **Manage**: View balance and transactions in **[My Wallet](/account?tab=wallet)**.`;
      }
      // 4. Order tracking & where is my order
      else if (q.includes("track") || q.includes("where is my order") || q.includes("order status") || q.includes("courier") || q.includes("awb") || q.includes("consignment")) {
        answer = `📦 **Track Your Order**\n\n• View live tracking details in **[My Orders](/account?tab=orders)**.\n• Orders are dispatched within 24–48 hours with SMS tracking updates.\n• Delivery takes **4–7 business days** across India.`;
      }
      // 5. Order cancellation / modification
      else if (q.includes("cancel") || q.includes("change address") || q.includes("modify order") || q.includes("wrong order")) {
        answer = `🛑 **Order Cancellation & Changes**\n\n• Orders can be cancelled or updated before dispatch.\n• Please raise a priority request at **[Support Desk](/account?tab=support)** or email \`jaisriramtextilekpm@gmail.com\` with your Order ID immediately.`;
      }
      // 6. Returns / Replacements / Damaged item
      else if (q.includes("return") || q.includes("replace") || q.includes("damaged") || q.includes("defective") || q.includes("broken") || q.includes("refund")) {
        answer = `🛡️ **7-Day Easy Replacement Policy**\n\n• We offer free 7-day replacement for any damaged, defective, or incorrect items.\n• Submit photos and order details at **[Support Desk](/account?tab=support)** for fast resolution within 24 hours.`;
      }
      // 7. Shipping / Delivery time & charges
      else if (q.includes("ship") || q.includes("delivery") || q.includes("charge") || q.includes("days") || q.includes("pincode") || q.includes("speed")) {
        answer = `🚚 **Shipping & Delivery**\n\n• **Free Shipping**: On all orders above **₹${freeThreshold}** (flat ₹${shippingCharge} for orders below).\n• **Timeline**: Delivered across India in **4–7 business days**.\n• Track anytime in **[My Orders](/account?tab=orders)**.`;
      }
      // 8. Payment & COD
      else if (q.includes("payment") || q.includes("cod") || q.includes("cash on delivery") || q.includes("upi") || q.includes("gpay") || q.includes("phonepe") || q.includes("paytm") || q.includes("card") || q.includes("failed")) {
        answer = `💳 **Payment Options**\n\n• 100% secure payments via **Razorpay** supporting UPI (GPay, PhonePe, Paytm), Cards, Net Banking, and Wallet Cashback.\n• If payment was deducted without order confirmation, refunds auto-credit within 3–5 business days.`;
      }
      // 9. Coupons & Discounts
      else if (q.includes("coupon") || q.includes("discount") || q.includes("promo") || q.includes("code") || q.includes("offer") || q.includes("welcome10")) {
        answer = `🏷️ **Discounts & Offers**\n\n• Use coupon **\`WELCOME10\`** at checkout for **10% OFF** your first order!\n• Plus earn a **₹100 Gift Card** by reviewing your purchase at **[Claim Gift Card](/claim-giftcard)**.`;
      }
      // 10. Single vs Double Veshti / Sizing
      else if (q.includes("single") || q.includes("double") || q.includes("size") || q.includes("meter") || q.includes("length") || q.includes("muzham") || q.includes("measurement")) {
        answer = `📏 **Dhoti / Veshti Sizing Guide**\n\n• **Single Veshti (2 Meters / 4 Muzham)**: Great for daily casual wear, temple pooja, and easy single wrap.\n• **Double Veshti (4 Meters / 8 Muzham)**: Traditional grand double-fold drape preferred for weddings, festivals, and Panchakacham.\n• Explore sizes in the **[Shop](/shop)**.`;
      }
      // 11. Fabric / Pure Cotton / Wash care
      else if (q.includes("cotton") || q.includes("fabric") || q.includes("material") || q.includes("wash") || q.includes("care") || q.includes("pure") || q.includes("quality") || q.includes("shrink")) {
        answer = `🌿 **100% Combed Handloom Cotton**\n\n• Crafted with pure long-staple combed cotton for superior breathability and softness.\n• **Wash Care**: Gentle hand or machine wash in cold water with mild detergent; dry in shade and iron on medium heat.`;
      }
      // 12. Photos / Products
      else if (isPhotoOrProductIntent && matchedProducts.length > 0) {
        answer = `📸 **Authentic Handloom Creations**\n\nHere are popular selections from our loom catalog. Tap any product below to view details and sizes:`;
      }
      // 13. Bulk / Wholesale / Custom orders
      else if (q.includes("bulk") || q.includes("wholesale") || q.includes("custom") || q.includes("wedding order") || q.includes("temple")) {
        answer = `🏭 **Bulk & Wholesale Orders**\n\n• Direct weaver pricing for weddings, temple trusts, and corporate gifting.\n• Custom zari borders and bespoke packaging available.\n• Submit inquiries at **[Bulk Orders](/bulk-orders)** or email \`jaisriramtextilekpm@gmail.com\`.`;
      }
      // 14. Support & Contact
      else if (q.includes("support") || q.includes("help") || q.includes("contact") || q.includes("phone") || q.includes("email") || q.includes("ticket") || q.includes("call") || q.includes("customer care")) {
        answer = `🎧 **Customer Support Desk**\n\n• **Priority Ticket**: Raise a request at **[Support Desk](/account?tab=support)** (< 24 hr resolution).\n• **Email**: \`jaisriramtextilekpm@gmail.com\`\n• **Hours**: Mon – Sat, 9:00 AM – 6:00 PM IST.`;
      }
      // 15. About brand
      else if (q.includes("about") || q.includes("jai sri ram") || q.includes("who are you") || q.includes("location") || q.includes("komarapalayam")) {
        answer = `🏛️ **About JAI SRI RAM TEXTILES**\n\nWe are a heritage handloom weaving house based in **Komarapalayam, Tamil Nadu** (the textile capital), specializing in authentic pure cotton Dhotis with genuine Zari, water-absorbent towels, airy scarfs, and eco-friendly jute bags.`;
      }
      // 16. Account & Password
      else if (q.includes("login") || q.includes("sign in") || q.includes("password") || q.includes("account") || q.includes("forgot")) {
        answer = `👤 **Account Assistance**\n\n• Reset your password at **[Forgot Password](/forgot-password)**.\n• Manage profile and orders in **[My Account](/account)**.`;
      }
      // 17. Greetings / Hi / Hello
      else if (/^(hi|hello|hey|vanakkam|namaste|good\s*(morning|afternoon|evening))\b/i.test(q)) {
        answer = `🙏 **Vanakkam! Welcome to JAI SRI RAM TEXTILES.**\n\nHow can I help you today with our handloom dhotis, towels, ₹100 review gift cards, or order tracking?`;
      }
      // 18. Default fallback: Clean and concise
      else {
        answer = `🙏 **Vanakkam!**\n\nI am here to assist you. Could you please specify if you need help with **₹100 Gift Cards**, **Order Tracking**, **Dhotis & Sizing**, **Shipping**, or **[Customer Support](/account?tab=support)**?`;
      }
    }

    return NextResponse.json({
      response: answer,
      products: matchedProducts.length > 0 ? matchedProducts : undefined
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      response: `🙏 **Vanakkam!** Welcome to JAI SRI RAM TEXTILES. How can I assist you with our handloom products, ₹100 gift cards, or orders today?`,
      products: matchedProducts.length > 0 ? matchedProducts : undefined
    });
  }
}

