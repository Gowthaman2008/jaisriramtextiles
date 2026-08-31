import { createServiceClient } from "@/lib/supabase/admin";
import { substituteMergeTags, injectTracking, sendMarketingEmail } from "./email-service";

export async function processCampaignBatch(campaignId: string, batchSize: number = 30): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  isComplete: boolean;
}> {
  const supabase = createServiceClient();

  // 1. Fetch the campaign record
  const { data: campaign, error: campErr } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (campErr || !campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  if (campaign.status === "cancelled" || campaign.status === "paused") {
    return { processed: 0, succeeded: 0, failed: 0, isComplete: false };
  }

  // Update status to 'sending' if still 'scheduled' or 'draft'
  if (campaign.status !== "sending") {
    await supabase
      .from("email_campaigns")
      .update({ status: "sending", sent_at: campaign.sent_at || new Date().toISOString() })
      .eq("id", campaignId);
  }

  // 2. Fetch the next batch of queued recipients
  const { data: recipients, error: recipErr } = await supabase
    .from("email_campaign_recipients")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (recipErr) {
    throw new Error(`Failed to load recipients for campaign: ${recipErr.message}`);
  }

  if (!recipients || recipients.length === 0) {
    // No more queued recipients -> Mark campaign as 'sent'
    await supabase
      .from("email_campaigns")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    return { processed: 0, succeeded: 0, failed: 0, isComplete: true };
  }

  let succeeded = 0;
  let failed = 0;

  // 3. Process each recipient concurrently or in controlled sequence
  const sendPromises = recipients.map(async (recipient) => {
    try {
      // Mark as sending
      await supabase
        .from("email_campaign_recipients")
        .update({ status: "sending" })
        .eq("id", recipient.id);

      const nameParts = (recipient.name || "").trim().split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Substitute merge tags in subject, preview text, and HTML content
      const personalizedSubject = substituteMergeTags(
        campaign.subject,
        {
          email: recipient.email,
          firstName,
          lastName,
        },
        { campaignId: campaign.id, recipientId: recipient.id }
      );

      const personalizedHtml = substituteMergeTags(
        campaign.content_html || "<p>Hello from Jai Sri Ram Textiles</p>",
        {
          email: recipient.email,
          firstName,
          lastName,
        },
        { campaignId: campaign.id, recipientId: recipient.id }
      );

      // Inject open tracking pixel and click tracking links
      const finalHtmlWithTracking = injectTracking(personalizedHtml, {
        campaignId: campaign.id,
        recipientId: recipient.id,
        enableOpenTracking: true,
        enableClickTracking: true,
      });

      // Send the email via provider
      const sendResult = await sendMarketingEmail({
        to: recipient.email,
        subject: personalizedSubject,
        html: finalHtmlWithTracking,
        fromName: campaign.sender_name,
        fromEmail: campaign.sender_email,
        replyTo: campaign.reply_to,
        tags: [
          { name: "campaign_id", value: campaign.id },
          { name: "recipient_id", value: recipient.id },
        ],
      });

      if (sendResult.success) {
        await supabase
          .from("email_campaign_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: sendResult.messageId || null,
          })
          .eq("id", recipient.id);
        succeeded++;
      } else {
        await supabase
          .from("email_campaign_recipients")
          .update({
            status: "failed",
            error_message: sendResult.error || "Sending failed",
            retry_count: (recipient.retry_count || 0) + 1,
          })
          .eq("id", recipient.id);
        failed++;
      }
    } catch (err: any) {
      await supabase
        .from("email_campaign_recipients")
        .update({
          status: "failed",
          error_message: err.message || "Execution exception",
          retry_count: (recipient.retry_count || 0) + 1,
        })
        .eq("id", recipient.id);
      failed++;
    }
  });

  await Promise.all(sendPromises);

  // 4. Update campaign denormalized counters
  const { count: remainingQueued } = await supabase
    .from("email_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  const { count: totalSent } = await supabase
    .from("email_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "sent");

  const { count: totalFailed } = await supabase
    .from("email_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "failed");

  const isComplete = (remainingQueued || 0) === 0;

  await supabase
    .from("email_campaigns")
    .update({
      sent_count: totalSent || 0,
      failed_count: totalFailed || 0,
      status: isComplete ? "sent" : "sending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return {
    processed: recipients.length,
    succeeded,
    failed,
    isComplete,
  };
}
