import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UploadApiResponse } from "cloudinary";
import cloudinary from "@/lib/cloudinary";

// Allow uploads up to 50MB (videos / high-res images)
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // 1. Verify admin/staff role
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse form file
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Only image (PNG, JPG, WEBP) or video (MP4, WebM, MOV) files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 50MB limit" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Upload to Cloudinary with automatic resource_type (image or video)
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "jai-sri-ram-textiles/hero-slides",
          resource_type: "auto",
        },
        (error, uploadResult) => {
          if (error || !uploadResult) return reject(error);
          resolve(uploadResult);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      mediaType: result.resource_type || (isVideo ? "video" : "image"),
      format: result.format,
      duration: result.duration,
      width: result.width,
      height: result.height,
    });
  } catch (error: any) {
    console.error("Cloudinary CMS Media Upload Error:", error);
    return NextResponse.json(
      { error: error.message || "Media upload failed" },
      { status: 500 }
    );
  }
}
