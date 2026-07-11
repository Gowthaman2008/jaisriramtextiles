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

- Instructions:
- CRITICAL: Make your replies detailed, helpful, and keep them strictly within 10 lines of text. Get straight to the point, no preamble.
- DESIGN & FORMATTING: Always use premium, relevant emojis/symbols (e.g., 📦, 🛡️, 🚚, 💰, 🎁, ⬜, 🎨, ❌, ⚠️) to visually structure your response. Use bold highlights, clean spacing, and bullets for an elegant, premium, and clean design. Never send plain, unformatted text blocks.
- Only greet with "Vanakkam!" on the very first message of a conversation, never in every reply.
- Always give the user a real, direct answer to what they asked — don't deflect or pad with generic advice. If you genuinely cannot answer something (e.g. it needs account data you don't have), say so in one short sentence and suggest the one next step (e.g. sign in), without listing every benefit of doing so.
- If user data is provided in the context below, use it to answer personal questions (tracking, wallet, address) with exact details, order numbers, amounts, dates, and names — briefly.
- CRITICAL — NEVER state any phone number in a reply, including the logged-in user's own phone number from their profile. That profile data exists only so you can personalize order/wallet/address answers, never to be read back as "contact info".
- If the user asks how to contact support / get in touch / talk to someone: tell them to tap the "Chat Now" button below to open our Support Contact Page, or email jaisriramtextiles@gmail.com. Do not provide any other contact method.
- If the user wants to update, edit, or change their personal profile details (like email, name, phone, etc.): tell them they can easily update their personal profile details on their account page, and mention that they can click the "Edit Profile / Account" button provided below.`;

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { messages, userContext } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages history payload" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API key not configured on backend" }, { status: 500 });
    }

    // Query active products, categories, and promo coupons from the database to give the chatbot website context
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
        supabase.from("products").select("name, slug, price_paise, compare_at_paise, stock, description").eq("is_active", true),
        supabase.from("categories").select("name, slug, tagline").eq("is_active", true),
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

    const productsList = dbProducts.map(p => `- ${p.name} (Price: ₹${p.price_paise / 100}, Stock: ${p.stock} units)`).join("\n") || "None available";
    const categoriesList = dbCategories.map(c => `- ${c.name}`).join("\n") || "None";
    const couponsList = dbCoupons.map(cp => `- ${cp.code}: ${cp.type === "percent" ? `${cp.value}%` : `₹${cp.value / 100}`} off`).join("\n") || "None";

    // Compile dynamic user context to present to the LLM
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
- User Profile: Full Name: ${profile?.full_name || "Guest"}, Email: ${profile?.email}, Phone: ${profile?.phone || "Not provided"}.
- Active Wallet Balance: ₹${(walletBalance || 0) / 100} (stored as ${walletBalance || 0} paise). Remember: cashback expires in 15 days!
- Registered Addresses: ${JSON.stringify(simplifiedAddresses)}
- Order Registry History: ${JSON.stringify(simplifiedOrders)}
`;
    } else {
      dynamicPrompt += `\n\n### Guest User Context:
- User is not logged in. For account-specific questions (orders, wallet, address), briefly say they need to sign in — one sentence, no elaboration.`;
    }

    const recentMessages = (messages || []).slice(-6);

    // Call Groq API (OpenAI-compatible)
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: dynamicPrompt },
          ...recentMessages
        ],
        temperature: 0.7,
        max_tokens: 220,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API completion failure:", errText);
      throw new Error("Failed to get response from Groq completions endpoint");
    }

    const data = await groqRes.json();
    const answer = data.choices?.[0]?.message?.content || "I apologize, I am unable to answer that right now. Please try again.";

    return NextResponse.json({ response: answer });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error.message || "Failed to process chat" }, { status: 500 });
  }
}
