import { createServiceClient } from "@/lib/supabase/admin";

export interface ReviewVerificationResult {
  isValid: boolean;
  confidence: number;
  reason: string;
  detectedPlatform?: string;
  detectedRating?: number;
}

/**
 * Optimizes Cloudinary URL for faster AI Vision processing & lower token usage
 */
function optimizeImageUrl(url: string): string {
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/w_1000,c_limit,q_auto:good/");
  }
  return url;
}

/**
 * Extracts and parses JSON from AI output
 */
function extractJsonFromAiResponse(rawText: string): any | null {
  if (!rawText) return null;
  // Strip thought blocks and markdown fences
  const cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/gi, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Analyzes a single image using Groq Vision models (Qwen 2.5/3 Vision)
 */
async function verifySingleScreenshot(options: {
  imageUrl: string;
  index: number;
  platform: string;
  orderReference?: string;
  apiKey: string;
}): Promise<ReviewVerificationResult> {
  const { imageUrl, index, platform, orderReference, apiKey } = options;
  const optimizedUrl = optimizeImageUrl(imageUrl);

  const visionModels = [
    "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b",
  ];

  const systemPrompt = `You are a strict AI Review Verification System for JAI SRI RAM TEXTILES.
The user uploaded this image as Screenshot ${index + 1} to claim a ₹100 Gift Card reward for leaving a positive review on ${platform.toUpperCase()}${orderReference ? ` (Platform Order ID: ${orderReference})` : ""}.

CRITICAL VERIFICATION RULES:
1. REJECT (isValid: false) if the image is:
   - A random photo, landscape, personal selfie, or scenery.
   - A logo, company banner, promotional poster, or meme.
   - A blank, black, or unreadable screenshot.
   - A product catalog image or product photo with no user rating or written review.
   - A payment receipt or invoice that does NOT contain a customer review or rating.

2. ACCEPT (isValid: true) if the image shows:
   - An e-commerce or Google review screen (Amazon, Flipkart, Google Reviews, etc.).
   - A star rating interface (e.g. 4 or 5 stars).
   - A submitted review text or "Review submitted / pending approval / Live" confirmation.
   - An order details screen displaying the customer's rating/feedback.

Respond ONLY with a JSON object in this exact format (no other text, no markdown):
{"isValid": false, "confidence": 0.95, "reason": "The uploaded image is a random photo, not an online review screenshot."}`;

  for (const model of visionModels) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: systemPrompt },
                { type: "image_url", image_url: { url: optimizedUrl } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || "";
        const parsed = extractJsonFromAiResponse(rawContent);

        if (parsed && typeof parsed.isValid === "boolean") {
          return {
            isValid: parsed.isValid,
            confidence: Number(parsed.confidence) || 0.9,
            reason: parsed.reason || (parsed.isValid ? `Screenshot ${index + 1} verified as valid review.` : `Screenshot ${index + 1} is not a valid review screenshot.`),
            detectedPlatform: parsed.detectedPlatform || platform,
            detectedRating: parsed.detectedRating,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[ai-verifier] Model ${model} failed on image ${index + 1}:`, err.message);
    }
  }

  // If AI API was unreachable, strictly reject rather than allowing fake photos
  return {
    isValid: false,
    confidence: 0,
    reason: `Screenshot ${index + 1} could not be verified by AI Vision. Please upload a clear review screenshot.`,
  };
}

/**
 * Verifies all uploaded review screenshots using AI Vision.
 * If any uploaded image is NOT a review screenshot, the claim is rejected.
 */
export async function verifyReviewScreenshotsWithAI(options: {
  imageUrls: string[];
  platform: string;
  orderReference?: string;
}): Promise<ReviewVerificationResult> {
  const { imageUrls, platform, orderReference } = options;

  if (!imageUrls || imageUrls.length === 0) {
    return {
      isValid: false,
      confidence: 0,
      reason: "No review images provided for AI verification.",
    };
  }

  // 1. Retrieve Groq or AI API key
  let apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "groq_api_key")
        .maybeSingle();

      if (data?.value) {
        apiKey = typeof data.value === "string" ? data.value : data.value.apiKey || data.value.key || data.value.api_key;
      }
    } catch (e) {
      console.warn("[ai-verifier] Error checking app_settings for API key:", e);
    }
  }

  if (!apiKey) {
    return {
      isValid: false,
      confidence: 0,
      reason: "AI review verification service is currently unavailable. Please contact support.",
    };
  }

  // 2. Verify each uploaded screenshot with AI Vision
  for (let i = 0; i < imageUrls.length; i++) {
    const singleResult = await verifySingleScreenshot({
      imageUrl: imageUrls[i],
      index: i,
      platform,
      orderReference,
      apiKey,
    });

    if (!singleResult.isValid) {
      return {
        isValid: false,
        confidence: singleResult.confidence,
        reason: `Screenshot ${i + 1} rejected by AI: ${singleResult.reason}`,
        detectedPlatform: singleResult.detectedPlatform,
      };
    }
  }

  return {
    isValid: true,
    confidence: 0.95,
    reason: `All ${imageUrls.length} screenshot(s) verified successfully as authentic review proof!`,
    detectedPlatform: platform,
  };
}
