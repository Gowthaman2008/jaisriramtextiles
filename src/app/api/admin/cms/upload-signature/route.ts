import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import cloudinary from "@/lib/cloudinary";

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

export async function GET() {
  try {
    const authUser = await checkAdminAuth();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized: Admin session expired or forbidden" }, { status: 401 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "jai-sri-ram-textiles/hero-slides";

    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    });
  } catch (error: any) {
    console.error("Signature generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate upload signature" },
      { status: 500 }
    );
  }
}
