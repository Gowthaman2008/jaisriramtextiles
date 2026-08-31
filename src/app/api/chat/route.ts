import { NextResponse } from "next/server";

const BASE_SYSTEM_PROMPT = `You are the official AI Assistant for JAI SRI RAM TEXTILES, a premium handloom weavers brand based in Komarapalayam, Namakkal district, Tamil Nadu, India.
Your tone must be polite, premium, and helpful.

### Brand Context:
- We craft traditional dhotis (veshtis), handloom towels, featherweight cotton scarfs, and sustainable jute bags on traditional looms.
- We use pure combed cotton and genuine zari borders.
- Shipping Policy: Free shipping on orders above ₹699. Orders below ₹699 incur a flat ₹99 shipping charge. Delivery estimate is 4-7 business days.
- Return and Replacement Policy: "7 Days Easy Return" is accepted ONLY if the product was received in a damaged condition. Otherwise, return/replacement is not accepted.
- Cashback Wallet: Every delivered order credits cashback to the user's wallet. Cashback credits expire strictly within 15 days from delivery. Users can redeem active cashback at checkout, capped at 20% of the subtotal.
- Promotional Code: First-time users get 10% off their first order using code 'WELCOME10'.
- Payments: Securely processed via prepaid Razorpay gateway.

### CRITICAL RULES:
- When a user asks for photos, pictures, samples, or to see products: DO NOT write markdown image links or fake URLs (like https://...jpg). Our frontend system automatically attaches real high-resolution photo cards right below your message. Simply introduce the photos warmly (e.g. "📸 Here are photos of our authentic handloom collections crafted directly on our heritage looms in Komarapalayam. Tap any product below to view details or order online!").
- Keep replies concise, helpful, and strictly within 10 lines. Use tasteful emojis (📸, 🥻, 🚚, 💰, 🎁, 🛡️).
- If the user asks how to contact support / get in touch: tell them to tap the "Chat Now" button below or email jaisriramtextilekpm@gmail.com.`;

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { messages, userContext } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages history payload" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;

    // Query active products with images, categories, and promo coupons
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
        settingsRes
      ] = await Promise.all([
        supabase.from("products").select("id, name, slug, price_paise, compare_at_paise, stock, description, categories(slug, name), product_images(url, sort_order)").eq("is_active", true),
        supabase.from("categories").select("id, name, slug, tagline").eq("is_active", true),
        supabase.from("coupons").select("code, type, value, min_order_paise").eq("is_active", true),
        supabase.from("app_settings").select("value").eq("key", "shipping_settings").maybeSingle()
      ]);
      dbProducts = productsRes.data || [];
      dbCategories = categoriesRes.data || [];
      dbCoupons = couponsRes.data || [];
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

    const recentMessages = (messages || []).slice(-6);
    const lastUserMsg = (recentMessages[recentMessages.length - 1]?.content || "").toLowerCase();

    // Check if the user's message is ONLY a compliment / feedback (so we don't re-attach photos unnecessarily)
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

    let matchedProducts: any[] = [];

    if (isPhotoOrProductIntent) {
      let filtered = dbProducts.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const catName = (p.categories?.name || "").toLowerCase();
        const catSlug = (p.categories?.slug || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const fullText = `${name} ${catName} ${catSlug} ${desc}`;

        if (lastUserMsg.includes("white dhoti") || lastUserMsg.includes("white veshti") || lastUserMsg.includes("white vesthi")) {
          return fullText.includes("white") && (fullText.includes("dhoti") || fullText.includes("veshti") || fullText.includes("vesthi") || fullText.includes("vesthi"));
        }
        if (lastUserMsg.includes("colour dhoti") || lastUserMsg.includes("color dhoti") || lastUserMsg.includes("colour veshti") || lastUserMsg.includes("color veshti") || lastUserMsg.includes("colour vesthi")) {
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

      // If no category matched or general photo request, pick a diverse set across categories
      if (filtered.length === 0 && (
        lastUserMsg.includes("photo") ||
        lastUserMsg.includes("pic") ||
        lastUserMsg.includes("image") ||
        lastUserMsg.includes("show") ||
        lastUserMsg.includes("send") ||
        lastUserMsg.includes("sample") ||
        lastUserMsg.includes("catalog")
      )) {
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

    const productsList = dbProducts.map(p => `- ${p.name} (Price: ₹${p.price_paise / 100}, Stock: ${p.stock} units)`).join("\n") || "None available";
    const categoriesList = dbCategories.map(c => `- ${c.name}`).join("\n") || "None";
    const couponsList = dbCoupons.map(cp => `- ${cp.code}: ${cp.type === "percent" ? `${cp.value}%` : `₹${cp.value / 100}`} off`).join("\n") || "None";

    let dynamicPrompt = BASE_SYSTEM_PROMPT.replace(
      "- Shipping Policy: Free shipping on orders above ₹699. Orders below ₹699 incur a flat ₹99 shipping charge. Delivery estimate is 4-7 business days.",
      `- Shipping Policy: Free shipping on orders above ₹${freeThreshold}. Orders below ₹${freeThreshold} incur a flat ₹${shippingCharge} shipping charge. Delivery estimate is 4-7 business days.`
    );
    
    dynamicPrompt += `\n\n### Current Website Catalog & Database Context:
- **Active Categories**:
${categoriesList}

- **Active Products on Sale**:
${productsList}

- **Active Promo Coupon Codes**:
${couponsList}
`;

    if (userContext) {
      const { profile, orders, addresses, walletBalance } = userContext;
      
      const simplifiedOrders = (orders || []).slice(0, 3).map((o: any) => ({
        number: o.order_number,
        status: o.status,
        total: o.total_amount_paise ? `₹${o.total_amount_paise / 100}` : "",
        items: (o.order_items || []).map((oi: any) => `${oi.product_name} x ${oi.quantity}`).join(", "),
        date: o.placed_at ? new Date(o.placed_at).toLocaleDateString() : ""
      }));

      const simplifiedAddresses = (addresses || []).slice(0, 2).map((a: any) => `${a.recipient}, ${a.line1}, ${a.city} - ${a.pincode}`);

      dynamicPrompt += `\n\n### Authenticated User Live Browser Context:
- User Profile: Full Name: ${profile?.full_name || "Guest"}, Email: ${profile?.email}.
- Active Wallet Balance: ₹${(walletBalance || 0) / 100} (stored as ${walletBalance || 0} paise).
- Registered Addresses: ${JSON.stringify(simplifiedAddresses)}
- Order Registry History: ${JSON.stringify(simplifiedOrders)}
`;
    }

    // Call Groq API with active models and 5s timeout
    const modelsToTry = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"];
    let answer = "";

    if (apiKey) {
      for (const modelName of modelsToTry) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                { role: "system", content: dynamicPrompt },
                ...recentMessages
              ],
              temperature: 0.7,
              max_tokens: 350,
            }),
            signal: AbortSignal.timeout(6000),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            let rawAnswer = data.choices?.[0]?.message?.content || "";
            rawAnswer = rawAnswer.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
            // Clean up any accidental fake image links generated by AI
            rawAnswer = rawAnswer.replace(/!\[.*?\]\(.*?\)/g, "");
            rawAnswer = rawAnswer.replace(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/gi, "");
            if (rawAnswer) {
              answer = rawAnswer;
              break;
            }
          }
        } catch (callErr) {
          console.warn(`[Chatbot] Error calling ${modelName}:`, callErr);
        }
      }
    }

    if (!answer) {
      if (isPhotoOrProductIntent && matchedProducts.length > 0) {
        answer = `📸 **Authentic Handloom Product Photos**\n\nHere are photos of our premium handloom creations crafted directly on our heritage looms in Komarapalayam. Tap any product below to view full details or order online!`;
      } else if (lastUserMsg.includes("hi") || lastUserMsg.includes("hello") || lastUserMsg.includes("vanakkam") || lastUserMsg.includes("hey")) {
        answer = `🙏 **Vanakkam & Welcome to JAI SRI RAM TEXTILES!**\n\nI am your Loom Assistant. How may I assist you today?\n\n• 🥻 **Explore Collections**: Dhotis, Towels, Scarfs & Jute Bags\n• 🚚 **Shipping**: Free shipping on orders above ₹${freeThreshold}\n• 🎁 **Promo**: Use code **WELCOME10** for 10% off your first order!`;
      } else if (lastUserMsg.includes("order") || lastUserMsg.includes("buy") || lastUserMsg.includes("purchase")) {
        answer = `🛍️ **How to Place an Order**\n\n1. **Browse Collections**: Choose from our Dhotis, Towels, Scarfs, and Jute Bags.\n2. **Add to Bag**: Select your size or style and click Add to Cart.\n3. **Checkout**: Enter your delivery address and apply coupon **WELCOME10**.\n4. **Payment**: Complete your order securely via Razorpay (UPI, Cards, Net Banking).`;
      } else if (lastUserMsg.includes("ship") || lastUserMsg.includes("delivery")) {
        answer = `🚚 **Shipping Information**\n\n• **Free Shipping**: Available on all orders above ₹${freeThreshold} (flat ₹${shippingCharge} for smaller orders).\n• **Estimated Delivery**: 4–7 business days anywhere across India.`;
      } else if (lastUserMsg.includes("return") || lastUserMsg.includes("refund")) {
        answer = `🛡️ **Return & Replacement Policy**\n\n• **7-Day Easy Return**: We accept returns or replacements within 7 days if the product is damaged or defective upon arrival.\n• Please contact support with photos of the damaged package.`;
      } else {
        answer = `🙏 Thank you for contacting **JAI SRI RAM TEXTILES**! For inquiries, order assistance, or custom bulk orders, feel free to reach out directly or email **jaisriramtextilekpm@gmail.com**.`;
      }
    }

    return NextResponse.json({ 
      response: answer,
      products: matchedProducts.length > 0 ? matchedProducts : undefined
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ 
      response: `🙏 **Vanakkam!** Welcome to JAI SRI RAM TEXTILES. How can we assist you with our handloom products today?`,
      products: matchedProducts.length > 0 ? matchedProducts : undefined
    });
  }
}
