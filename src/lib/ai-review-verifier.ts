import { createServiceClient } from "@/lib/supabase/admin";

export interface ReviewVerificationResult {
  isValid: boolean;
  confidence: number;
  reason: string;
  detectedPlatform?: string;
  detectedRating?: number | null;
  detectedContent?: string;
}

interface ApiKeys {
  geminiApiKey?: string;
  groqApiKey?: string;
  openaiApiKey?: string;
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
 * Downloads image and converts to Base64 with mime type
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = res.headers.get("content-type") || (imageUrl.endsWith(".png") ? "image/png" : "image/jpeg");
    return {
      base64: buffer.toString("base64"),
      mimeType,
    };
  } catch (err: any) {
    console.warn("[ai-verifier] Failed to fetch image as base64:", err.message);
    return null;
  }
}

/**
 * Builds the strict verification prompt based on platform and screenshot position
 */
function buildVerificationPrompt(options: {
  index: number;
  total: number;
  platform: string;
  orderReference?: string;
}): string {
  const { index, total, platform, orderReference } = options;
  const platformUpper = platform.toUpperCase();
  const isGoogle = platform.toLowerCase() === "google";
  const isScreenshot1 = index === 0;

  return `You are the strict automated AI Vision Review Inspector for JAI SRI RAM TEXTILES.
Your task is to inspect the uploaded image and verify whether it meets the store's review reward guidelines.

TARGET PLATFORM: ${platformUpper} (Amazon / Flipkart / Google Reviews)
SCREENSHOT: Screenshot ${index + 1} of ${total}
${orderReference ? `EXPECTED ORDER ID / REF: ${orderReference}` : ""}

STRICT VERIFICATION CRITERIA:

1. REJECT IMMEDIATELY (isValid: false):
- The image is a random photograph (e.g. selfies, faces of people, cars, animals, pets, memes, food, landscapes, nature, products without any review interface, random wallpapers).
- The image is a screenshot of an UNRELATED application (e.g. WhatsApp chats, Instagram, Telegram, TikTok, YouTube, games, calculator, file manager).
- The image is a pure delivery invoice, shipping slip, or tracking page ONLY, without any product review or rating interface.
- The rating is explicitly negative (1-star, 2-star, or 3-star rating). The reward requires a 4-star or 5-star positive review.
- The screenshot is from a completely wrong platform (e.g. user selected Amazon but uploaded a Google or Flipkart screenshot).
- The image is completely blank, solid color, black screen, unreadable, or blurry.

2. ACCEPT AS VALID (isValid: true):
For AMAZON:
${
  isScreenshot1
    ? `- Screenshot 1 must show the Amazon rating & review form: rating stars (4 or 5 stars selected), review title/description input box, "Write a review" screen, or product feedback form for items like dhotis, veshti, towels, or textiles.`
    : `- Screenshot 2 must show Amazon review submission proof: "Review Submitted" / green checkmark, "Review your purchases" list, or submitted review visible under user orders/reviews.`
}

For FLIPKART:
${
  isScreenshot1
    ? `- Screenshot 1 must show Flipkart rating stars (4 or 5 stars), review comments, "Rate Product" screen, or aspect ratings (Quality, Design, Fabric).`
    : `- Screenshot 2 must show Flipkart review submitted confirmation, "Thank you for the review!", or posted review visible in Flipkart app/website.`
}

For GOOGLE REVIEWS:
- Must show Google Maps or Google Search review interface for "Jai Sri Ram Textiles" (or textile shop) with 5 gold stars, review feedback text, "Posting publicly", or "Thanks for your review / contribution" screen.

RETURN ONLY VALID JSON WITH THIS EXACT FORMAT (No markdown fences, no conversational text):
{
  "isValid": true or false,
  "confidence": number between 0.0 and 1.0,
  "detectedPlatform": "amazon" | "flipkart" | "google" | "other" | "none",
  "detectedRating": number of stars (1-5) or null,
  "detectedContent": "Brief description of what is visible in the image (e.g. 'Amazon 5-star review form', 'Selfie of a person', 'Photo of a dog', 'Flipkart review submission confirmation')",
  "reason": "Clear explanation of why this screenshot was approved or rejected based on the criteria above"
}`;
}

/**
 * Verify screenshot using Google Gemini Vision
 */
async function verifyWithGemini(
  imageUrl: string,
  prompt: string,
  apiKey: string
): Promise<ReviewVerificationResult | null> {
  try {
    const imageData = await fetchImageAsBase64(imageUrl);
    if (!imageData) return null;

    const geminiModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

    for (const model of geminiModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: imageData.mimeType,
                      data: imageData.base64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: "application/json",
            },
          }),
          signal: AbortSignal.timeout(18000),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const parsed = extractJsonFromAiResponse(rawText);

          if (parsed && typeof parsed.isValid === "boolean") {
            return {
              isValid: Boolean(parsed.isValid),
              confidence: Number(parsed.confidence) || 0.95,
              reason: String(parsed.reason || (parsed.isValid ? "Verified as valid review screenshot." : "Rejected: Image does not meet review guidelines.")),
              detectedPlatform: parsed.detectedPlatform,
              detectedRating: parsed.detectedRating,
              detectedContent: parsed.detectedContent,
            };
          }
        }
      } catch (modelErr: any) {
        console.warn(`[ai-verifier] Gemini model ${model} error:`, modelErr.message);
      }
    }
  } catch (err: any) {
    console.warn("[ai-verifier] Gemini verification failed:", err.message);
  }
  return null;
}

/**
 * Verify screenshot using Groq Vision
 */
