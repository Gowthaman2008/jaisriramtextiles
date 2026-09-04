import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function GET(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp, { prefix: "support_track", maxRequests: 30, windowSeconds: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const queryEmail = searchParams.get("email")?.trim().toLowerCase();

    if (!id) {
      return NextResponse.json({ error: "Query ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("support_messages")
      .select("id, user_id, name, email, subject, message, status, reply_message, replied_at, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "No inquiry found with this ID. Please check the spelling or format." }, { status: 404 });
    }

    // Check authorization: Admin/Staff OR owner user OR matching email validation
    let isAuthorized = false;

    try {
      const userClient = await createClient();
      const { data: { user } } = await userClient.auth.getUser();

      if (user) {
        // Check if admin/staff
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile && ["admin", "staff"].includes(profile.role)) {
          isAuthorized = true;
        } else if (data.user_id === user.id || (user.email && data.email.toLowerCase() === user.email.toLowerCase())) {
          isAuthorized = true;
        }
      }
    } catch {
      // User session lookup error
    }

    // Allow lookup if caller passed matching email
    if (!isAuthorized && queryEmail && queryEmail === data.email.toLowerCase()) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access to this support ticket." }, { status: 403 });
    }

    // Fetch replies for this message
    const { data: replies } = await supabase
      .from("support_message_replies")
      .select("*")
      .eq("message_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      ...data,
      replies: replies || [],
    });
  } catch (error: any) {
    console.error("Track support message error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
