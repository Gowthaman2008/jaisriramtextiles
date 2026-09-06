import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import cloudinary from "@/lib/cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { generateGiftCardCode } from "@/lib/gift-cards";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB limit for screenshots

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
    const file = formData.get("screenshot") as File | null;
    const platform = (formData.get("platform") as string) || "amazon";
    const orderReference = (formData.get("orderReference") as string) || "";
    const notes = (formData.get("notes") as string) || "";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Please upload your review submitted screenshot" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Uploaded file must be a valid image (PNG, JPG, WEBP)" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Screenshot file size exceeds 5MB limit" }, { status: 400 });
    }

    // 3. Upload screenshot to Cloudinary
    let screenshotUrl = "";
    try {
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
      screenshotUrl = uploadResult.secure_url;
    } catch (uploadErr: any) {
      console.error("[giftcards/claim] Cloudinary upload error:", uploadErr);
      return NextResponse.json({ error: "Failed to upload review screenshot. Please try again." }, { status: 500 });
    }

    // 4. Generate unique ₹100 Gift Card Code
    const serviceClient = createServiceClient();
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

    // 5. Store gift card record in database
    const { data: giftCard, error: insertErr } = await serviceClient
      .from("gift_cards")
      .insert({
        code: giftCode,
        amount_paise: 10000, // ₹100
        status: "active",
        platform: platform.toLowerCase(),
        review_screenshot_url: screenshotUrl,
        order_reference: orderReference.trim() || null,
        created_by: user.id,
        user_id: user.id,
        notes: notes.trim() || `Generated via review screenshot submission (${platform})`,
        is_one_time: true,
      })
      .select("*")
      .single();

    if (insertErr || !giftCard) {
      console.error("[giftcards/claim] Database insert error:", insertErr);
      return NextResponse.json({ error: insertErr?.message || "Failed to generate gift card in database" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Gift card generated successfully!",
      giftCard: {
        id: giftCard.id,
        code: giftCard.code,
        amount_paise: giftCard.amount_paise,
        amount_rupees: giftCard.amount_paise / 100,
        status: giftCard.status,
        platform: giftCard.platform,
        screenshot_url: giftCard.review_screenshot_url,
        created_at: giftCard.created_at,
      },
    });
  } catch (err: any) {
    console.error("[giftcards/claim] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 });
  }
}