async function verifyWithGroq(
  imageUrl: string,
  prompt: string,
  apiKey: string
): Promise<ReviewVerificationResult | null> {
  const optimizedUrl = optimizeImageUrl(imageUrl);
  const groqModels = [
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview",
    "meta-llama/llama-4-scenic-17b-preview",
    "llama-3.2-11b-vision",
    "llama-3.2-90b-vision",
  ];

  for (const model of groqModels) {
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
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: optimizedUrl } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 350,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || "";
        const parsed = extractJsonFromAiResponse(rawContent);

        if (parsed && typeof parsed.isValid === "boolean") {
          return {
            isValid: Boolean(parsed.isValid),
            confidence: Number(parsed.confidence) || 0.95,
            reason: String(parsed.reason || (parsed.isValid ? "Verified as valid review screenshot." : "Rejected: Image does not meet review guidelines.")),
            detectedPlatform: parsed.detectedPlatform,
            detectedRating: parsed.detectedRating,
            detectedContent: parsed.detectedContent,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[ai-verifier] Groq model ${model} error:`, err.message);
    }
  }

  return null;
}

/**
 * Verify screenshot using OpenAI Vision
 */
async function verifyWithOpenAI(
  imageUrl: string,
  prompt: string,
  apiKey: string
): Promise<ReviewVerificationResult | null> {
  const optimizedUrl = optimizeImageUrl(imageUrl);
  const models = ["gpt-4o-mini", "gpt-4o"];

  for (const model of models) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: optimizedUrl } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 350,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(16000),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || "";
        const parsed = extractJsonFromAiResponse(rawContent);

        if (parsed && typeof parsed.isValid === "boolean") {
          return {
            isValid: Boolean(parsed.isValid),
            confidence: Number(parsed.confidence) || 0.95,
            reason: String(parsed.reason || (parsed.isValid ? "Verified as valid review screenshot." : "Rejected: Image does not meet review guidelines.")),
            detectedPlatform: parsed.detectedPlatform,
            detectedRating: parsed.detectedRating,
            detectedContent: parsed.detectedContent,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[ai-verifier] OpenAI model ${model} error:`, err.message);
    }
  }

  return null;
}

/**
 * Analyzes a single image using all available AI Vision engines
 */
async function verifySingleScreenshot(options: {
  imageUrl: string;
  index: number;
  total: number;
  platform: string;
  orderReference?: string;
  apiKeys: ApiKeys;
}): Promise<ReviewVerificationResult> {
  const { imageUrl, index, total, platform, orderReference, apiKeys } = options;
  const prompt = buildVerificationPrompt({ index, total, platform, orderReference });

  // 1. Try Gemini Vision first
  if (apiKeys.geminiApiKey) {
    const geminiResult = await verifyWithGemini(imageUrl, prompt, apiKeys.geminiApiKey);
    if (geminiResult) return geminiResult;
  }

  // 2. Try Groq Vision
  if (apiKeys.groqApiKey) {
    const groqResult = await verifyWithGroq(imageUrl, prompt, apiKeys.groqApiKey);
    if (groqResult) return groqResult;
  }

  // 3. Try OpenAI Vision
  if (apiKeys.openaiApiKey) {
    const openAiResult = await verifyWithOpenAI(imageUrl, prompt, apiKeys.openaiApiKey);
    if (openAiResult) return openAiResult;
  }

  // If no AI key was configured or all AI calls failed, reject safely with instructions
  return {
    isValid: false,
    confidence: 0,
    reason: `Screenshot ${index + 1} could not be verified by AI Vision. Please ensure your image is a clear, uncropped screenshot of your submitted ${platform.toUpperCase()} review.`,
  };
}

/**
 * Verifies all uploaded review screenshots concurrently using AI Vision.
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

  // Retrieve AI API keys from environment and database settings
  const apiKeys: ApiKeys = {
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  };

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["gemini_api_key", "groq_api_key", "openai_api_key", "ai_api_key", "ai_settings"]);

    if (data && Array.isArray(data)) {
      for (const row of data) {
        const val = typeof row.value === "string" ? row.value : row.value?.apiKey || row.value?.key || row.value?.api_key;
        if (row.key === "gemini_api_key" && !apiKeys.geminiApiKey && val) apiKeys.geminiApiKey = val;
        if (row.key === "groq_api_key" && !apiKeys.groqApiKey && val) apiKeys.groqApiKey = val;
        if (row.key === "openai_api_key" && !apiKeys.openaiApiKey && val) apiKeys.openaiApiKey = val;
        if (row.key === "ai_api_key" && !apiKeys.groqApiKey && val) apiKeys.groqApiKey = val;
      }
    }
  } catch (e) {
    console.warn("[ai-verifier] Error checking app_settings for API keys:", e);
  }

  // Verify each screenshot independently
  const verificationResults = await Promise.all(
    imageUrls.map((url, i) =>
      verifySingleScreenshot({
        imageUrl: url,
        index: i,
        total: imageUrls.length,
        platform,
        orderReference,
        apiKeys,
      })
    )
  );

  // Check if any screenshot was rejected
  for (let i = 0; i < verificationResults.length; i++) {
    const singleResult = verificationResults[i];
    if (!singleResult.isValid) {
      const contentDesc = singleResult.detectedContent ? ` Detected: "${singleResult.detectedContent}".` : "";
      return {
        isValid: false,
        confidence: singleResult.confidence,
        reason: `Screenshot ${i + 1} rejected.${contentDesc} ${singleResult.reason}`,
        detectedPlatform: singleResult.detectedPlatform,
        detectedContent: singleResult.detectedContent,
      };
    }
  }

  return {
    isValid: true,
    confidence: 0.98,
    reason: `All ${imageUrls.length} screenshot(s) verified successfully as authentic review proof!`,
    detectedPlatform: platform,
  };
}
