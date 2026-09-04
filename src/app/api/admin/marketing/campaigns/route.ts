import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { compileEmailHtml } from "@/lib/marketing/email-compiler";
import { checkAdminAuth } from "@/lib/admin-auth";

// Helper to sanitize UUID fields
function cleanUuid(id: any): string | null {
  if (!id || typeof id !== "string") return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id.trim()) ? id.trim() : null;
}

export async function GET(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Load live tracking events from app_settings
    let trackingEvents: Record<string, Record<string, any>> = {};
    try {
      const { data: trackingData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "marketing_tracking_events")
        .maybeSingle();
      if (trackingData?.value) {
        trackingEvents = trackingData.value;
      }
    } catch {}

    const { data: campaigns, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && campaigns && campaigns.length > 0) {
      const normalized = campaigns.map((c) => {
        const campEvents = trackingEvents[c.id] || {};
        const openCount = Object.keys(campEvents).length;
        const clickCount = Object.values(campEvents).filter((e: any) => e.clicked_at).length;
        const isSent = Boolean(c.sent_at || c.sent_count > 0 || openCount > 0 || c.status === "sent");

        return {
          ...c,
          status: isSent && c.status === "draft" ? "sent" : c.status,
          opened_count: Math.max(c.opened_count || 0, openCount),
          unique_opens_count: Math.max(c.unique_opens_count || 0, openCount),
          clicked_count: Math.max(c.clicked_count || 0, clickCount),
          unique_clicks_count: Math.max(c.unique_clicks_count || 0, clickCount),
        };
      });
      return NextResponse.json(normalized);
    }

    // Fallback to app_settings storage if email_campaigns table doesn't exist
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stored_email_campaigns")
      .maybeSingle();

    let stored: any[] = Array.isArray(settingsData?.value) ? settingsData.value : [];
    
    // Normalize any dispatched campaigns to 'sent' and merge tracking counters
    stored = stored.map((c) => {
      const campEvents = trackingEvents[c.id] || {};
      const openCount = Object.keys(campEvents).length;
      const clickCount = Object.values(campEvents).filter((e: any) => e.clicked_at).length;
      const isSent = Boolean(c.sent_at || c.sent_count > 0 || openCount > 0 || c.status === "sent");

      return {
        ...c,
        status: isSent && c.status === "draft" ? "sent" : c.status,
        opened_count: Math.max(c.opened_count || 0, openCount),
        unique_opens_count: Math.max(c.unique_opens_count || 0, openCount),
        clicked_count: Math.max(c.clicked_count || 0, clickCount),
        unique_clicks_count: Math.max(c.unique_clicks_count || 0, clickCount),
      };
    });

    return NextResponse.json(stored);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      name,
      description,
      subject,
      preview_text,
      sender_name = "JAI SRI RAM TEXTILES",
      sender_email = "no-reply@jaisriramtextiles.in",
      reply_to = "jaisriramtextilekpm@gmail.com",
      content_json = [],
      audience_type = "all_users",
      segment_id = null,
      filter_rules = null,
      selected_user_ids = [],
      status = "draft",
      scheduled_at = null,
    } = body;

    if (!name || !subject) {
      return NextResponse.json({ error: "Campaign name and subject are required" }, { status: 400 });
    }

    // Compile HTML from visual blocks
    const content_html = compileEmailHtml(content_json, {
      previewText: preview_text || "",
    });

    const sanitizedSegmentId = cleanUuid(segment_id);

    const newCampaign = {
      name: name.trim(),
      description: description?.trim() || null,
      subject: subject.trim(),
      preview_text: preview_text?.trim() || null,
      sender_name: sender_name.trim(),
      sender_email: sender_email.trim(),
      reply_to: reply_to?.trim() || null,
      content_json,
      content_html,
      audience_type,
      segment_id: sanitizedSegmentId,
      filter_rules,
      selected_user_ids: Array.isArray(selected_user_ids) ? selected_user_ids : [],
      status,
      scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("email_campaigns")
      .insert(newCampaign)
      .select()
      .single();

    if (!error && data) {
      // Audit log
      try {
        await supabase.from("audit_logs").insert({
          action: "campaign.create",
          entity: "email_campaigns",
          entity_id: data.id,
          meta: { name: data.name, subject: data.subject },
        });
      } catch {}

      return NextResponse.json(data, { status: 201 });
    }

    // If table insert failed (e.g. table not created in schema), fallback to app_settings
    console.warn("email_campaigns table insert failed, falling back to app_settings:", error?.message);
    const campaignId = crypto.randomUUID();
    const campaignRecord = {
      id: campaignId,
      ...newCampaign,
    };

    const { data: existingSettings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stored_email_campaigns")
      .maybeSingle();

    const currentList = Array.isArray(existingSettings?.value) ? existingSettings.value : [];
    currentList.unshift(campaignRecord);

    await supabase.from("app_settings").upsert({
      key: "stored_email_campaigns",
      value: currentList,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json(campaignRecord, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
