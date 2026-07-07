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

// GET: Fetch all orders with items and profile info
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        profiles (full_name, email),
        order_items (*),
        order_events (*)
      `)
      .order("placed_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(orders);
  } catch (error: any) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Edit order status, tracking code, or shipping address
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      id,
      status,
      tracking_id,
      courier_tracking_url,
      shipping_address,
      note,
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Load original order to compare status
    const { data: originalOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", id)
      .single();

    // 1. Prepare fields to update
    const updateFields: any = {};
    if (status) updateFields.status = status;
    if (tracking_id !== undefined) updateFields.tracking_id = tracking_id || null;
    if (courier_tracking_url !== undefined) updateFields.courier_tracking_url = courier_tracking_url || null;
    if (shipping_address) updateFields.shipping_address = shipping_address;

    // 2. Perform update
    const { error: updateError } = await supabase
      .from("orders")
      .update(updateFields)
      .eq("id", id);

    if (updateError) throw updateError;

    // 3. Log event if status changed
    if (status && originalOrder && originalOrder.status !== status) {
      await supabase
        .from("order_events")
        .insert({
          order_id: id,
          status: status,
          note: note || `Order status updated to '${status}' by admin/staff`,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
