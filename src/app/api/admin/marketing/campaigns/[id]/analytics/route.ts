import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { evaluateAudience } from "@/lib/marketing/segmentation-engine";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // 1. Fetch campaign
    let campaign: any = null;
    try {
      const { data: dbCampaign } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (dbCampaign) campaign = dbCampaign;
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

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // 2. Fetch recipient status counts
    const { data: recipients } = await supabase
      .from("email_campaign_recipients")
      .select("status, sent_at, delivered_at, opened_at, clicked_at, bounced_at, unsubscribed_at")
      .eq("campaign_id", id);

    const recs = recipients || [];

    let total = recs.length;
    let queued = recs.filter((r) => r.status === "queued").length;
    let sent = recs.filter((r) => r.sent_at || r.status === "sent" || r.status === "delivered" || r.status === "opened" || r.status === "clicked").length;
    let delivered = recs.filter((r) => r.delivered_at || r.status === "delivered" || r.status === "opened" || r.status === "clicked").length;
    let opened = recs.filter((r) => r.opened_at || r.status === "opened" || r.status === "clicked").length;
    let clicked = recs.filter((r) => r.clicked_at || r.status === "clicked").length;
    let bounced = recs.filter((r) => r.status === "bounced").length;
    let failed = recs.filter((r) => r.status === "failed").length;
    let unsubscribed = recs.filter((r) => r.status === "unsubscribed").length;

    // Fallback calculation if email_campaign_recipients is empty
    if (total === 0) {
      const storedCount = campaign.total_recipients || campaign.sent_count || campaign.delivered_count || 0;
      if (storedCount > 0) {
        total = storedCount;
        sent = campaign.sent_count || storedCount;
        delivered = campaign.delivered_count || storedCount;
        opened = campaign.opened_count || 0;
        clicked = campaign.clicked_count || 0;
        bounced = campaign.bounced_count || 0;
        failed = campaign.failed_count || 0;
        unsubscribed = campaign.unsubscribed_count || 0;
      } else {
        try {
          const audRes = await evaluateAudience({
            audienceType: campaign.audience_type || "all_users",
            segmentId: campaign.segment_id,
            filterRules: campaign.filter_rules,
            selectedUserIds: campaign.selected_user_ids,
          });
          const count = audRes.totalEligible || audRes.recipients.length || 0;
          total = count;
          sent = campaign.status === "sent" ? count : 0;
          delivered = campaign.status === "sent" ? count : 0;
          opened = campaign.opened_count || 0;
          clicked = campaign.clicked_count || 0;
          bounced = campaign.bounced_count || 0;
          failed = campaign.failed_count || 0;
          unsubscribed = campaign.unsubscribed_count || 0;
        } catch {}
      }
    }

    const deliveryRate = sent > 0 ? ((delivered || sent - failed - bounced) / sent) * 100 : (campaign.status === "sent" ? 100 : 0);
    const openRate = delivered > 0 ? (opened / delivered) * 100 : sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
    const unsubscribeRate = sent > 0 ? (unsubscribed / sent) * 100 : 0;

    return NextResponse.json({
      campaign,
      metrics: {
        total,
        queued,
        sent,
        delivered: delivered || Math.max(0, sent - failed - bounced),
        opened,
        clicked,
        bounced,
        failed,
        unsubscribed,
        deliveryRate: Number(deliveryRate.toFixed(1)),
        openRate: Number(openRate.toFixed(1)),
        clickRate: Number(clickRate.toFixed(1)),
        bounceRate: Number(bounceRate.toFixed(1)),
        unsubscribeRate: Number(unsubscribeRate.toFixed(1)),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
