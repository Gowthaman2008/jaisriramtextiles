import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { evaluateAudience } from "@/lib/marketing/segmentation-engine";
import { processCampaignBatch } from "@/lib/marketing/queue-worker";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // 1. Fetch campaign
    const { data: campaign, error: campErr } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status === "sending") {
      return NextResponse.json({ error: "Campaign is already being dispatched" }, { status: 400 });
    }

    // 2. Evaluate audience
    const audienceResult = await evaluateAudience({
      audienceType: campaign.audience_type,
      segmentId: campaign.segment_id,
      filterRules: campaign.filter_rules,
      selectedUserIds: campaign.selected_user_ids,
    });

    const eligibleRecipients = audienceResult.recipients;

    if (eligibleRecipients.length === 0) {
      return NextResponse.json({
        error: "No eligible recipients found matching the campaign's audience criteria.",
      }, { status: 400 });
    }

    // 3. Clear any existing draft/queued recipients for this campaign to prevent duplicates
    await supabase
      .from("email_campaign_recipients")
      .delete()
      .eq("campaign_id", id)
      .eq("status", "queued");

    // 4. Batch insert into email_campaign_recipients
    const recipientRows = eligibleRecipients.map((r) => ({
      campaign_id: id,
      user_id: r.userId || null,
      email: r.email,
      name: r.fullName || null,
      status: "queued",
      retry_count: 0,
      created_at: new Date().toISOString(),
    }));

    // Insert in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < recipientRows.length; i += chunkSize) {
      const chunk = recipientRows.slice(i, i + chunkSize);
      await supabase.from("email_campaign_recipients").insert(chunk);
    }

    // 5. Update campaign status to 'sending' and set total_recipients
    await supabase
      .from("email_campaigns")
      .update({
        status: "sending",
        sent_at: new Date().toISOString(),
        total_recipients: eligibleRecipients.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        action: "campaign.send",
        entity: "email_campaigns",
        entity_id: id,
        meta: {
          total_recipients: eligibleRecipients.length,
          unsubscribed_excluded: audienceResult.unsubscribedCount,
        },
      });
    } catch {}

    // 6. Asynchronously trigger the queue worker to process the first batch
    processCampaignBatch(id, 30).catch((err) => {
      console.error("Queue worker initial batch error:", err);
    });

    return NextResponse.json({
      success: true,
      message: `Campaign is now sending to ${eligibleRecipients.length} recipients.`,
      totalRecipients: eligibleRecipients.length,
      unsubscribedExcluded: audienceResult.unsubscribedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
