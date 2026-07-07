import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, orderDeliveredEmailHtml } from "@/lib/email";

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
      rejection_reason,
      note,
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    if (status === "rejected" && !rejection_reason?.trim()) {
      return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Load original order to compare status (and enough detail to email on delivery)
    const { data: originalOrder } = await supabase
      .from("orders")
      .select("status, order_number, total_paise, profiles(email, full_name), order_items(name, variant, unit_price_paise, quantity)")
      .eq("id", id)
      .single();

    // 1. Prepare fields to update
    const updateFields: any = {};
    if (status) updateFields.status = status;
    if (tracking_id !== undefined) updateFields.tracking_id = tracking_id || null;
    if (courier_tracking_url !== undefined) updateFields.courier_tracking_url = courier_tracking_url || null;
    if (shipping_address) updateFields.shipping_address = shipping_address;
    if (rejection_reason !== undefined) updateFields.rejection_reason = rejection_reason?.trim() || null;

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
          note: status === "rejected" ? rejection_reason.trim() : (note || `Order status updated to '${status}' by admin/staff`),
        });

      // 4. Send delivery confirmation email on the pending -> delivered transition
      if (status === "delivered") {
        const profile = originalOrder.profiles as any;
        if (profile?.email) {
          await sendEmail({
            to: profile.email,
            subject: `Order Delivered — ${originalOrder.order_number} | JAI SRI RAM TEXTILES`,
            html: orderDeliveredEmailHtml({
              orderNumber: originalOrder.order_number,
              name: profile.full_name,
              items: originalOrder.order_items || [],
              totalPaise: originalOrder.total_paise,
            }),
          }).catch((err) => console.error("Delivery email failed:", err));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: permanently remove an order
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "Cannot delete: this order has a linked wallet transaction or review. Remove those first." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
