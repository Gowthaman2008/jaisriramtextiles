import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

const BASE_SYSTEM_PROMPT = `You are the official, highly intelligent and friendly AI Loom Assistant for **JAI SRI RAM TEXTILES**, a renowned heritage handloom weaving brand located in Komarapalayam, Namakkal district, Tamil Nadu, India.

Your goal is to provide exceptional, warm, respectful, and comprehensive customer support, product advice, order guidance, and store knowledge to every visitor. Greet warmly (e.g. "Vanakkam! 🙏") with authentic South Indian textile hospitality.

### 🏛️ Brand Heritage & Craftsmanship:
- **Location**: 5/136/5, Shasti Smart City, Kallankattuvalasu, Kumarapalayam, Namakkal – 638183, Tamil Nadu (the textile weaving capital).
- **Core Specialization**: Traditional shuttle-loom weaving of authentic pure combed cotton Dhotis (Veshtis) with genuine gold & silver Zari borders, high-absorbent cotton bath & pooja towels (Thundu/Angavastram), lightweight airy cotton scarfs, and eco-friendly sustainable Jute/Canvas bags.
- **Quality Promise**: 100% pure combed long-staple cotton, skin-friendly, breathable, shrink-resistant, and woven by master artisans.

---

### 🌐 Complete Website Features & Navigation:
1. **Explore & Shop Collections** (\`/shop\`):
   - **Dhotis / Veshtis**: Pure white wedding veshtis, traditional Balaji temple border dhotis, fine golden & silver zari borders, colour dhotis, available in 2-meter (Single) and 4-meter (Double) sizes.
   - **Towels & Thundu**: Heavy-density water absorbent cotton bath towels, honeycomb waffle weave, pooja angavastrams.
   - **Scarfs & Shawls**: Featherlight daily and festive wear cotton scarfs.
   - **Jute Bags**: Durable, eco-friendly shopping, pooja, and gift bags.
   - Every product page features zoomable high-resolution imagery, fabric specs, size charts, and verified customer reviews.

2. **Customer Review Rewards & ₹100 Gift Cards** (\`/claim-giftcard\`):
   - Share a 5-star positive review on **Amazon, Flipkart, or Google Reviews** to earn an instant **₹100 Gift Card**.
   - Valid for **1 full year (365 days)** from issue date.
   - 1-click redemption into store wallet as instant cashback balance.
   - Review proof requires 2 screenshots (Rating Screen + Submit Confirmation) and Platform Order ID (Google Reviews require 1 screenshot).
   - Dedicated **Gift Card History** ledger allows tracking all generated codes and validity anytime.

3. **Cashback Wallet System** (\`/account?tab=wallet\`):
   - Earn automatic cashback credits on every delivered order.
   - Redeem active wallet cashback directly at checkout for up to **20% of order subtotal (max ₹50 per order)**.
   - Instant 1-click gift card code redemption into wallet balance.

4. **Customer Support Desk & Ticket System** (\`/account?tab=support\` or \`/contact\`):
   - Priority ticket submission with dedicated resolution within 24 hours.
   - Live real-time chat with support executives and instant email notifications to store management (\`jaisriramtextilekpm@gmail.com\`).
   - Operating Hours: Monday – Saturday (9:00 AM – 6:00 PM IST).

5. **Bulk & Wholesale Custom Loom Orders** (\`/bulk-orders\`):
   - Factory-direct wholesale pricing for weddings, temple trusts, corporate gifting, and bulk retailers.
   - Custom border weaving, name printing, and bespoke packaging available.

6. **Shipping & Delivery Policy**:
   - **Free Shipping**: Available on all orders above ₹699 (flat ₹99 for orders below ₹699).
   - **Delivery Speed**: 4–7 business days to any pincode across India with live tracking updates.

7. **Returns & Replacement Policy**:
   - **7-Day Easy Replacement**: Accepted if product is received in a damaged or defective condition with simple photo verification.

8. **Promotions & Offers**:
   - First-time shoppers get **10% OFF** using coupon code **\`WELCOME10\`** at checkout.

9. **Payment Modes**:
   - 100% secure Razorpay gateway supporting UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, and Wallet Cashback.

---

### 💡 Conversational & Response Guidelines:
- **Tone**: Warm, enthusiastic, knowledgeable, respectful, and articulate.
- **Formatting**: Use clean bullet points, bold keywords, and tasteful emojis (🥻, 🌿, 🪔, 🎁, 🚚, 💰, 🛍️, ⭐).
- **Product Photos**: DO NOT write raw markdown image links. Our system automatically attaches high-resolution interactive photo cards whenever products are discussed. Warmly introduce the photo cards.
- **Engaging & Helpful**: Answer questions thoroughly. If a user asks about custom dhotis, gift cards, how to order, or shipping, provide step-by-step guidance! If a user is playful or conversational, respond pleasantly with warmth and connect it back to our rich handloom heritage.`;

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
    const lastUserMsg = (recentMessages[recentMessages.length - 1]?.content || "").toLowerCase();

    // Check if the user's message is ONLY a compliment / feedback
    const isPureCompliment = /^(all\s+)?(photos?|pics?|pictures?|images?|these|those)?\s*(are\s+|look\s+)?(very\s+|so\s+)?(good|nice|great|awesome|beautiful|super|perfect|fine|ok|okay|thank you|thanks)\b/i.test(lastUserMsg.trim());

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
      "orders above ₹699 (flat ₹99 for orders below ₹699)",
      `orders above ₹${freeThreshold} (flat ₹${shippingCharge} for orders below ₹${freeThreshold})`
    );

    dynamicPrompt += `\n\n### 📦 Live Catalog & Database Context:
- **Active Store Categories**:
${categoriesList}

- **Active Products on Sale**:
${productsList}

- **Active Promo Coupon Codes**:
${couponsList}
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

      dynamicPrompt += `\n\n### 👤 Authenticated Customer Live Context:
