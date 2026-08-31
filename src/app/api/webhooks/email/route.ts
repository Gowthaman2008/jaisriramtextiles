import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { type, data } = payload;

    if (!type || !data) {
      return NextResponse.json({ received: true });
    }

    const email = data.to?.[0]?.toLowerCase()?.trim() || data.email;
    const messageId = data.email_id || data.id;
    const tags = data.tags || [];

    let campaignId = tags.find((t: any) => t.name === "campaign_id")?.value;
    let recipientId = tags.find((t: any) => t.name === "recipient_id")?.value;

    const supabase = createServiceClient();

    // If recipientId is missing, look up by provider messageId or email + campaignId
    if (!recipientId && messageId) {
      const { data: rec } = await supabase
        .from("email_campaign_recipients")
        .select("id, campaign_id")
        .eq("provider_message_id", messageId)
        .maybeSingle();

      if (rec) {
        recipientId = rec.id;
        campaignId = campaignId || rec.campaign_id;
      }
    }

    const nowIso = new Date().toISOString();

    if (type === "email.delivered" && recipientId) {
      await supabase
        .from("email_campaign_recipients")
        .update({
          status: "delivered",
          delivered_at: nowIso,
        })
        .eq("id", recipientId);

      if (campaignId) {
        const { data: camp } = await supabase
          .from("email_campaigns")
          .select("delivered_count")
          .eq("id", campaignId)
          .maybeSingle();
        if (camp) {
          await supabase
            .from("email_campaigns")
            .update({ delivered_count: (camp.delivered_count || 0) + 1 })
            .eq("id", campaignId);
        }
      }
    } else if (type === "email.opened" && recipientId) {
      await supabase
        .from("email_campaign_recipients")
        .update({
          status: "opened",
          opened_at: nowIso,
        })
        .eq("id", recipientId);

      if (campaignId) {
        const { data: camp } = await supabase
          .from("email_campaigns")
          .select("opened_count, unique_opens_count")
          .eq("id", campaignId)
          .maybeSingle();
        if (camp) {
          await supabase
            .from("email_campaigns")
            .update({
              opened_count: (camp.opened_count || 0) + 1,
              unique_opens_count: (camp.unique_opens_count || 0) + 1,
            })
            .eq("id", campaignId);
        }
      }
    } else if (type === "email.clicked" && recipientId) {
      await supabase
        .from("email_campaign_recipients")
        .update({
          status: "clicked",
          clicked_at: nowIso,
        })
        .eq("id", recipientId);

      if (campaignId) {
        const { data: camp } = await supabase
          .from("email_campaigns")
          .select("clicked_count, unique_clicks_count")
          .eq("id", campaignId)
          .maybeSingle();
        if (camp) {
          await supabase
            .from("email_campaigns")
            .update({
              clicked_count: (camp.clicked_count || 0) + 1,
              unique_clicks_count: (camp.unique_clicks_count || 0) + 1,
            })
            .eq("id", campaignId);
        }
      }
    } else if ((type === "email.bounced" || type === "email.failed") && (recipientId || email)) {
      if (recipientId) {
        await supabase
          .from("email_campaign_recipients")
          .update({
            status: type === "email.bounced" ? "bounced" : "failed",
            bounced_at: type === "email.bounced" ? nowIso : null,
            error_message: data.error || data.bounce_type || "Provider bounce event",
          })
          .eq("id", recipientId);
      }

      if (email) {
        // Record in unsubscribes / suppression
        await supabase.from("email_unsubscribes").upsert({
          email,
          reason: `Bounce: ${data.bounce_type || "Permanent bounce"}`,
          created_at: nowIso,
        });
      }

      if (campaignId) {
        const { data: camp } = await supabase
          .from("email_campaigns")
          .select("bounced_count, failed_count")
          .eq("id", campaignId)
          .maybeSingle();
        if (camp) {
          await supabase
            .from("email_campaigns")
            .update({
              bounced_count: type === "email.bounced" ? (camp.bounced_count || 0) + 1 : camp.bounced_count,
              failed_count: (camp.failed_count || 0) + 1,
            })
            .eq("id", campaignId);
        }
      }
    } else if (type === "email.complained" && email) {
      await supabase.from("email_unsubscribes").upsert({
        email,
        reason: "Spam complaint report",
        created_at: nowIso,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
