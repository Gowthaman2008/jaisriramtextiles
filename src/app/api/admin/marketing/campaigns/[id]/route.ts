import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { compileEmailHtml } from "@/lib/marketing/email-compiler";
import { checkAdminAuth } from "@/lib/admin-auth";

function cleanUuid(id: any): string | null {
  if (!id || typeof id !== "string") return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id.trim()) ? id.trim() : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && campaign) {
      return NextResponse.json(campaign);
    }

    // Check app_settings fallback
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stored_email_campaigns")
      .maybeSingle();

    const stored: any[] = Array.isArray(settingsData?.value) ? settingsData.value : [];
    const found = stored.find((c: any) => c.id === id);

    if (found) {
      return NextResponse.json(found);
    }

    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      name,
      description,
      subject,
      preview_text,
      sender_name,
      sender_email,
      reply_to,
      content_json,
      audience_type,
      segment_id,
      filter_rules,
      selected_user_ids,
      status,
      scheduled_at,
    } = body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (subject !== undefined) updates.subject = subject.trim();
    if (preview_text !== undefined) updates.preview_text = preview_text?.trim() || null;
    if (sender_name !== undefined) updates.sender_name = sender_name.trim();
    if (sender_email !== undefined) updates.sender_email = sender_email.trim();
    if (reply_to !== undefined) updates.reply_to = reply_to?.trim() || null;
    if (audience_type !== undefined) updates.audience_type = audience_type;
    if (segment_id !== undefined) updates.segment_id = cleanUuid(segment_id);
    if (filter_rules !== undefined) updates.filter_rules = filter_rules;
    if (selected_user_ids !== undefined) updates.selected_user_ids = Array.isArray(selected_user_ids) ? selected_user_ids : [];
    if (status !== undefined) updates.status = status;
    if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at ? new Date(scheduled_at).toISOString() : null;

    if (content_json !== undefined) {
      updates.content_json = content_json;
      updates.content_html = compileEmailHtml(content_json, {
        previewText: preview_text || "",
      });
    }

    // Try DB update first
    const { data: dbUpdated, error: dbError } = await supabase
      .from("email_campaigns")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (!dbError && dbUpdated) {
      return NextResponse.json(dbUpdated);
    }

    // Fallback update in app_settings
    const { data: existingSettings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stored_email_campaigns")
      .maybeSingle();

    let stored: any[] = Array.isArray(existingSettings?.value) ? existingSettings.value : [];
    const index = stored.findIndex((c: any) => c.id === id);

    let updatedItem: any;
    if (index >= 0) {
      stored[index] = { ...stored[index], ...updates };
      updatedItem = stored[index];
    } else {
      updatedItem = { id, ...updates, created_at: new Date().toISOString() };
      stored.unshift(updatedItem);
    }

    await supabase.from("app_settings").upsert({
      key: "stored_email_campaigns",
      value: stored,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json(updatedItem);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Delete associated recipients
    try {
      await supabase.from("email_campaign_recipients").delete().eq("campaign_id", id);
    } catch {}

    const { error } = await supabase
      .from("email_campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        action: "campaign.delete",
        entity: "email_campaigns",
        entity_id: id,
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