- **Customer Name**: ${profile?.full_name || "Valued Customer"} (${profile?.email || "Signed In"})
- **Active Cashback Balance**: ₹${((walletBalance || 0) / 100).toFixed(0)}
- **Saved Addresses**: ${JSON.stringify(simplifiedAddresses)}
- **Recent Orders**: ${JSON.stringify(simplifiedOrders)}
`;
    }

    // Active, high-performing Groq models
    const modelsToTry = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
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
              temperature: 0.7,
              max_tokens: 500,
            }),
            signal: AbortSignal.timeout(8000),
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

    // Intelligent context-rich fallback if API is unreachable
    if (!answer) {
      if (isPhotoOrProductIntent && matchedProducts.length > 0) {
        answer = `📸 **Authentic Handloom Product Collections**\n\nHere are photos of our authentic handloom creations crafted directly on traditional heritage looms in Komarapalayam. Tap any product below to view full details or order online!`;
      } else if (lastUserMsg.includes("about") || lastUserMsg.includes("jai sri ram") || lastUserMsg.includes("brand") || lastUserMsg.includes("who are you")) {
        answer = `🏛️ **About JAI SRI RAM TEXTILES**\n\nWe are a heritage handloom brand rooted in **Komarapalayam, Namakkal district, Tamil Nadu** — the renowned textile hub of South India.\n\n• **Our Craft**: Traditional pure combed cotton Dhotis (Veshtis) with authentic gold and silver Zari borders, premium water-absorbent towels, breathable cotton scarfs, and eco-friendly jute bags.\n• **Artisan Heritage**: Every yard is crafted by skilled weaver artisans on traditional shuttle looms.\n• **Direct Factory Weaving**: We also take bulk wedding, temple, and corporate custom orders!`;
      } else if (lastUserMsg.includes("gift card") || lastUserMsg.includes("reward") || lastUserMsg.includes("claim") || lastUserMsg.includes("review")) {
        answer = `🎁 **₹100 Gift Card Review Rewards**\n\nEarn an instant **₹100 Gift Card** by sharing your genuine positive 5-star review!\n\n1. **Review**: Leave your review on **Amazon, Flipkart, or Google Reviews**.\n2. **Take Screenshots**: Capture your 5-star rating & confirmation.\n3. **Claim Instantly**: Go to **[Claim Gift Card](/claim-giftcard)**, upload your screenshots and Order ID.\n4. **Redeem**: Valid for **1 full year** & redeemable straight into your store wallet as cashback!`;
      } else if (lastUserMsg.includes("wallet") || lastUserMsg.includes("cashback") || lastUserMsg.includes("balance")) {
        answer = `💰 **Cashback Wallet Benefits**\n\n• **Auto Credits**: Every delivered order credits cashback into your wallet.\n• **Redemption at Checkout**: Redeem your active cashback balance during checkout for up to **20% of your cart subtotal (max ₹50/order)**.\n• **Manage**: Check your balance anytime in **[My Wallet](/account?tab=wallet)**!`;
      } else if (lastUserMsg.includes("order") || lastUserMsg.includes("buy") || lastUserMsg.includes("purchase") || lastUserMsg.includes("how to")) {
        answer = `🛍️ **How to Place an Order Online**\n\n1. **Browse Collections**: Explore our pure cotton Dhotis, Towels, Scarfs, and Jute Bags in the **[Shop](/shop)**.\n2. **Add to Bag**: Choose your required size (Single/Double) and click **Add to Cart**.\n3. **Apply Coupon**: Use code **\`WELCOME10\`** at checkout for **10% OFF** your first order!\n4. **Secure Checkout**: Pay securely via UPI, Cards, Net Banking, or Wallet Cashback. Free shipping on orders over ₹${freeThreshold}!`;
      } else if (lastUserMsg.includes("ship") || lastUserMsg.includes("delivery") || lastUserMsg.includes("tracking")) {
        answer = `🚚 **Shipping & Delivery Details**\n\n• **Free Shipping**: On all orders above **₹${freeThreshold}** across India.\n• **Standard Shipping**: Flat ₹${shippingCharge} for orders under ₹${freeThreshold}.\n• **Delivery Time**: 4–7 business days with live tracking in **[My Orders](/account?tab=orders)**.`;
      } else if (lastUserMsg.includes("bulk") || lastUserMsg.includes("wholesale") || lastUserMsg.includes("custom") || lastUserMsg.includes("wedding")) {
        answer = `🏭 **Bulk & Wholesale Handloom Orders**\n\nWe provide direct loom factory pricing for weddings, temple functions, corporate gifting, and wholesale distributors.\n\n• Custom border names & designs\n• Bulk tiered discounts\n• Submit your inquiry at **[Bulk Orders](/bulk-orders)** or email **jaisriramtextilekpm@gmail.com**!`;
      } else if (lastUserMsg.includes("support") || lastUserMsg.includes("help") || lastUserMsg.includes("contact") || lastUserMsg.includes("ticket")) {
        answer = `🎧 **Customer Support & Assistance**\n\n• **Raise Ticket**: Go to **[Support Desk](/account?tab=support)** to open an official inquiry with < 24-hr resolution.\n• **Official Email**: \`jaisriramtextilekpm@gmail.com\`\n• **Hours**: Mon – Sat, 9:00 AM – 6:00 PM IST.`;
      } else {
        answer = `🙏 **Vanakkam & Welcome to JAI SRI RAM TEXTILES!**\n\nI am your Loom Assistant, here to help you explore our heritage handloom creations:\n\n• 🥻 **Pure Cotton Dhotis**: Wedding Zari, Balaji & Temple borders\n• 🌿 **Cotton Towels & Scarfs**: High-absorbent, breathable\n• 🎁 **Review Rewards**: Claim **₹100 Gift Card** for your review at **[Claim Giftcard](/claim-giftcard)**\n• 💰 **Promo**: Use coupon **\`WELCOME10\`** for 10% off!\n\nHow can I assist you today?`;
      }
    }

    return NextResponse.json({
      response: answer,
      products: matchedProducts.length > 0 ? matchedProducts : undefined
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      response: `🙏 **Vanakkam!** Welcome to JAI SRI RAM TEXTILES. How can we assist you with our handloom products, ₹100 gift card rewards, or orders today?`,
      products: matchedProducts.length > 0 ? matchedProducts : undefined
    });
  }
}

