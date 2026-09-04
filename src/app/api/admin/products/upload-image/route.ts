import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { UploadApiResponse } from "cloudinary";
import cloudinary from "@/lib/cloudinary";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB cap for high-res images and videos

export const maxDuration = 60;

async function checkAdminAuth() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const adminClient = createServiceClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return null;
    }
    return user;
  } catch (err) {
    console.error("Auth check failed:", err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // 1. Verify admin/staff role
    const authUser = await checkAdminAuth();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized: Admin session expired or forbidden" }, { status: 401 });
    }

    // 2. Parse form file
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name || "";
    const fileType = file.type || "";

    const isImage = fileType.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(fileName);
    const isVideo = fileType.startsWith("video/") || /\.(mp4|webm|mov|ogg|mkv|m4v|avi)$/i.test(fileName);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Only image (PNG, JPG, WEBP) or video (MP4, WebM, MOV) files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB limit` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Upload to Cloudinary with explicit resource_type
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "jai-sri-ram-textiles/products",
          resource_type: isVideo ? "video" : "image",
        },
        (error, uploadResult) => {
          if (error) {
            console.error("Cloudinary upload_stream error:", error);
            return reject(error);
          }
          if (!uploadResult) {
            return reject(new Error("No upload result returned from Cloudinary"));
          }
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
    console.error("Cloudinary Admin Product Upload Error:", error);
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
