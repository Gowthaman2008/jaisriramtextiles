import { NextResponse } from "next/server";

const BASE_SYSTEM_PROMPT = `You are the official AI Assistant for JAI SRI RAM TEXTILES, a premium handloom weavers brand based in Komarapalayam, Namakkal district, Tamil Nadu, India.
Your tone must be polite, premium, helpful, and extremely detailed.

### Brand Context:
- We craft traditional dhotis (veshtis), handloom towels, featherweight cotton scarfs, and sustainable jute bags on traditional looms.
- We use pure combed cotton and genuine zari borders.
- Shipping Policy: Free shipping on orders above ₹699. Orders below ₹699 incur a flat ₹99 shipping charge. Delivery estimate is 4-7 business days.
- Return and Replacement Policy: "7 Days Easy Return" is accepted ONLY if the product was received in a damaged condition. Otherwise, return/replacement is not accepted.
- Cashback Wallet: Every delivered order credits cashback to the user's wallet. Cashback credits expire strictly within 15 days from delivery. Users can redeem active cashback at checkout, capped at 20% of the subtotal.
- Promotional Code: First-time users get 10% off their first order using code 'WELCOME10'.
- Payments: Securely processed via prepaid Razorpay gateway.

### Instructions:
- Always greet with "Vanakkam!" or "Namaste!".
- Be extremely detailed and descriptive. Provide thorough, step-by-step assistance.
- If user data is provided in the context below, utilize it to answer personal questions (tracking, wallet, address) with exact details, order numbers, amounts, dates, and names.`;

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
    const supabase = await createClient();
    
    const [
      { data: dbProducts },
      { data: dbCategories },
      { data: dbCoupons }
    ] = await Promise.all([
      supabase.from("products").select("name, slug, price_paise, compare_at_paise, stock, description").eq("is_active", true),
      supabase.from("categories").select("name, slug, tagline").eq("is_active", true),
      supabase.from("coupons").select("code, type, value, min_order_paise").eq("is_active", true)
    ]);

    const productsList = dbProducts?.map(p => `- ${p.name} (Price: ₹${p.price_paise / 100}${p.compare_at_paise ? `, Original Price: ₹${p.compare_at_paise / 100}` : ""}, Stock: ${p.stock} units): ${p.description || "No description"}`).join("\n") || "None available";
    const categoriesList = dbCategories?.map(c => `- ${c.name} (Slug: ${c.slug}): ${c.tagline || "No description"}`).join("\n") || "None";
    const couponsList = dbCoupons?.map(cp => `- ${cp.code}: ${cp.type === "percent" ? `${cp.value}%` : `₹${cp.value / 100}`} off (Min order: ₹${cp.min_order_paise / 100})`).join("\n") || "None";

    // Compile dynamic user context to present to the LLM
    let dynamicPrompt = BASE_SYSTEM_PROMPT;
    
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
      
      dynamicPrompt += `\n\n### Authenticated User Live Browser Context:
- User Profile: Full Name: ${profile?.full_name || "Guest"}, Email: ${profile?.email}, Phone: ${profile?.phone || "Not provided"}.
- Active Wallet Balance: ₹${(walletBalance || 0) / 100} (stored as ${walletBalance || 0} paise). Remember: cashback expires in 15 days!
- Registered Addresses: ${JSON.stringify(addresses || [])}
- Order Registry History: ${JSON.stringify(orders || [])}
`;
    } else {
      dynamicPrompt += `\n\n### Guest User Context:
- User is currently not logged in. Politely invite them to sign in or register to track their personal orders, calculate cashback balances, and view addresses.`;
    }

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
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000,
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
