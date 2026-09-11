import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

const BASE_SYSTEM_PROMPT = `You are the official, highly intelligent, friendly, and authentic AI Loom Assistant for **JAI SRI RAM TEXTILES**, a renowned heritage handloom weaving house based in Komarapalayam, Tamil Nadu, India.

### ⚡ Critical Response Guidelines:
1. **Be Concise & Direct**: Keep answers short, polite, helpful, and conversational (2–4 lines maximum or brief bullet points). Never write overly long essays.
2. **Tone**: Warm, hospitable, and respectful (use "Vanakkam 🙏", "Nandri 🙏" where appropriate).
3. **Product & Photo Authenticity**:
   - All photos, videos, and product displays across our website are **100% authentic, real studio and loom photographs** taken directly from our master weaver workshops in Komarapalayam.
   - We do NOT use generic stock images or fake photos.
   - If a customer asks or doubts photo authenticity (e.g., "photos are not real", "is this original?"), reassure them with pride and transparency, explaining that every photo represents our exact loom weave, and highlight our **7-Day Easy Replacement Guarantee** for 100% peace of mind.
4. **Issue & Complaint Resolution**:
   - If a customer reports a damaged piece, defect, missing delivery, or expresses frustration, respond with immediate empathy and clear resolution steps:
   - Provide direct links to **[Support Desk](/account?tab=support)** (24-hr resolution) or **[My Orders](/account?tab=orders)**.
   - Do NOT suggest buying new items or promote other products when a customer has an active complaint or problem.
5. **₹100 Gift Card Review Rewards**:
   - Customers earn a **₹100 Gift Card** for leaving a 5-star review on Amazon, Flipkart, or Google Reviews.
   - Submit review screenshots at **[/claim-giftcard](/claim-giftcard)**.
   - Codes are verified within 24 hours, stored in **Gift Card History**, and redeemable to wallet with 1-click. Valid for 365 days.
6. **Cashback & Wallet**:
   - Automatic cashback is credited on delivered orders.
   - Redeemable at checkout (up to 20% of cart subtotal, max ₹50/order) in **[/account?tab=wallet](/account?tab=wallet)**.
7. **Orders & Live Tracking**:
   - Track live courier status at **[/account?tab=orders](/account?tab=orders)**.
   - Orders dispatch within 24–48 hours; delivery in 4–7 business days across India.
8. **Shipping**:
   - Free shipping on orders above ₹699 (flat ₹99 below).
9. **Bulk & Wholesale Orders**:
   - Direct manufacturer pricing for temples, hotels, retailers, and weddings at **[/bulk-orders](/bulk-orders)**.
10. **Formatting**:
   - Use clean Markdown with bold keywords and clickable links. Keep replies easy to read on mobile.`;

