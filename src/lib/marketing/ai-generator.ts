import { createClient } from "@/lib/supabase/server";

export async function generateMarketingContent(options: {
  action: "subject_lines" | "preview_text" | "body_copy" | "cta_suggestions" | "rewrite";
  campaignName: string;
  topic?: string;
  tone?: string;
  existingText?: string;
  productNames?: string[];
  discountOffer?: string;
}): Promise<{ result: string | string[] }> {
  const { action, campaignName, topic, tone = "festive, authentic and premium", existingText, productNames = [], discountOffer } = options;

  let apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from("app_settings").select("value").eq("key", "groq_api_key").maybeSingle();
      if (data?.value) {
        apiKey = typeof data.value === "string" ? data.value : data.value.apiKey || data.value.key || data.value.api_key;
      }
    } catch (e) {
      console.warn("Could not check app_settings for Groq key:", e);
    }
  }

  const productContext = productNames.length > 0 ? `Featured products: ${productNames.join(", ")}.` : "";
  const offerContext = discountOffer ? `Offer details: ${discountOffer}.` : "";

  let systemPrompt = "You are an elite ecommerce marketing copywriter for JAI SRI RAM TEXTILES (a heritage handloom brand in Tamil Nadu, India, crafting pure combed cotton dhotis with real zari borders, towels, scarfs, and jute bags).";
  let prompt = "";

  if (action === "subject_lines") {
    prompt = `Generate 5 compelling, high-converting email subject lines for the campaign "${campaignName}".
Tone: ${tone}.
Topic/Theme: ${topic || campaignName}.
${productContext}
${offerContext}

Guidelines:
- Make them catchy, authentic, and tailored for handloom textiles and celebrations.
- Include tasteful emojis (e.g. ✨, 🌸, 🪔, 🎁, 🔥, 🛍️, 🥻) in some variations.
- Return ONLY a valid JSON array of 5 strings. Example: ["Subject 1", "Subject 2", "Subject 3", "Subject 4", "Subject 5"]
- Do NOT output any explanation, markdown, or text outside the JSON array.`;
  } else if (action === "preview_text") {
    prompt = `Generate 4 engaging preheader / preview texts (under 90 characters each) for an email campaign titled "${campaignName}".
${offerContext}
Return ONLY a valid JSON array of 4 strings. No markdown, no commentary.`;
  } else if (action === "cta_suggestions") {
    prompt = `Generate 6 punchy, action-oriented CTA button texts for "${campaignName}".
Return ONLY a valid JSON array of 6 strings like ["Shop Pure Cotton", "Explore Veshtis Now", "Claim 10% Off"]. No markdown.`;
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

  if (apiKey) {
    const modelsToTry = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
      "mixtral-8x7b-32768",
    ];

    for (const model of modelsToTry) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 600,
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          let rawContent = data.choices?.[0]?.message?.content || "";
          
          // Strip thinking tags from reasoning models
          rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

          if (action === "subject_lines" || action === "preview_text" || action === "cta_suggestions") {
            const jsonMatch = rawContent.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  return { result: parsed };
                }
              } catch (parseErr) {
                console.warn("JSON parse fallback for Groq output:", parseErr);
              }
            }

            // Fallback line-by-line parsing
            const lines = rawContent
              .split("\n")
              .map((l: string) => l.replace(/^[-*•\d+.\)]\s*/, "").replace(/^["'\[]|["'\]]$/g, "").trim())
              .filter((l: string) => l.length > 2 && !l.startsWith("{") && !l.startsWith("}"));
            if (lines.length > 0) {
              return { result: lines.slice(0, 5) };
            }
          }

          if (rawContent) {
            return { result: rawContent };
          }
        }
      } catch (callErr) {
        console.warn(`[Marketing AI] Error with model ${model}:`, callErr);
      }
    }
  }

  // Sensible fallback presets if Groq key is absent or all models fail
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
