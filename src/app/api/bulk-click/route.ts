import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * POST /api/bulk-click
 * Records a click on one of the 3 bulk-enquiry contact buttons.
 * Public endpoint — no auth required (fire-and-forget from the frontend).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { button_type } = body;

    if (!button_type || !["call", "whatsapp", "email"].includes(button_type)) {
      return NextResponse.json(
        { error: "Invalid button_type. Must be call, whatsapp, or email." },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent") || null;
    const referrer = request.headers.get("referer") || null;

    const supabase = createServiceClient();
    const { error } = await supabase.from("bulk_enquiry_clicks").insert({
      button_type,
      user_agent: userAgent,
      referrer,
    });

    if (error) {
      console.error("Failed to record bulk enquiry click:", error);
      return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Bulk click POST error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

/**
 * GET /api/bulk-click
 * Returns aggregated click counts for all 3 button types.
 * Admin-only endpoint.
 */
export async function GET(request: Request) {
  try {
    // Check admin auth
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Get all clicks
    const { data: allClicks, error } = await supabase
      .from("bulk_enquiry_clicks")
      .select("button_type, clicked_at");

    if (error) {
      console.error("Failed to fetch bulk enquiry clicks:", error);
      return NextResponse.json({ error: "Failed to fetch clicks" }, { status: 500 });
    }

    const now = new Date();

    // IST today start
    const istFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = istFormatter.formatToParts(now);
    const getVal = (type: string) => parts.find(p => p.type === type)!.value;
    const todayIST = new Date(`${getVal("year")}-${getVal("month")}-${getVal("day")}T00:00:00.000+05:30`);

    // This week start (Monday)
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(todayIST.getTime() - diffToMonday * 24 * 60 * 60 * 1000);

    // This month start
    const monthStart = new Date(`${getVal("year")}-${getVal("month")}-01T00:00:00.000+05:30`);

    const buttonTypes = ["call", "whatsapp", "email"] as const;

    const result: Record<string, { total: number; today: number; week: number; month: number }> = {};

    for (const type of buttonTypes) {
      const filtered = (allClicks || []).filter((c: any) => c.button_type === type);
      const total = filtered.length;
      const today = filtered.filter((c: any) => new Date(c.clicked_at) >= todayIST).length;
      const week = filtered.filter((c: any) => new Date(c.clicked_at) >= weekStart).length;
      const month = filtered.filter((c: any) => new Date(c.clicked_at) >= monthStart).length;

      result[type] = { total, today, week, month };
    }

    const grandTotal = (allClicks || []).length;

    return NextResponse.json({ clicks: result, grandTotal });
  } catch (err: any) {
    console.error("Bulk click GET error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
