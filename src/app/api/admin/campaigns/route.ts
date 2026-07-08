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

// GET: list all campaigns with product & variant details
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data: campaigns, error } = await supabase
      .from("free_product_campaigns")
      .select(`
        *,
        product:products(id, name, price_paise, slug, product_images(url)),
        variant:product_variants(id, size, color, sku, stock)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error("Fetch campaigns error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: create a campaign
export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      title,
      display_name,
      product_id,
      variant_id,
      target_amount_paise,
      starts_at,
      expires_at,
      enable_announcement,
      custom_announcement_message,
      is_active
    } = await request.json();

    if (!title || !product_id || target_amount_paise === undefined) {
      return NextResponse.json({ error: "Title, Product, and Target Amount are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("free_product_campaigns")
      .insert({
        title: title.trim(),
        display_name: display_name ? display_name.trim() : null,
        product_id,
        variant_id: variant_id || null,
        target_amount_paise: Number(target_amount_paise),
        starts_at: starts_at || null,
        expires_at: expires_at || null,
        enable_announcement: enable_announcement !== undefined ? Boolean(enable_announcement) : true,
        custom_announcement_message: custom_announcement_message ? custom_announcement_message.trim() : null,
        is_active: is_active !== undefined ? Boolean(is_active) : true
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: update or toggle active state
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      id,
      title,
      display_name,
      product_id,
      variant_id,
      target_amount_paise,
      starts_at,
      expires_at,
      enable_announcement,
      custom_announcement_message,
      is_active
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = title.trim();
    if (display_name !== undefined) updatePayload.display_name = display_name ? display_name.trim() : null;
    if (product_id !== undefined) updatePayload.product_id = product_id;
    if (variant_id !== undefined) updatePayload.variant_id = variant_id || null;
    if (target_amount_paise !== undefined) updatePayload.target_amount_paise = Number(target_amount_paise);
    if (starts_at !== undefined) updatePayload.starts_at = starts_at || null;
    if (expires_at !== undefined) updatePayload.expires_at = expires_at || null;
    if (enable_announcement !== undefined) updatePayload.enable_announcement = Boolean(enable_announcement);
    if (custom_announcement_message !== undefined) {
      updatePayload.custom_announcement_message = custom_announcement_message ? custom_announcement_message.trim() : null;
    }
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

    const { data, error } = await supabase
      .from("free_product_campaigns")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Update campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: delete campaign
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("free_product_campaigns")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
