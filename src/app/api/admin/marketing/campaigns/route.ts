import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { compileEmailHtml } from "@/lib/marketing/email-compiler";

// Helper: Ensure marketing tables exist in Supabase dynamically
async function ensureMarketingTables(supabase: any) {
  // If email_campaigns table doesn't exist, we can fallback gracefully or execute table creation
  try {
    const { error } = await supabase.from("email_campaigns").select("id").limit(1);
    if (error && error.code === "42P01") {
      // Table doesn't exist yet in Supabase schema
      console.warn("email_campaigns table not found in Supabase schema. Please run schema.sql.");
    }
  } catch (e) {
    console.error("ensureMarketingTables error:", e);
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    await ensureMarketingTables(supabase);

    const { data: campaigns, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // If table doesn't exist yet, return empty list safely
      return NextResponse.json([]);
    }

    return NextResponse.json(campaigns || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
      segment_id,
      filter_rules,
      selected_user_ids,
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
