import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import cloudinary from "@/lib/cloudinary";
import type { UploadApiResponse } from "cloudinary";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB cap

export async function POST(request: Request) {
  try {
    // 1. Verify user is logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const productId = formData.get("productId") as string;
    const orderId = formData.get("orderId") as string;
    const ratingStr = formData.get("rating") as string;
    const title = (formData.get("title") as string) || "";
    const body = (formData.get("body") as string) || "";

    if (!productId || !orderId || !ratingStr) {
      return NextResponse.json({ error: "Product ID, Order ID, and Rating are required" }, { status: 400 });
    }

    const rating = parseInt(ratingStr, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // 3. Verify order status is delivered and belongs to user
    const { data: order, error: orderErr } = await serviceClient
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }

    if (order.status !== "delivered") {
      return NextResponse.json({ error: "Reviews are only allowed after delivery" }, { status: 400 });
    }

    // 4. Collect uploaded files and upload to Cloudinary
    const fileEntries = formData.getAll("files");
    const photoUrls: string[] = [];

    for (const fileEntry of fileEntries) {
      if (fileEntry instanceof File) {
        if (!fileEntry.type.startsWith("image/")) {
          return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
        }
        if (fileEntry.size > MAX_FILE_BYTES) {
          return NextResponse.json({ error: "File size exceeds the 4MB limit" }, { status: 400 });
        }

        const buffer = Buffer.from(await fileEntry.arrayBuffer());

        // Upload to Cloudinary
        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "jai-sri-ram-textiles/reviews" },
            (error, uploadResult) => {
              if (error || !uploadResult) return reject(error);
              resolve(uploadResult);
            }
          );
          stream.end(buffer);
        });

        photoUrls.push(result.secure_url);
      }
    }

    // 5. Insert review into database
    // Defaulting to status 'approved' so users see their reviews immediately
    const { data: review, error: reviewErr } = await serviceClient
      .from("reviews")
      .insert({
        product_id: productId,
        user_id: user.id,
        order_id: orderId,
        rating,
        title: title.trim() || null,
        body: body.trim() || null,
        status: "approved"
      })
      .select("id")
      .single();

    if (reviewErr || !review) {
      throw reviewErr || new Error("Failed to save review");
    }

    // 6. Insert review photos if any
    if (photoUrls.length > 0) {
      const photoRows = photoUrls.map(url => ({
        review_id: review.id,
        url
      }));

      const { error: photoErr } = await serviceClient
        .from("review_photos")
        .insert(photoRows);

      if (photoErr) throw photoErr;
    }

    return NextResponse.json({ success: true, reviewId: review.id });
  } catch (error: any) {
    console.error("Review Submit Error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit review" }, { status: 500 });
  }
}
