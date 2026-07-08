import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

// Utility to verify admin/staff role
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

// GET: Fetch all reviews with customer profiles, products, orders, and photos
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        title,
        body,
        status,
        is_featured,
        created_at,
        profiles (
          id,
          user_id,
          full_name,
          email,
          phone
        ),
        products (
          id,
          name,
          slug
        ),
        orders (
          id,
          order_number
        ),
        review_photos (
          id,
          url
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(reviews);
  } catch (error: any) {
    console.error("Fetch admin reviews error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Edit review rating, title, body, status, or featured state
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, rating, title, body, status, is_featured } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const updatePayload: any = {};
    if (rating !== undefined) updatePayload.rating = rating;
    if (title !== undefined) updatePayload.title = title || null;
    if (body !== undefined) updatePayload.body = body || null;
    if (status !== undefined) updatePayload.status = status;
    if (is_featured !== undefined) updatePayload.is_featured = is_featured;
    updatePayload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("reviews")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update admin review error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove customer review
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete admin review error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
