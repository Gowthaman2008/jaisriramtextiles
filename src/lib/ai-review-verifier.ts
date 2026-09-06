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
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview",
  ];

  const systemPrompt = `You are an expert AI Vision Review Verification System for JAI SRI RAM TEXTILES.
Your job is to inspect the uploaded image and determine if it is a REAL, GENUINE e-commerce or Google Maps review screenshot from Amazon, Flipkart, Google Reviews / Maps, or similar platforms.

VALID REFERENCE PATTERNS TO ACCEPT (isValid: true):

1. GOOGLE REVIEWS CONFIRMATION / POSTED SCREEN:
   - Header/URL: "search.google.com" or Google Maps app
   - Graphic: Colorful celebration confetti / dots (blue, orange, green, yellow shapes)
   - Heading: "Thanks for your post"
   - Subheading: "People like you make Maps more helpful"
   - Button: "Done" or "View your review"
   - Profile avatar with username (e.g. "Posting publicly across Google").

2. GOOGLE REVIEWS RATING & FEEDBACK FORM:
   - Header: "Jai Sri Ram Textiles" or business name, "search.google.com"
   - User info: Profile photo and "Posting publicly across Google"
   - 5 Yellow/Gold Stars selected (⭐⭐⭐⭐⭐ with label like "Exceptional", "Great", "Good")
   - Review text box or aspect prompts
   - Buttons: "Add photos", "Post".

3. FLIPKART REVIEW SUBMITTED:
   - Mascot illustration (person/man celebrating with confetti)
   - Heading: "Thank you for the review!"
   - Text: "Your valuable feedback helps India shop better everyday"
   - May show "More products to review" with other items below and blue "Close" button.

4. FLIPKART REVIEW FORM / SHARE EXPERIENCE:
   - Title: "Share your experience" or "Review this product"
   - 5 stars with emotion labels ("Terrible", "Bad", "Okay", "Good", "Great" with smiling star)
   - "Add photo/video" camera box ("The top 5% of our best reviewers usually add a photo/video")
   - Aspect ratings ("What did you love about it?": Quality, Design & Features, Look & Feel, Value for Money, Service)
   - Blue "Submit" button or "Tell us more" text field.

5. AMAZON REVIEW FORM:
   - Heading: "How was the item?" with product thumbnail
   - 5 orange/gold stars selected
   - Text fields: "Write a review", "Title your review", "Share a video or photo"
   - Yellow pill-shaped "Submit" button.

6. AMAZON REVIEW SUBMITTED / CONFIRMATION:
   - Green checkmark with "✓ Review Submitted"
   - Header: "Review Your Purchases" (even if it shows a progress circle like "And now the last one..." and list of other purchased items with unrated stars below).

REJECTION CRITERIA (isValid: false):
- Random personal selfies, scenery, animals, food, memes, wallpapers with no review UI.
- Bare product photos or marketing banners without ANY review UI, stars, submission message, or feedback form.
- Screenshots of unrelated apps (chat messengers, payment UPI screens, social media feeds without review content).

CRITICAL NOTE:
Always accept legitimate review confirmation screens or rating forms. If the image matches any of the above patterns, set isValid: true.

Respond ONLY with valid JSON in this exact structure:
{"isValid": true, "confidence": 0.98, "reason": "Verified as genuine Google/Amazon/Flipkart review screenshot.", "detectedPlatform": "${platform}"}`;

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
        signal: AbortSignal.timeout(25000),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || "";
        const parsed = extractJsonFromAiResponse(rawContent);

        if (parsed && typeof parsed.isValid === "boolean") {
          return {
            isValid: parsed.isValid,
            confidence: Number(parsed.confidence) || 0.95,
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
 * Verifies all uploaded review screenshots concurrently using AI Vision.
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

  // 2. Verify all screenshots concurrently in parallel
  const verificationResults = await Promise.all(
    imageUrls.map((url, i) =>
      verifySingleScreenshot({
        imageUrl: url,
        index: i,
        platform,
        orderReference,
        apiKey,
      })
    )
  );

  for (let i = 0; i < verificationResults.length; i++) {
    const singleResult = verificationResults[i];
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
    confidence: 0.98,
    reason: `All ${imageUrls.length} screenshot(s) verified successfully as authentic review proof!`,
    detectedPlatform: platform,
  };
}
