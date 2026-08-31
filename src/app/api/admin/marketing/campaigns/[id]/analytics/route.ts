import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // 1. Fetch campaign
    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // 2. Fetch recipient status counts
    const { data: recipients } = await supabase
      .from("email_campaign_recipients")
      .select("status, sent_at, delivered_at, opened_at, clicked_at, bounced_at, unsubscribed_at")
      .eq("campaign_id", id);

    const recs = recipients || [];

    const total = recs.length;
    const queued = recs.filter((r) => r.status === "queued").length;
    const sent = recs.filter((r) => r.sent_at || r.status === "sent" || r.status === "delivered" || r.status === "opened" || r.status === "clicked").length;
    const delivered = recs.filter((r) => r.delivered_at || r.status === "delivered" || r.status === "opened" || r.status === "clicked").length;
    const opened = recs.filter((r) => r.opened_at || r.status === "opened" || r.status === "clicked").length;
    const clicked = recs.filter((r) => r.clicked_at || r.status === "clicked").length;
    const bounced = recs.filter((r) => r.status === "bounced").length;
    const failed = recs.filter((r) => r.status === "failed").length;
    const unsubscribed = recs.filter((r) => r.status === "unsubscribed").length;

    const deliveryRate = sent > 0 ? ((delivered || sent - failed - bounced) / sent) * 100 : 0;
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
