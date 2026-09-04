import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { evaluateAudience } from "@/lib/marketing/segmentation-engine";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").toLowerCase().trim();
    const status = url.searchParams.get("status") || "all";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const exportCsv = url.searchParams.get("export") === "true";

    const supabase = createServiceClient();

    let query = supabase
      .from("email_campaign_recipients")
      .select("*", { count: "exact" })
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: dbRecipients } = await query;

    let allRows: any[] = dbRecipients || [];

    // Fallback: If no rows in email_campaign_recipients table, dynamically synthesize from campaign audience
    if (allRows.length === 0) {
      let campaign: any = null;
      try {
        const { data: dbCamp } = await supabase
          .from("email_campaigns")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (dbCamp) campaign = dbCamp;
      } catch {}

      if (!campaign) {
        const { data: settingsData } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "stored_email_campaigns")
          .maybeSingle();
        const stored: any[] = Array.isArray(settingsData?.value) ? settingsData.value : [];
        campaign = stored.find((c: any) => c.id === id);
      }

      if (campaign) {
        try {
          const audienceResult = await evaluateAudience({
            audienceType: campaign.audience_type || "all_users",
            segmentId: campaign.segment_id,
            filterRules: campaign.filter_rules,
            selectedUserIds: campaign.selected_user_ids,
          });

          const sentDate = campaign.sent_at || campaign.created_at || new Date().toISOString();
          const isSent = campaign.status === "sent" || !!campaign.sent_at;

          allRows = audienceResult.recipients.map((r, idx) => ({
            id: r.userId || `rec-${idx + 1}`,
            campaign_id: id,
            user_id: r.userId || null,
            email: r.email,
            name: r.fullName || "Customer",
            status: isSent ? "delivered" : "queued",
            sent_at: isSent ? sentDate : null,
            delivered_at: isSent ? sentDate : null,
            opened_at: null,
            clicked_at: null,
            error_message: null,
          }));
        } catch (audErr) {
          console.error("Audience fallback eval error:", audErr);
        }
      }
    }

    // Load open/click events from app_settings tracking store and merge
    try {
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "marketing_tracking_events")
        .maybeSingle();

      const trackingEvents = settingsData?.value?.[id] || {};

      allRows = allRows.map((r) => {
        const emailKey = (r.email || "").toLowerCase().trim();
        const ev = trackingEvents[emailKey];
        if (ev) {
          const openedAt = r.opened_at || ev.opened_at;
          const clickedAt = r.clicked_at || ev.clicked_at;
          const status = clickedAt ? "clicked" : openedAt ? "opened" : r.status;
          return {
            ...r,
            opened_at: openedAt,
            clicked_at: clickedAt,
            status,
          };
        }
        return r;
      });
    } catch {}

    // Apply search and status filter
    let filteredRows = allRows;
    if (search) {
      filteredRows = filteredRows.filter(
        (r) =>
          (r.email && r.email.toLowerCase().includes(search)) ||
          (r.name && r.name.toLowerCase().includes(search))
      );
    }
    if (status && status !== "all") {
      filteredRows = filteredRows.filter((r) => r.status === status);
    }

    if (exportCsv) {
      let csv = "Recipient Email,Name,Status,Sent At,Delivered At,Opened At,Clicked At,Error Message\n";
      filteredRows.forEach((r: any) => {
        csv += `"${r.email || ""}","${r.name || ""}","${r.status || ""}","${r.sent_at || ""}","${r.delivered_at || ""}","${r.opened_at || ""}","${r.clicked_at || ""}","${(r.error_message || "").replace(/"/g, '""')}"\n`;
      });

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="campaign-${id}-recipients.csv"`,
        },
      });
    }

    const total = filteredRows.length;
    const from = (page - 1) * limit;
    const paged = filteredRows.slice(from, from + limit);

    return NextResponse.json({
      recipients: paged,
      total,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();
    const action = body.action || "mark_opened";
    const nowIso = new Date().toISOString();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Update email_campaign_recipients table
    try {
      await supabase
        .from("email_campaign_recipients")
        .update({
          status: action === "mark_clicked" ? "clicked" : "opened",
          opened_at: nowIso,
          clicked_at: action === "mark_clicked" ? nowIso : undefined,
        })
        .eq("campaign_id", id)
        .ilike("email", email);
    } catch {}

    // 2. Update app_settings tracking events
    try {
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "marketing_tracking_events")
        .maybeSingle();

      const trackingEvents: Record<string, Record<string, any>> = settingsData?.value || {};
      if (!trackingEvents[id]) {
        trackingEvents[id] = {};
      }

      const existing = trackingEvents[id][email] || {};
      trackingEvents[id][email] = {
        ...existing,
        email,
        opened_at: existing.opened_at || nowIso,
        clicked_at: action === "mark_clicked" ? (existing.clicked_at || nowIso) : existing.clicked_at,
        open_count: (existing.open_count || 0) + 1,
        last_opened_at: nowIso,
      };

      await supabase.from("app_settings").upsert({
        key: "marketing_tracking_events",
        value: trackingEvents,
        updated_at: nowIso,
      });

      // Update stored_email_campaigns
      const { data: campSettings } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stored_email_campaigns")
        .maybeSingle();

      const storedCamps: any[] = Array.isArray(campSettings?.value) ? campSettings.value : [];
      const campIdx = storedCamps.findIndex((c: any) => c.id === id);
      if (campIdx >= 0) {
        storedCamps[campIdx] = {
          ...storedCamps[campIdx],
          opened_count: Object.keys(trackingEvents[id]).length,
          unique_opens_count: Object.keys(trackingEvents[id]).length,
          updated_at: nowIso,
        };
        await supabase.from("app_settings").upsert({
          key: "stored_email_campaigns",
          value: storedCamps,
          updated_at: nowIso,
        });
      }
    } catch {}

    // 3. Update email_campaigns DB table
    try {
      const { data: camp } = await supabase
        .from("email_campaigns")
        .select("opened_count, unique_opens_count")
        .eq("id", id)
        .maybeSingle();

      if (camp) {
        await supabase
          .from("email_campaigns")
          .update({
            opened_count: (camp.opened_count || 0) + 1,
            unique_opens_count: (camp.unique_opens_count || 0) + 1,
            updated_at: nowIso,
          })
          .eq("id", id);
      }
    } catch {}

    return NextResponse.json({ success: true, email, action, timestamp: nowIso });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
