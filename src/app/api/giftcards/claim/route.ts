import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import cloudinary from "@/lib/cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { generateGiftCardCode } from "@/lib/gift-cards";
import { verifyReviewScreenshotsWithAI } from "@/lib/ai-review-verifier";
import { sendEmail, giftCardIssuedEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB limit per screenshot

async function uploadToCloudinary(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "jai-sri-ram-textiles/giftcard-reviews",
        resource_type: "image",
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Cloudinary upload failed"));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
  return uploadResult.secure_url;
}

// GET: Check user claim eligibility (e.g. check if Google Review has already been claimed)
export async function GET() {
  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, googleClaimed: false, googleCard: null });
    }

    const serviceClient = createServiceClient();
    const { data: googleCard } = await serviceClient
      .from("gift_cards")
      .select("id, code, created_at, status")
      .eq("user_id", user.id)
      .ilike("platform", "%google%")
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      googleClaimed: !!googleCard,
      googleCard: googleCard || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Verify user authentication
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to upload your review screenshot and claim your ₹100 gift card." }, { status: 401 });
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const file1 = formData.get("screenshot1") as File | null || formData.get("screenshot") as File | null;
    const file2 = formData.get("screenshot2") as File | null;
    const platform = ((formData.get("platform") as string) || "amazon").toLowerCase();
    const orderReference = ((formData.get("orderReference") as string) || "").trim();
    const notes = (formData.get("notes") as string) || "";
    const isGoogle = platform === "google";

    const serviceClient = createServiceClient();
    let verifiedPlatformOrderId: string | null = null;

    // 3. Specific validation for Google Reviews vs Amazon / Flipkart
    if (isGoogle) {
      // Check 1-time limit for Google Reviews per account
      const { data: existingGoogle } = await serviceClient
        .from("gift_cards")
        .select("id, code, created_at")
        .eq("user_id", user.id)
        .ilike("platform", "%google%")
        .limit(1)
        .maybeSingle();

      if (existingGoogle) {
        return NextResponse.json({
          error: `You have already claimed a ₹100 Gift Card for Google Reviews (Code: ${existingGoogle.code}). Google Review reward is strictly limited to 1 time per account.`
        }, { status: 400 });
      }

      // For Google Reviews: only 1 screenshot is required, platform order ID is NOT required
      if (!file1 || !(file1 instanceof File)) {
        return NextResponse.json({
          error: "Please upload your Google Review screenshot."
        }, { status: 400 });
      }

      if (!file1.type.startsWith("image/")) {
        return NextResponse.json({ error: "Uploaded screenshot must be a valid image (PNG, JPG, JPEG, WEBP)" }, { status: 400 });
      }

      if (file1.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "Screenshot file exceeds the 5MB size limit." }, { status: 400 });
      }
    } else {
      // For Amazon / Flipkart: Platform Order ID is compulsory & must be verified in platform_orders database
      if (!orderReference) {
        return NextResponse.json({
          error: "Platform Order ID is compulsory. Please enter your Platform Order ID."
        }, { status: 400 });
      }

      // Check verified Order ID in platform_orders table
      const { data: matchedOrder, error: orderLookupErr } = await serviceClient
        .from("platform_orders")
        .select("id, platform, order_id, status, claimed_by, claimed_at")
        .eq("platform", platform)
        .ilike("order_id", orderReference)
        .maybeSingle();

      if (orderLookupErr) {
        console.error("[giftcards/claim] Error looking up platform_orders:", orderLookupErr);
      }

      if (!matchedOrder) {
        return NextResponse.json({
          error: `Order ID "${orderReference}" is not found in our verified ${platform === "amazon" ? "Amazon" : "Flipkart"} database. Please ensure you entered the exact Order ID registered with admin.`,
        }, { status: 400 });
      }

      if (matchedOrder.status === "claimed") {
        return NextResponse.json({
          error: `This ${platform === "amazon" ? "Amazon" : "Flipkart"} Order ID ("${orderReference}") has already been used to claim a gift card. Each order ID can only be claimed once.`,
        }, { status: 400 });
      }

      if (matchedOrder.status === "disabled") {
        return NextResponse.json({
          error: `This Order ID is disabled. Please contact support.`,
        }, { status: 400 });
      }

      // Also check if gift_cards table already has this order_reference
      const { data: duplicateInGiftCards } = await serviceClient
        .from("gift_cards")
        .select("id, code")
        .eq("platform", platform)
        .ilike("order_reference", orderReference)
        .maybeSingle();

      if (duplicateInGiftCards) {
        return NextResponse.json({
          error: `This ${platform} Order ID has already been used to generate a gift card (Code: ${duplicateInGiftCards.code}).`,
        }, { status: 400 });
      }

      verifiedPlatformOrderId = matchedOrder.id;

      // Check 2 screenshots required for Amazon / Flipkart
      if (!file1 || !(file1 instanceof File) || !file2 || !(file2 instanceof File)) {
        return NextResponse.json({
          error: "Both screenshots are required. Please upload Screenshot 1 and Screenshot 2 to proceed."
        }, { status: 400 });
      }

      if (!file1.type.startsWith("image/") || !file2.type.startsWith("image/")) {
        return NextResponse.json({ error: "Both uploaded files must be valid images (PNG, JPG, JPEG, WEBP)" }, { status: 400 });
      }

      if (file1.size > MAX_FILE_BYTES || file2.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "One or both screenshot files exceed the 5MB size limit." }, { status: 400 });
      }
    }

    // 4. Upload screenshots to Cloudinary
    let screenshotUrls: string[] = [];
    try {
      if (isGoogle && (!file2 || !(file2 instanceof File))) {
        // Single screenshot upload for Google Review
        const url = await uploadToCloudinary(file1);
        screenshotUrls = [url];
      } else {
        // Parallel upload
        const filesToUpload = [file1, file2].filter((f): f is File => f instanceof File);
        screenshotUrls = await Promise.all(filesToUpload.map((f) => uploadToCloudinary(f)));
      }
    } catch (uploadErr: any) {
      console.error("[giftcards/claim] Cloudinary upload error:", uploadErr);
      return NextResponse.json({ error: "Failed to upload review screenshot. Please try again." }, { status: 500 });
    }

    // Combine URLs as comma-separated string
    const combinedScreenshotUrl = screenshotUrls.join(",");

    // 5. Verify review authenticity using AI Vision
    const aiVerification = await verifyReviewScreenshotsWithAI({
      imageUrls: screenshotUrls,
      platform,
      orderReference,
    });

    if (!aiVerification.isValid) {
      return NextResponse.json({
        isAiVerificationFailed: true,
        error: `AI Verification Failed: ${aiVerification.reason || "The uploaded screenshot does not appear to be a valid review. Please ensure you upload clear screenshot(s) of your submitted review."}`,
        aiReason: aiVerification.reason || "Uploaded image is not a recognized review screenshot.",
      }, { status: 400 });
    }

    // 6. Generate unique ₹100 Gift Card Code
    let giftCode = generateGiftCardCode("JSRT-100");

    // Check collision just in case
    for (let attempts = 0; attempts < 5; attempts++) {
      const { data: existing } = await serviceClient
        .from("gift_cards")
        .select("id")
        .eq("code", giftCode)
        .maybeSingle();

      if (!existing) break;
      giftCode = generateGiftCardCode("JSRT-100");
    }

    // Calculate 1 year expiry date (365 days from issuance)
    const oneYearExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // 6. Store gift card record in database
    const { data: giftCard, error: insertErr } = await serviceClient
      .from("gift_cards")
      .insert({
        code: giftCode,
        amount_paise: 10000, // ₹100
        status: "active",
        platform: platform,
        review_screenshot_url: combinedScreenshotUrl,
        order_reference: orderReference || null,
        created_by: user.id,
        user_id: user.id,
        expires_at: oneYearExpiry,
        notes: notes.trim() || (isGoogle ? "Generated via 1 Google Review screenshot (1-time reward, 1-year validity)" : `Generated via 2 review screenshots (${platform} Order: ${orderReference}, 1-year validity)`),
        is_one_time: true,
      })
      .select("*")
      .single();

    if (insertErr || !giftCard) {
      console.error("[giftcards/claim] Database insert error:", insertErr);
      return NextResponse.json({ error: insertErr?.message || "Failed to generate gift card in database" }, { status: 500 });
    }

    // 7. Mark the platform_orders record as claimed
    if (verifiedPlatformOrderId) {
      await serviceClient
        .from("platform_orders")
        .update({
          status: "claimed",
          claimed_by: user.id,
          claimed_at: new Date().toISOString(),
          gift_card_id: giftCard.id,
        })
        .eq("id", verifiedPlatformOrderId);
    }

    // 8. Send Gift Card Email to the User
    try {
      let recipientEmail = user.email;
      let recipientName = user.user_metadata?.full_name || user.user_metadata?.name;

      if (!recipientEmail || !recipientName) {
        const { data: profile } = await serviceClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          if (!recipientEmail && profile.email) recipientEmail = profile.email;
          if (!recipientName && profile.full_name) recipientName = profile.full_name;
        }
      }

      recipientName = recipientName || recipientEmail?.split("@")[0] || "Valued Customer";

      if (recipientEmail) {
        console.log(`[giftcards/claim] Sending gift card email to ${recipientEmail} for code ${giftCard.code}...`);
        await sendEmail({
          to: recipientEmail,
          subject: `🎉 Here is your ₹100 Gift Card Code (${giftCard.code}) — JAI SRI RAM TEXTILES`,
          html: giftCardIssuedEmailHtml({
            name: recipientName,
            code: giftCard.code,
            amountRupees: 100,
            platform,
            expiresAt: giftCard.expires_at,
          }),
        });
        console.log(`[giftcards/claim] Gift card email sent successfully to ${recipientEmail}`);
      } else {
        console.warn("[giftcards/claim] No recipient email found for user ID:", user.id);
      }
    } catch (emailErr) {
      console.error("[giftcards/claim] Failed to send gift card email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Gift card generated and emailed successfully!",
      giftCard: {
        id: giftCard.id,
        code: giftCard.code,
        amount_paise: giftCard.amount_paise,
        amount_rupees: giftCard.amount_paise / 100,
        status: giftCard.status,
        platform: giftCard.platform,
        screenshot_url: giftCard.review_screenshot_url,
        screenshot_urls: screenshotUrls,
        expires_at: giftCard.expires_at,
        created_at: giftCard.created_at,
      },
    });
  } catch (err: any) {
    console.error("[giftcards/claim] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 });
  }
}
