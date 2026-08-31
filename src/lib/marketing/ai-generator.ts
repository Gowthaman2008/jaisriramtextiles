export async function generateMarketingContent(options: {
  action: "subject_lines" | "preview_text" | "body_copy" | "cta_suggestions" | "rewrite";
  campaignName: string;
  topic?: string;
  tone?: string;
  existingText?: string;
  productNames?: string[];
  discountOffer?: string;
}): Promise<{ result: string | string[] }> {
  const { action, campaignName, topic, tone = "festive and premium", existingText, productNames = [], discountOffer } = options;

  const apiKey = process.env.GROQ_API_KEY;

  const productContext = productNames.length > 0 ? `Featured products: ${productNames.join(", ")}.` : "";
  const offerContext = discountOffer ? `Offer details: ${discountOffer}.` : "";

  let prompt = "";

  if (action === "subject_lines") {
    prompt = `You are a high-conversion email marketing copywriter for JAI SRI RAM TEXTILES (traditional authentic handloom brand in Tamil Nadu, India).
Generate 5 compelling, clickable, high-open-rate subject lines for the email campaign "${campaignName}".
Tone: ${tone}.
Topic/Theme: ${topic || campaignName}.
${productContext}
${offerContext}

Rules:
- Include tasteful emojis (e.g., 🌸, ✨, 🪔, 🎁, 🔥, 🛍️) in some variations.
- Return ONLY a JSON array of 5 strings, for example: ["Subject 1", "Subject 2", "Subject 3", "Subject 4", "Subject 5"]
- Do not output any markdown formatting, preamble, or commentary.`;
  } else if (action === "preview_text") {
    prompt = `Generate 4 engaging preheader / preview texts (under 90 characters each) for an email titled "${campaignName}".
${offerContext}
Return ONLY a JSON array of 4 strings. No markdown, no explanation.`;
  } else if (action === "cta_suggestions") {
    prompt = `Generate 6 punchy, action-oriented call-to-action button texts for "${campaignName}".
Return ONLY a JSON array of 6 strings like ["Shop Pure Cotton", "Explore Veshtis Now", "Claim 10% Off"]. No markdown.`;
  } else if (action === "rewrite") {
    prompt = `Rewrite and polish the following email marketing copy for JAI SRI RAM TEXTILES to make it more ${tone}, engaging, and professional:
"""
${existingText}
"""
Keep paragraphs short, conversational, and persuasive. Return only the revised text.`;
  } else {
    // body_copy
    prompt = `Write a short, engaging, 3-paragraph marketing email body for JAI SRI RAM TEXTILES campaign "${campaignName}".
Theme: ${topic || campaignName}.
${productContext}
${offerContext}
Tone: ${tone}.
Use {{first_name}} merge tag for customer greeting.
Return only the email body text.`;
  }

  if (!apiKey) {
    // Return sensible fallback presets if Groq API key is not active
    if (action === "subject_lines") {
      return {
        result: [
          `✨ Special Handloom Collection: ${campaignName}`,
          `🔥 Don't Miss Out: Exclusive Festive Offers Inside!`,
          `🌸 Pure Cotton Elegance — Crafted on Traditional Looms`,
          `🎁 Handcrafted for You: Special Savings on Authentic Veshtis`,
          `🛍️ Celebrate in Style with Jai Sri Ram Textiles`,
        ],
      };
    } else if (action === "preview_text") {
      return {
        result: [
          "Discover our finest handloom weaves before stock runs out.",
          "Enjoy pure combed cotton comfort and traditional zari borders.",
          "Special savings crafted for celebrations. Open to explore.",
          "Free shipping on orders above ₹699. Shop your favorites today.",
        ],
      };
    } else if (action === "cta_suggestions") {
      return {
        result: [
          "Explore Collection",
          "Shop Authentic Handlooms",
          "Claim Your Festive Offer",
          "Browse New Arrivals",
          "Shop Best Sellers",
          "Claim Discount Now",
        ],
      };
    } else {
      return {
        result: `Hello {{first_name}},\n\nWe are delighted to share our latest handcrafted collections with you from our looms in Komarapalayam, Tamil Nadu. Every piece is woven with 100% pure combed cotton and finished with traditional zari borders.\n\nWhether preparing for temple visits, festive occasions, or daily comfort, our dhotis, towels, and scarfs are made to elevate your experience.\n\nExplore our catalog today and enjoy fast nationwide delivery!`,
      };
    }
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          { role: "system", content: "You are an expert ecommerce marketing copywriter." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq API error ${res.status}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "";

    if (action === "subject_lines" || action === "preview_text" || action === "cta_suggestions") {
      try {
        const cleaned = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return { result: parsed };
      } catch {
        const lines = rawContent.split("\n").map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").replace(/^["']|["']$/g, "").trim()).filter(Boolean);
        return { result: lines.slice(0, 5) };
      }
    }

    return { result: rawContent };
  } catch (err: any) {
    console.error("AI marketing generator failed:", err);
    return {
      result: action === "subject_lines"
        ? [`✨ Exclusive Offer: ${campaignName}`, `🌸 New Handlooms Just Arrived`]
        : `Hello {{first_name}}, discover the authentic handloom collection at JAI SRI RAM TEXTILES.`
    };
  }
}
