import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function checkAdminAuth() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

// GET: Fetch all CMS items (carousel slides and banners)
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const [slidesRes, bannersRes] = await Promise.all([
      supabase.from("carousel_slides").select("*").order("sort_order", { ascending: true }),
      supabase.from("banners").select("*"),
    ]);

    if (slidesRes.error) throw slidesRes.error;
    if (bannersRes.error) throw bannersRes.error;

    return NextResponse.json({
      slides: slidesRes.data || [],
      banners: bannersRes.data || [],
    });
  } catch (error: any) {
    console.error("Fetch CMS error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add or update Hero slide or Announcement banner
export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, action } = body; // type = 'slide' | 'banner'

    const supabase = createServiceClient();

    if (type === "slide") {
      const { id, eyebrow, title, subtitle, cta_label, cta_href, image_url, sort_order, is_active } = body;

      if (action === "delete") {
        if (!id) return NextResponse.json({ error: "Slide ID required for delete" }, { status: 400 });
        const { error } = await supabase.from("carousel_slides").delete().eq("id", id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      if (id) {
        // Update slide
        const { error } = await supabase
          .from("carousel_slides")
          .update({ eyebrow, title, subtitle, cta_label, cta_href, image_url, sort_order, is_active })
          .eq("id", id);
        if (error) throw error;
      } else {
        // Add slide
        const { error } = await supabase
          .from("carousel_slides")
          .insert({ eyebrow, title, subtitle, cta_label, cta_href, image_url, sort_order: sort_order || 0, is_active: is_active !== undefined ? is_active : true });
        if (error) throw error;
      }
    } else if (type === "banner") {
      const { id, placement, content, is_active } = body;

      if (id) {
        // Update banner
        const { error } = await supabase
          .from("banners")
          .update({ placement, content, is_active })
          .eq("id", id);
        if (error) throw error;
      } else {
        // Create banner
        const { error } = await supabase
          .from("banners")
          .insert({ placement, content, is_active: is_active !== undefined ? is_active : true });
        if (error) throw error;
      }
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save CMS item error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
