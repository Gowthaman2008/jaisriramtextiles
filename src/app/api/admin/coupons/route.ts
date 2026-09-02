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

// GET: list all coupons
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data: coupons, error } = await supabase
      .from("coupons")
      .select("*")
      .order("code", { ascending: true });

    if (error) throw error;
    return NextResponse.json(coupons);
  } catch (error: any) {
    console.error("Fetch coupons error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: create a coupon
export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code, type, value, min_order_paise, max_discount_paise, first_order_only, once_per_user, usage_limit, expires_at } = await request.json();

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: "Code, Type, and Value are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const insertPayload: any = {
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      min_order_paise: Number(min_order_paise || 0),
      max_discount_paise: max_discount_paise ? Number(max_discount_paise) : null,
      first_order_only: Boolean(first_order_only),
      once_per_user: Boolean(once_per_user),
      usage_limit: usage_limit ? Number(usage_limit) : null,
      expires_at: expires_at || null,
      is_active: true
    };

    let { data, error } = await supabase
      .from("coupons")
      .insert(insertPayload)
      .select()
      .single();

    if (error && (error.message?.includes("once_per_user") || error.code === "42703")) {
      delete insertPayload.once_per_user;
      const retry = await supabase
        .from("coupons")
        .insert(insertPayload)
        .select()
        .single();
      if (retry.error) throw retry.error;
      data = { ...retry.data, once_per_user: Boolean(once_per_user) };
    } else if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Create coupon error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: toggle active or update details
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, is_active, code, type, value, min_order_paise, max_discount_paise, first_order_only, once_per_user, usage_limit, expires_at } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const updatePayload: any = {};
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (code !== undefined) updatePayload.code = code.trim().toUpperCase();
    if (type !== undefined) updatePayload.type = type;
    if (value !== undefined) updatePayload.value = Number(value);
    if (min_order_paise !== undefined) updatePayload.min_order_paise = Number(min_order_paise);
    if (max_discount_paise !== undefined) updatePayload.max_discount_paise = max_discount_paise ? Number(max_discount_paise) : null;
    if (first_order_only !== undefined) updatePayload.first_order_only = Boolean(first_order_only);
    if (once_per_user !== undefined) updatePayload.once_per_user = Boolean(once_per_user);
    if (usage_limit !== undefined) updatePayload.usage_limit = usage_limit ? Number(usage_limit) : null;
    if (expires_at !== undefined) updatePayload.expires_at = expires_at || null;

    let { data, error } = await supabase
      .from("coupons")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error && (error.message?.includes("once_per_user") || error.code === "42703")) {
      delete updatePayload.once_per_user;
      const retry = await supabase
        .from("coupons")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (retry.error) throw retry.error;
      data = { ...retry.data, once_per_user: Boolean(once_per_user) };
    } else if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Update coupon error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: delete coupon
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    // Dissociate the coupon from any existing orders to avoid foreign key violations
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ coupon_id: null })
      .eq("coupon_id", id);

    if (updateErr) throw updateErr;

    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete coupon error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
