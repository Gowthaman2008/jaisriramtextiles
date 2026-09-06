import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = (searchParams.get("platform") || "").toLowerCase().trim();
    const orderId = (searchParams.get("orderId") || "").trim();

    if (platform === "google") {
      return NextResponse.json({ valid: true, isGoogle: true });
    }

    if (!orderId) {
      return NextResponse.json({ valid: false, error: "Order ID is required." }, { status: 400 });
    }

    if (!["amazon", "flipkart"].includes(platform)) {
      return NextResponse.json({ valid: false, error: "Platform must be Amazon or Flipkart." }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // 1. Check in platform_orders table
    const { data: record, error } = await serviceClient
      .from("platform_orders")
      .select("id, platform, order_id, status, claimed_at")
      .eq("platform", platform)
      .ilike("order_id", orderId)
      .maybeSingle();

    if (error) {
      console.error("[verify-order] DB query error:", error);
      return NextResponse.json({ valid: false, error: "Error verifying order ID. Please try again." }, { status: 500 });
    }

    if (!record) {
      return NextResponse.json({
        valid: false,
        exists: false,
        error: `Order ID "${orderId}" is not in our verified ${platform === "amazon" ? "Amazon" : "Flipkart"} database. Please verify your Order ID or contact support if your order was placed recently.`,
      });
    }

    if (record.status === "claimed") {
      return NextResponse.json({
        valid: false,
        exists: true,
        claimed: true,
        error: `This ${platform === "amazon" ? "Amazon" : "Flipkart"} Order ID has already been used to claim a gift card. Each order ID can only be claimed once.`,
      });
    }

    if (record.status === "disabled") {
      return NextResponse.json({
        valid: false,
        exists: true,
        error: "This Order ID has been disabled by store admin.",
      });
    }

    return NextResponse.json({
      valid: true,
      exists: true,
      claimed: false,
      message: `✓ Verified ${platform === "amazon" ? "Amazon" : "Flipkart"} Order ID`,
    });
  } catch (err: any) {
    console.error("[verify-order] Unexpected error:", err);
    return NextResponse.json({ valid: false, error: err.message || "Failed to verify order" }, { status: 500 });
  }
}
