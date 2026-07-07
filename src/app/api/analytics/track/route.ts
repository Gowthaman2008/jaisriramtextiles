import { NextResponse, type NextRequest, userAgent } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { path, referrer, visitorId } = await request.json();
    if (!visitorId || !path) {
      return NextResponse.json({ error: "Missing visitorId or path" }, { status: 400 });
    }

    // Attempt to identify current logged-in user (optional)
    let userId: string | null = null;
    try {
      const userClient = await createServerClient();
      const { data: { user } } = await userClient.auth.getUser();
      if (user) userId = user.id;
    } catch (e) {
      // Ignore if session client fails (e.g. env vars missing or invalid session)
    }

    // Use service role client to bypass RLS for logging analytics
    const supabase = createServiceClient();

    // Parse User-Agent details
    const ua = userAgent(request);
    const deviceType = ua.device.type || "desktop";
    const browserName = ua.browser.name || "Unknown";
    const osName = ua.os.name || "Unknown";
    
    // Country header check
    const country = request.headers.get("x-vercel-ip-country") || "India";

    // 1. Fetch active session for this visitor_id in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: activeSession } = await supabase
      .from("sessions")
      .select("id, page_views")
      .eq("visitor_id", visitorId)
      .gt("last_seen_at", thirtyMinutesAgo)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let sessionId: string;

    if (activeSession) {
      sessionId = activeSession.id;
      // Update the active session
      const updateData: any = {
        last_seen_at: new Date().toISOString(),
        page_views: activeSession.page_views + 1,
      };
      if (userId) {
        updateData.user_id = userId; // associate user if logged in mid-session
      }
      await supabase
        .from("sessions")
        .update(updateData)
        .eq("id", sessionId);
    } else {
      // Insert new session
      const { data: newSession, error: sessionInsertError } = await supabase
        .from("sessions")
        .insert({
          visitor_id: visitorId,
          user_id: userId,
          device: deviceType,
          browser: browserName,
          os: osName,
          country: country,
          referrer: referrer || "Direct",
          page_views: 1,
          started_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (sessionInsertError || !newSession) {
        throw sessionInsertError || new Error("Failed to create tracking session");
      }
      sessionId = newSession.id;
    }

    // 2. Insert the page view
    await supabase
      .from("page_views")
      .insert({
        session_id: sessionId,
        path: path,
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    console.error("Tracking API Error:", error);
    return NextResponse.json({ error: "Internal tracking error" }, { status: 500 });
  }
}
