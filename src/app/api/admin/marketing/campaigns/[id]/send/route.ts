import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { evaluateAudience } from "@/lib/marketing/segmentation-engine";
import { processCampaignBatch } from "@/lib/marketing/queue-worker";
import { substituteMergeTags, injectTracking, sendMarketingEmail } from "@/lib/marketing/email-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // 1. Fetch campaign from DB or app_settings fallback
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

    // 3. Attempt DB table queueing
    let dbQueueWorked = false;
    try {
      await supabase
        .from("email_campaign_recipients")
        .delete()
        .eq("campaign_id", id)
        .eq("status", "queued");

      const recipientRows = eligibleRecipients.map((r) => ({
        campaign_id: id,
        user_id: r.userId || null,
        email: r.email,
        name: r.fullName || null,
        status: "queued",
        retry_count: 0,
        created_at: new Date().toISOString(),
      }));

      const chunkSize = 500;
      for (let i = 0; i < recipientRows.length; i += chunkSize) {
        const chunk = recipientRows.slice(i, i + chunkSize);
        const { error: insertErr } = await supabase.from("email_campaign_recipients").insert(chunk);
        if (insertErr) throw insertErr;
      }
      dbQueueWorked = true;
    } catch (tableErr) {
      console.warn("Recipient table batch insert skipped/fallback:", tableErr);
    }

    // 4. Update campaign status
    try {
      await supabase
        .from("email_campaigns")
        .update({
          status: "sending",
          sent_at: new Date().toISOString(),
          total_recipients: eligibleRecipients.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } catch {}

    // Fallback status update in app_settings
    try {
      const { data: existingSettings } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stored_email_campaigns")
        .maybeSingle();

      const stored: any[] = Array.isArray(existingSettings?.value) ? existingSettings.value : [];
      const idx = stored.findIndex((c: any) => c.id === id);
      if (idx >= 0) {
        stored[idx] = {
          ...stored[idx],
          status: "sending",
          sent_at: new Date().toISOString(),
          total_recipients: eligibleRecipients.length,
          updated_at: new Date().toISOString(),
        };
        await supabase.from("app_settings").upsert({
          key: "stored_email_campaigns",
          value: stored,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {}

    // 5. Trigger dispatch
    if (dbQueueWorked) {
      processCampaignBatch(id, 30).catch((err) => {
        console.error("Queue worker error:", err);
      });
    } else {
      // Direct broadcast loop in background
      (async () => {
        let sentCount = 0;
        for (const recipient of eligibleRecipients) {
          try {
            const recipientCtx = {
              userId: recipient.userId,
              email: recipient.email,
              firstName: recipient.fullName?.split(" ")[0] || "Customer",
              city: recipient.city,
              state: recipient.state,
              totalOrders: recipient.totalOrders,
              totalSpendingRupees: recipient.totalSpendingRupees,
            };

            const personalizedSubject = substituteMergeTags(campaign.subject, recipientCtx, { campaignId: id });
            let personalizedHtml = substituteMergeTags(campaign.content_html || "", recipientCtx, { campaignId: id });
            personalizedHtml = injectTracking(personalizedHtml, { campaignId: id, recipientId: recipient.userId || id });

            await sendMarketingEmail({
              to: recipient.email,
              subject: personalizedSubject,
              html: personalizedHtml,
              fromName: campaign.sender_name,
              fromEmail: campaign.sender_email,
              replyTo: campaign.reply_to,
            });
            sentCount++;
          } catch (sendErr) {
            console.error("Failed to send email to", recipient.email, sendErr);
          }
        }

        // Mark as sent in app_settings
        try {
          const { data: existingSettings } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "stored_email_campaigns")
            .maybeSingle();

          const stored: any[] = Array.isArray(existingSettings?.value) ? existingSettings.value : [];
          const idx = stored.findIndex((c: any) => c.id === id);
          if (idx >= 0) {
            stored[idx].status = "sent";
            stored[idx].sent_count = sentCount;
            stored[idx].updated_at = new Date().toISOString();
            await supabase.from("app_settings").upsert({
              key: "stored_email_campaigns",
              value: stored,
              updated_at: new Date().toISOString(),
            });
          }
        } catch {}
      })().catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: `Campaign is now broadcasting to ${eligibleRecipients.length} recipients.`,
      totalRecipients: eligibleRecipients.length,
      unsubscribedExcluded: audienceResult.unsubscribedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
