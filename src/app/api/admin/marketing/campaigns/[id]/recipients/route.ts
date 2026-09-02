import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { evaluateAudience } from "@/lib/marketing/segmentation-engine";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { data: dbRecipients, count: dbCount } = await query;

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

          // Apply in-memory search and status filtering if fallback
          if (search) {
            allRows = allRows.filter(
              (r) =>
                r.email.toLowerCase().includes(search) ||
                (r.name && r.name.toLowerCase().includes(search))
            );
          }

          if (status && status !== "all") {
            allRows = allRows.filter((r) => r.status === status);
          }
        } catch (audErr) {
          console.error("Audience fallback eval error:", audErr);
        }
      }
    }

    if (exportCsv) {
      let csv = "Recipient Email,Name,Status,Sent At,Delivered At,Opened At,Clicked At,Error Message\n";
      allRows.forEach((r: any) => {
        csv += `"${r.email || ""}","${r.name || ""}","${r.status || ""}","${r.sent_at || ""}","${r.delivered_at || ""}","${r.opened_at || ""}","${r.clicked_at || ""}","${(r.error_message || "").replace(/"/g, '""')}"\n`;
      });

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="campaign-${id}-recipients.csv"`,
        },
      });
    }

    const total = dbCount !== null && dbCount !== undefined && dbCount > 0 ? dbCount : allRows.length;
    const from = (page - 1) * limit;
    const paged = dbRecipients && dbRecipients.length > 0 ? dbRecipients : allRows.slice(from, from + limit);

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
