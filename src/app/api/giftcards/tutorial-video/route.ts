import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { checkAdminAuth } from "@/lib/admin-auth";
import cloudinary from "@/lib/cloudinary";
import type { UploadApiResponse } from "cloudinary";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SETTINGS_KEY = "giftcard_tutorial_video";

const DEFAULT_SETTINGS = {
  video_url: "",
  title: "How to Review on Amazon, Flipkart & Google for ₹100 Gift Card",
  description: "Follow these simple steps: leave your positive review, take the 2 required screenshots with your Order ID, and claim your instant ₹100 Gift Card!",
  enabled: true,
  updated_at: new Date().toISOString(),
};

/**
 * GET: Fetch the current tutorial video configuration (Public for /claim-giftcard)
 */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error || !data?.value) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    const settings = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    return NextResponse.json({
      ...DEFAULT_SETTINGS,
      ...settings,
    });
  } catch (err: any) {
    console.error("[tutorial-video GET] Error:", err);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

/**
 * POST: Upload video file or update tutorial video settings (Admin only)
 */
export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    const supabase = createServiceClient();

    // 1. Handle FormData (File upload or direct fields)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const videoFile = formData.get("video") as File | null;
      let videoUrl = (formData.get("video_url") as string) || "";
      const title = (formData.get("title") as string) || DEFAULT_SETTINGS.title;
      const description = (formData.get("description") as string) || DEFAULT_SETTINGS.description;
      const enabled = formData.get("enabled") !== "false";

      // If a video file was uploaded directly, stream it to Cloudinary as video
      if (videoFile && videoFile instanceof File && videoFile.size > 0) {
        if (!videoFile.type.startsWith("video/") && !videoFile.name.match(/\.(mp4|mov|webm|mkv|avi)$/i)) {
          return NextResponse.json({ error: "Please upload a valid video file (MP4, WebM, MOV)" }, { status: 400 });
        }

        const buffer = Buffer.from(await videoFile.arrayBuffer());
        const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "jai-sri-ram-textiles/tutorials",
              resource_type: "video",
              chunk_size: 6000000,
            },
            (err, result) => {
              if (err || !result) return reject(err || new Error("Cloudinary video upload failed"));
              resolve(result);
            }
          );
          stream.end(buffer);
        });

        videoUrl = uploadResult.secure_url;
      }

      const updatedSettings = {
        video_url: videoUrl.trim(),
        title: title.trim(),
        description: description.trim(),
        enabled,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from("app_settings")
        .upsert(
          {
            key: SETTINGS_KEY,
            value: updatedSettings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (upsertErr) {
        throw new Error(upsertErr.message);
      }

      return NextResponse.json({
        success: true,
        message: "Tutorial video settings updated successfully!",
        settings: updatedSettings,
      });
    }

    // 2. Handle JSON payload
    const body = await request.json();
    const videoUrl = typeof body.video_url === "string" ? body.video_url.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : DEFAULT_SETTINGS.title;
    const description = typeof body.description === "string" ? body.description.trim() : DEFAULT_SETTINGS.description;
    const enabled = body.enabled !== false;

    const updatedSettings = {
      video_url: videoUrl,
      title,
      description,
      enabled,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: SETTINGS_KEY,
          value: updatedSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (upsertErr) {
      throw new Error(upsertErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Tutorial video settings updated successfully!",
      settings: updatedSettings,
    });
  } catch (err: any) {
    console.error("[tutorial-video POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update tutorial video settings" }, { status: 500 });
  }
}
