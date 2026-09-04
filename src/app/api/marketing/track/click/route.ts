import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

function cleanUuid(id: any): string | null {
  if (!id || typeof id !== "string") return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id.trim()) ? id.trim() : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("c")?.trim();
  const recipientId = url.searchParams.get("r")?.trim();
  const rawTargetUrl = url.searchParams.get("url") || process.env.NEXT_PUBLIC_SITE_URL || "https://jaisriramtextiles.in";
  let targetUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jaisriramtextiles.in";

  try {
    if (rawTargetUrl.startsWith("/") && !rawTargetUrl.startsWith("//") && !rawTargetUrl.startsWith("/\\")) {
      targetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://jaisriramtextiles.in"}${rawTargetUrl}`;
    } else {
      const parsed = new URL(rawTargetUrl);
      const allowedHosts = [
        "jaisriramtextiles.in",
        "www.jaisriramtextiles.in",
        "localhost",
        "127.0.0.1",
      ];
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        try {
          allowedHosts.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname);
        } catch {}
      }
      if (allowedHosts.includes(parsed.hostname)) {
        targetUrl = parsed.toString();
      }
    }
  } catch {
    targetUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jaisriramtextiles.in";
  }

  try {
    if (campaignId && recipientId) {
      const supabase = createServiceClient();
      const nowIso = new Date().toISOString();

      let targetEmail: string | null = null;
      let targetName: string | null = null;

      // 1. Try to find recipient in email_campaign_recipients by ID, user_id, or email
      let recipientRow: any = null;
      try {
        if (cleanUuid(recipientId)) {
          const { data: recById } = await supabase
            .from("email_campaign_recipients")
            .select("*")
            .eq("id", recipientId)
            .maybeSingle();
          if (recById) recipientRow = recById;

          if (!recipientRow) {
            const { data: recByUserId } = await supabase
              .from("email_campaign_recipients")
              .select("*")
              .eq("campaign_id", campaignId)
              .eq("user_id", recipientId)
              .maybeSingle();
            if (recByUserId) recipientRow = recByUserId;
          }
        }

        if (!recipientRow && recipientId.includes("@")) {
          const { data: recByEmail } = await supabase
            .from("email_campaign_recipients")
            .select("*")
            .eq("campaign_id", campaignId)
            .ilike("email", recipientId)
            .maybeSingle();
          if (recByEmail) recipientRow = recByEmail;
        }
      } catch (err) {
        console.warn("Recipient query in click tracking failed:", err);
      }

      if (recipientRow) {
        targetEmail = recipientRow.email;
        targetName = recipientRow.name;
        // Update recipient row in table
        try {
          await supabase
            .from("email_campaign_recipients")
            .update({
              status: "clicked",
              clicked_at: recipientRow.clicked_at || nowIso,
              opened_at: recipientRow.opened_at || nowIso,
            })
            .eq("id", recipientRow.id);
        } catch {}
      } else {
        if (recipientId.includes("@")) {
          targetEmail = recipientId.toLowerCase().trim();
        } else {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", recipientId)
              .maybeSingle();
            if (profile?.email) {
              targetEmail = profile.email.toLowerCase().trim();
              targetName = profile.full_name;
            }
          } catch {}
        }

        if (targetEmail) {
          try {
            await supabase.from("email_campaign_recipients").insert({
              campaign_id: campaignId,
              user_id: cleanUuid(recipientId),
              email: targetEmail,
              name: targetName || "Customer",
              status: "clicked",
              opened_at: nowIso,
              clicked_at: nowIso,
              sent_at: nowIso,
              delivered_at: nowIso,
            });
          } catch {}
        }
      }

      // 2. Update campaign click counters in DB
      try {
        const { data: camp } = await supabase
          .from("email_campaigns")
          .select("clicked_count, unique_clicks_count, opened_count")
          .eq("id", campaignId)
          .maybeSingle();

        if (camp) {
          await supabase
            .from("email_campaigns")
            .update({
              clicked_count: (camp.clicked_count || 0) + 1,
              unique_clicks_count: (camp.unique_clicks_count || 0) + 1,
              opened_count: Math.max(camp.opened_count || 0, 1),
              updated_at: nowIso,
            })
            .eq("id", campaignId);
        }
      } catch {}

      // 3. Fallback tracking storage in app_settings
      try {
        const { data: settingsData } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "marketing_tracking_events")
          .maybeSingle();

        const trackingEvents: Record<string, Record<string, any>> = settingsData?.value || {};
        if (!trackingEvents[campaignId]) {
          trackingEvents[campaignId] = {};
        }

        const emailKey = (targetEmail || recipientId).toLowerCase().trim();
        const existingEvent = trackingEvents[campaignId][emailKey] || {};

        trackingEvents[campaignId][emailKey] = {
          ...existingEvent,
          email: emailKey,
          opened_at: existingEvent.opened_at || nowIso,
          clicked_at: existingEvent.clicked_at || nowIso,
          click_count: (existingEvent.click_count || 0) + 1,
          last_clicked_at: nowIso,
        };

        await supabase.from("app_settings").upsert({
          key: "marketing_tracking_events",
          value: trackingEvents,
          updated_at: nowIso,
        });
      } catch {}
    }
  } catch (err) {
    console.error("Click tracking error:", err);
  }

  // Redirect to original URL
  return NextResponse.redirect(targetUrl, 302);
}
