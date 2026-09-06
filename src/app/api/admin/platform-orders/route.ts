import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

// Admin auth guard
async function checkAdminAuth() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { authorized: false, error: "Unauthorized: Please sign in.", status: 401 };

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "staff"].includes(profile.role)) {
    return { authorized: false, error: "Forbidden: Admin access required.", status: 403 };
  }

  return { authorized: true, user, serviceClient };
}

// GET /api/admin/platform-orders
export async function GET(request: Request) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized || !auth.serviceClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const platform = searchParams.get("platform") || "all";
    const status = searchParams.get("status") || "all";

    const supabase = auth.serviceClient;

    // Base query with profiles and gift_cards joins
    let query = supabase
      .from("platform_orders")
      .select(`
        *,
        claimer:profiles!platform_orders_claimed_by_fkey(id, full_name, email, phone),
        gift_card:gift_cards!platform_orders_gift_card_id_fkey(id, code, amount_paise, status)
      `)
      .order("created_at", { ascending: false });

    if (platform !== "all") {
      query = query.eq("platform", platform.toLowerCase());
    }

    if (status !== "all") {
      query = query.eq("status", status.toLowerCase());
    }

    if (search.trim()) {
      const term = search.trim();
      query = query.or(`order_id.ilike.%${term}%,notes.ilike.%${term}%`);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("[admin/platform-orders] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate metrics
    const allQuery = await supabase.from("platform_orders").select("id, platform, status");
    const allRecords = allQuery.data || [];

    const metrics = {
      total: allRecords.length,
      available: allRecords.filter((r) => r.status === "available").length,
      claimed: allRecords.filter((r) => r.status === "claimed").length,
      amazonCount: allRecords.filter((r) => r.platform === "amazon").length,
      flipkartCount: allRecords.filter((r) => r.platform === "flipkart").length,
    };

    return NextResponse.json({
      success: true,
      orders: orders || [],
      metrics,
    });
  } catch (err: any) {
    console.error("[admin/platform-orders] Unexpected GET error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/platform-orders (Single or Bulk add)
export async function POST(request: Request) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized || !auth.serviceClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { platform = "amazon", order_id, raw_order_ids, notes } = body;

    const targetPlatform = platform.toLowerCase().trim();
    if (!["amazon", "flipkart"].includes(targetPlatform)) {
      return NextResponse.json({ error: "Platform must be either 'amazon' or 'flipkart'" }, { status: 400 });
    }

    // Collect all order IDs (supports single or raw textarea string with newlines/commas)
    let candidateIds: string[] = [];
    if (Array.isArray(body.order_ids)) {
      candidateIds = body.order_ids;
    } else if (raw_order_ids && typeof raw_order_ids === "string") {
      candidateIds = raw_order_ids
        .split(/[\r\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (order_id && typeof order_id === "string") {
      candidateIds = [order_id.trim()];
    }

    if (candidateIds.length === 0) {
      return NextResponse.json({ error: "Please provide at least one valid Order ID." }, { status: 400 });
    }

    // Deduplicate within the payload
    const uniqueIds = Array.from(new Set(candidateIds.map((id) => id.trim()).filter(Boolean)));

    const supabase = auth.serviceClient;

    // Check which ones already exist in database
    const { data: existingRecords } = await supabase
      .from("platform_orders")
      .select("order_id")
      .in("order_id", uniqueIds);

    const existingSet = new Set((existingRecords || []).map((r) => r.order_id.toLowerCase()));

    const newRows = uniqueIds
      .filter((id) => !existingSet.has(id.toLowerCase()))
      .map((id) => ({
        platform: targetPlatform,
        order_id: id,
        status: "available",
        notes: notes ? notes.trim() : null,
      }));

    if (newRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "All submitted Order IDs already exist in the database.",
        added: 0,
        skipped: uniqueIds.length,
      }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("platform_orders")
      .insert(newRows)
      .select("*");

    if (insertError) {
      console.error("[admin/platform-orders] Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${inserted.length} Order IDs for ${targetPlatform.toUpperCase()}.${uniqueIds.length - newRows.length > 0 ? ` (${uniqueIds.length - newRows.length} duplicates skipped)` : ""}`,
      added: inserted.length,
      skipped: uniqueIds.length - newRows.length,
      inserted,
    });
  } catch (err: any) {
    console.error("[admin/platform-orders] POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/platform-orders (Update notes or status)
export async function PUT(request: Request) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized || !auth.serviceClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Order ID record ID is required." }, { status: 400 });
    }

    const supabase = auth.serviceClient;
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes ? notes.trim() : null;

    const { data: updated, error } = await supabase
      .from("platform_orders")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[admin/platform-orders] PUT error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Order ID record updated successfully.",
      order: updated,
    });
  } catch (err: any) {
    console.error("[admin/platform-orders] PUT error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/platform-orders (Delete record)
export async function DELETE(request: Request) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized || !auth.serviceClient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Record ID is required to delete." }, { status: 400 });
    }

    const supabase = auth.serviceClient;
    const { error } = await supabase
      .from("platform_orders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[admin/platform-orders] DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Platform Order ID deleted successfully.",
    });
  } catch (err: any) {
    console.error("[admin/platform-orders] DELETE error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