export async function POST(request: Request) {
  let matchedProducts: any[] = [];

  try {
    const clientIp = getClientIp(request);
    const limit = checkRateLimit(clientIp, { prefix: "ai_chat", maxRequests: 30, windowSeconds: 60 });
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

    // Retrieve API Keys from environment or database settings
    let groqApiKey = process.env.GROQ_API_KEY;
    let geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let openaiApiKey = process.env.OPENAI_API_KEY;

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
        appSettingsKeysRes,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, slug, price_paise, compare_at_paise, stock, description, categories(slug, name), product_images(url, sort_order)")
          .eq("is_active", true),
        supabase.from("categories").select("id, name, slug, tagline").eq("is_active", true),
        supabase.from("coupons").select("code, type, value, min_order_paise").eq("is_active", true),
        supabase.from("app_settings").select("value").eq("key", "shipping_settings").maybeSingle(),
        !groqApiKey || !geminiApiKey
          ? supabase
              .from("app_settings")
              .select("key, value")
              .in("key", ["groq_api_key", "gemini_api_key", "openai_api_key", "ai_api_key", "ai_settings"])
          : Promise.resolve({ data: null }),
      ]);

      dbProducts = productsRes.data || [];
      dbCategories = categoriesRes.data || [];
      dbCoupons = couponsRes.data || [];

      if (appSettingsKeysRes?.data && Array.isArray(appSettingsKeysRes.data)) {
        for (const row of appSettingsKeysRes.data) {
          const val = typeof row.value === "string" ? row.value : row.value?.apiKey || row.value?.key || row.value?.api_key;
          if (row.key === "groq_api_key" && !groqApiKey && val) groqApiKey = val;
          if (row.key === "gemini_api_key" && !geminiApiKey && val) geminiApiKey = val;
          if (row.key === "openai_api_key" && !openaiApiKey && val) openaiApiKey = val;
          if (row.key === "ai_api_key" && !groqApiKey && val) groqApiKey = val;
        }
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

    // 1. Detect Support, Issue, Damage, Complaint, Return, Authenticity Doubts & Transactional queries
    const isSupportOrProblemQuery = (
      lastUserMsg.includes("damage") ||
      lastUserMsg.includes("defective") ||
      lastUserMsg.includes("defect") ||
      lastUserMsg.includes("broken") ||
      lastUserMsg.includes("torn") ||
      lastUserMsg.includes("tear") ||
      lastUserMsg.includes("stain") ||
      lastUserMsg.includes("dirty") ||
      lastUserMsg.includes("wrong") ||
      lastUserMsg.includes("missing") ||
      lastUserMsg.includes("not received") ||
      lastUserMsg.includes("didn't get") ||
      lastUserMsg.includes("did not get") ||
      lastUserMsg.includes("not get") ||
      lastUserMsg.includes("not real") ||
      lastUserMsg.includes("fake") ||
      lastUserMsg.includes("duplicate") ||
      lastUserMsg.includes("fraud") ||
      lastUserMsg.includes("scam") ||
      lastUserMsg.includes("refund") ||
      lastUserMsg.includes("replace") ||
      lastUserMsg.includes("return") ||
      lastUserMsg.includes("exchange") ||
      lastUserMsg.includes("cancel") ||
      lastUserMsg.includes("cancellation") ||
      lastUserMsg.includes("complaint") ||
      lastUserMsg.includes("issue") ||
      lastUserMsg.includes("problem") ||
      lastUserMsg.includes("not working") ||
      lastUserMsg.includes("not showing") ||
      lastUserMsg.includes("help") ||
      lastUserMsg.includes("support") ||
      lastUserMsg.includes("ticket") ||
      lastUserMsg.includes("track") ||
      lastUserMsg.includes("where is my") ||
      lastUserMsg.includes("order status") ||
      lastUserMsg.includes("courier") ||
      lastUserMsg.includes("delay") ||
      lastUserMsg.includes("late") ||
      lastUserMsg.includes("giftcard") ||
      lastUserMsg.includes("gift card") ||
      lastUserMsg.includes("wallet") ||
      lastUserMsg.includes("cashback") ||
      lastUserMsg.includes("payment") ||
      lastUserMsg.includes("money") ||
      lastUserMsg.includes("review reward")
    );

    // 2. Detect explicit photo, catalog or shopping requests
    const isExplicitPhotoOrCatalogIntent = (
      lastUserMsg.includes("show photo") ||
      lastUserMsg.includes("send photo") ||
      lastUserMsg.includes("show me photo") ||
      lastUserMsg.includes("show pics") ||
      lastUserMsg.includes("send pic") ||
      lastUserMsg.includes("show me the collection") ||
      lastUserMsg.includes("show products") ||
      lastUserMsg.includes("see products") ||
      lastUserMsg.includes("catalog") ||
      lastUserMsg.includes("explore collection") ||
      lastUserMsg.includes("what products do you have") ||
      lastUserMsg.includes("show catalog")
    );

    const isGeneralShoppingInquiry = (
      (lastUserMsg.includes("dhoti") ||
        lastUserMsg.includes("veshti") ||
        lastUserMsg.includes("vesthi") ||
        lastUserMsg.includes("vetti") ||
        lastUserMsg.includes("towel") ||
        lastUserMsg.includes("thundu") ||
        lastUserMsg.includes("angavastram") ||
        lastUserMsg.includes("jute") ||
        lastUserMsg.includes("bag") ||
        lastUserMsg.includes("scarf")) &&
      (lastUserMsg.startsWith("show ") ||
        lastUserMsg.includes("buy ") ||
        lastUserMsg.includes("order ") ||
        lastUserMsg.includes("purchase ") ||
        lastUserMsg.includes("collection") ||
        lastUserMsg.includes("explore"))
    );

    // Only attach product cards if this is a genuine shopping request and NOT a problem/support query
    const shouldAttachProducts = !isSupportOrProblemQuery && (isExplicitPhotoOrCatalogIntent || isGeneralShoppingInquiry);

    matchedProducts = [];

    if (shouldAttachProducts && dbProducts.length > 0) {
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

    dynamicPrompt += `\n\n### 📦 Current Store Catalog & Offers:
- **Categories**: ${categoriesList}
- **Products Sample**: ${productsList.slice(0, 800)}
- **Active Coupons**: ${couponsList}
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

      dynamicPrompt += `\n\n### 👤 Logged-in Customer Context:
- **Customer**: ${profile?.full_name || "Valued Customer"} (${profile?.email || "Signed In"})
- **Wallet Balance**: ₹${((walletBalance || 0) / 100).toFixed(0)}
- **Saved Addresses**: ${JSON.stringify(simplifiedAddresses)}
- **Recent Orders**: ${JSON.stringify(simplifiedOrders)}
`;
    }

    let answer = "";

    // 1. Try Groq API with active current models
    if (groqApiKey) {
      const groqModels = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "qwen/qwen3.6-27b",
        "groq/compound",
        "groq/compound-mini"
      ];

      for (const modelName of groqModels) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
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
              temperature: 0.5,
              max_tokens: 350,
            }),
            signal: AbortSignal.timeout(6000),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            let rawAnswer = data.choices?.[0]?.message?.content || "";
            rawAnswer = rawAnswer.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
            rawAnswer = rawAnswer.replace(/!\[.*?\]\(.*?\)/g, "");
            rawAnswer = rawAnswer.replace(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/gi, "");
            if (rawAnswer && rawAnswer.length > 2) {
              answer = rawAnswer;
              break;
            }
          } else {
            console.warn(`[Chatbot] Groq ${modelName} returned status ${groqRes.status}`);
          }
        } catch (callErr) {
          console.warn(`[Chatbot] Groq ${modelName} error:`, callErr);
        }
      }
    }

    // 2. Try Gemini API fallback if Groq is unconfigured or failed
    if (!answer && geminiApiKey) {
      const geminiModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
      for (const model of geminiModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: `${dynamicPrompt}\n\nUser Conversation History:\n${recentMessages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}`
                      }
                    ]
                  }
                ],
                generationConfig: { maxOutputTokens: 350, temperature: 0.5 }
              }),
              signal: AbortSignal.timeout(6000)
            }
          );
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            let text = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
            if (text && text.length > 2) {
              answer = text;
              break;
            }
          }
        } catch (geminiErr) {
          console.warn(`[Chatbot] Gemini ${model} error:`, geminiErr);
        }
      }
    }

    // 3. Intelligent Conversational Fallback Engine (Runs only if AI LLMs are unavailable)
    if (!answer) {
      const q = lastUserMsg;

      // 1. Photo Authenticity Doubts ("photos not real", "is this real photo", "fake")
      if (q.includes("not real") || q.includes("fake") || q.includes("real photo") || q.includes("photos are not real") || q.includes("actual photo") || q.includes("original photo")) {
        answer = `📸 **100% Genuine Studio & Loom Photos**\n\nEvery photograph and video on our website is taken directly from our **actual handloom workshops in Komarapalayam**. We never use stock photos or digitally altered images.\n\nEvery piece comes with our **[7-Day Easy Replacement Guarantee](/account?tab=support)** — you receive the exact weave, zari border, and fabric quality shown on screen!`;
      }
      // 2. Closings & Goodbyes
      else if (/^(bye|goodbye|good\s*bye|bye\s*bye|see\s*you|cya|take\s*care|good\s*night|goodnight|tata|exit|quit)\b/i.test(q)) {
        answer = `🙏 **Nandri!** Thank you for visiting **JAI SRI RAM TEXTILES**.\n\nWishing you a wonderful day! Reach out anytime if you need authentic handlooms or assistance.`;
      }
      // 3. Acknowledgments, OK, "I am okay"
      else if (/^(ok|okay|ok\s*ai|iam\s*okay|i\s*am\s*okay|fine|iam\s*fine|alright|got\s*it|understood|cool|super|great|perfect)\b/i.test(q)) {
        answer = `Glad to hear that! 🙏\n\nI'm always here if you'd like to explore our pure cotton dhotis, check your ₹100 review gift card, or track an order. Have a great time!`;
      }
      // 4. Gratitude & Thanks
      else if (/^(thanks|thank\s*you|thx|thank\s*u|nandri|dhanyavadam|shukriya)\b/i.test(q)) {
        answer = `You're most welcome! 🙏\n\nIt is our pleasure to assist you. Let me know if you need anything else from our Komarapalayam weaving house!`;
      }
      // 5. How are you / Identity
      else if (/^(how\s*are\s*you|how\s*r\s*u|who\s*are\s*you|what\s*is\s*your\s*name)\b/i.test(q)) {
        answer = `Vanakkam! 🙏 I am the **Loom Assistant**, the official AI concierge for **JAI SRI RAM TEXTILES**.\n\nI can help you explore handloom dhotis & towels, track live orders, claim your ₹100 review gift card, or connect with our support desk!`;
      }
      // 6. Missing / Issue with Gift Card
      else if ((q.includes("giftcard") || q.includes("gift card") || q.includes("reward") || q.includes("claim")) && (q.includes("missing") || q.includes("not received") || q.includes("issue") || q.includes("problem"))) {
        answer = `🎁 **Gift Card Status & Verification**\n\n• **Check Gift Card History**: All generated codes appear on the **[Claim Gift Card](/claim-giftcard)** page under **Gift Card History**.\n• **Review Verification**: Reviews are verified within **24 hours**.\n• **Redemption**: Once approved, click **Redeem to Wallet** in 1-click to add ₹100 to your **[Wallet Balance](/account?tab=wallet)**.\n• **Need Help?**: Raise a quick ticket at **[Support Desk](/account?tab=support)**.`;
      }
      // 7. General Gift Card
      else if (q.includes("giftcard") || q.includes("gift card") || q.includes("voucher") || q.includes("claim") || q.includes("reward")) {
        answer = `🎁 **₹100 Gift Card Review Rewards**\n\n1. Leave a 5-star review on **Amazon, Flipkart, or Google Reviews**.\n2. Submit review screenshots at **[Claim Gift Card](/claim-giftcard)**.\n3. Receive your **₹100 Gift Card** code (valid for 365 days) and redeem straight into your wallet!`;
      }
      // 8. Wallet & Cashback
      else if (q.includes("wallet") || q.includes("cashback") || q.includes("balance")) {
        answer = `💰 **Cashback Wallet Balance**\n\n• **Earn**: Automatic cashback credited on every delivered order.\n• **Redeem at Checkout**: Use active wallet balance for up to **20% of order total (max ₹50/order)**.\n• **Manage**: View balance and transactions in **[My Wallet](/account?tab=wallet)**.`;
      }
      // 9. Orders & Tracking
      else if (q.includes("track") || q.includes("where is my order") || q.includes("order status") || q.includes("courier") || q.includes("awb")) {
        answer = `📦 **Track Your Order**\n\n• View live tracking details in **[My Orders](/account?tab=orders)**.\n• Orders are dispatched within 24–48 hours with SMS tracking updates.\n• Delivery takes **4–7 business days** across India.`;
      }
      // 10. Damaged / Replacement / Return
      else if (q.includes("return") || q.includes("replace") || q.includes("damaged") || q.includes("defective") || q.includes("broken") || q.includes("refund")) {
        answer = `🛡️ **7-Day Easy Replacement Policy**\n\n• We offer free 7-day replacement for any damaged, defective, or incorrect items.\n• Submit photos and order details at **[Support Desk](/account?tab=support)** for fast resolution within 24 hours.`;
      }
      // 11. Cancellation
      else if (q.includes("cancel") || q.includes("modify order") || q.includes("wrong order")) {
        answer = `🛑 **Order Cancellation & Changes**\n\n• Orders can be cancelled or updated before dispatch.\n• Please raise a priority request at **[Support Desk](/account?tab=support)** or email \`jaisriramtextilekpm@gmail.com\` with your Order ID immediately.`;
      }
      // 12. Shipping
      else if (q.includes("ship") || q.includes("delivery") || q.includes("charge") || q.includes("days") || q.includes("pincode")) {
        answer = `🚚 **Shipping & Delivery**\n\n• **Free Shipping**: On all orders above **₹${freeThreshold}** (flat ₹${shippingCharge} for orders below).\n• **Timeline**: Delivered across India in **4–7 business days**.\n• Track anytime in **[My Orders](/account?tab=orders)**.`;
      }
      // 13. Sizing
      else if (q.includes("single") || q.includes("double") || q.includes("size") || q.includes("meter") || q.includes("length") || q.includes("muzham")) {
        answer = `📏 **Dhoti / Veshti Sizing Guide**\n\n• **Single Veshti (2 Meters / 4 Muzham)**: Great for daily casual wear, temple pooja, and easy wrap.\n• **Double Veshti (4 Meters / 8 Muzham)**: Traditional grand double-fold drape preferred for weddings, festivals, and Panchakacham.\n• Explore sizes in the **[Shop](/shop)**.`;
      }
      // 14. Bulk Wholesale
      else if (q.includes("bulk") || q.includes("wholesale") || q.includes("custom") || q.includes("wedding order") || q.includes("temple")) {
        answer = `🏭 **Bulk & Wholesale Orders**\n\n• Direct weaver pricing for weddings, temple trusts, and corporate gifting.\n• Custom zari borders and bespoke packaging available.\n• Submit inquiries at **[Bulk Orders](/bulk-orders)** or email \`jaisriramtextilekpm@gmail.com\`.`;
      }
      // 15. Customer Support
      else if (q.includes("support") || q.includes("help") || q.includes("contact") || q.includes("phone") || q.includes("email") || q.includes("ticket")) {
        answer = `🎧 **Customer Support Desk**\n\n• **Priority Ticket**: Raise a request at **[Support Desk](/account?tab=support)** (< 24 hr resolution).\n• **Email**: \`jaisriramtextilekpm@gmail.com\`\n• **Hours**: Mon – Sat, 9:00 AM – 6:00 PM IST.`;
      }
      // 16. Greetings & General Welcome
      else if (/^(hi|hello|hey|vanakkam|namaste|good\s*(morning|afternoon|evening))\b/i.test(q)) {
        answer = `🙏 **Vanakkam! Welcome to JAI SRI RAM TEXTILES.**\n\nHow can I help you today with our handloom dhotis, towels, ₹100 review gift cards, or order tracking?`;
      }
      // 17. Default Help
      else {
        answer = `🙏 **Vanakkam!**\n\nI am here to assist you. Could you please specify if you need help with **₹100 Gift Cards**, **Order Tracking**, **Dhotis & Sizing**, **Shipping**, or **[Customer Support](/account?tab=support)**?`;
      }
    }

    return NextResponse.json({
      response: answer,
      products: matchedProducts.length > 0 ? matchedProducts : undefined,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      response: `🙏 **Vanakkam!** Welcome to JAI SRI RAM TEXTILES. How can I assist you with our handloom products, ₹100 gift cards, or orders today?`,
      products: matchedProducts.length > 0 ? matchedProducts : undefined,
    });
  }
}
