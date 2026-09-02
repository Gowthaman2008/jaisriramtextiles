import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

// 1x1 transparent GIF base64
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function cleanUuid(id: any): string | null {
  if (!id || typeof id !== "string") return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id.trim()) ? id.trim() : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("c")?.trim();
    const recipientId = url.searchParams.get("r")?.trim();

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
        console.warn("Recipient query in open tracking failed:", err);
      }

      if (recipientRow) {
        targetEmail = recipientRow.email;
        targetName = recipientRow.name;
        // Update recipient row in table
        try {
          await supabase
            .from("email_campaign_recipients")
            .update({
              status: "opened",
              opened_at: recipientRow.opened_at || nowIso,
            })
            .eq("id", recipientRow.id);
        } catch {}
      } else {
        // Recipient row not found in table, resolve email from ID or param
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

        // Try inserting row into email_campaign_recipients
        if (targetEmail) {
          try {
            await supabase.from("email_campaign_recipients").insert({
              campaign_id: campaignId,
              user_id: cleanUuid(recipientId),
              email: targetEmail,
              name: targetName || "Customer",
              status: "opened",
              opened_at: nowIso,
              sent_at: nowIso,
              delivered_at: nowIso,
            });
          } catch {}
        }
      }

      // 2. Update campaign open counters in email_campaigns DB table
      try {
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
              updated_at: nowIso,
            })
            .eq("id", campaignId);
        }
      } catch {}

      // 3. Fallback tracking storage in app_settings (guarantees persistence across environments)
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
          open_count: (existingEvent.open_count || 0) + 1,
          last_opened_at: nowIso,
        };

        await supabase.from("app_settings").upsert({
          key: "marketing_tracking_events",
          value: trackingEvents,
          updated_at: nowIso,
        });

        // Also update stored_email_campaigns counter in app_settings
        const { data: campSettings } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "stored_email_campaigns")
          .maybeSingle();

        const storedCamps: any[] = Array.isArray(campSettings?.value) ? campSettings.value : [];
        const campIdx = storedCamps.findIndex((c: any) => c.id === campaignId);
        if (campIdx >= 0) {
          storedCamps[campIdx] = {
            ...storedCamps[campIdx],
            opened_count: Object.keys(trackingEvents[campaignId]).length,
            unique_opens_count: Object.keys(trackingEvents[campaignId]).length,
            updated_at: nowIso,
          };
          await supabase.from("app_settings").upsert({
            key: "stored_email_campaigns",
            value: storedCamps,
            updated_at: nowIso,
          });
        }
      } catch (appErr) {
        console.warn("Fallback tracking event storage error:", appErr);
      }
    }
  } catch (err) {
    console.error("Open tracking error:", err);
  }

  // Return the transparent GIF image with zero-cache & CORS headers for mail proxies
  return new Response(TRANSPARENT_GIF_BUFFER, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF_BUFFER.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
