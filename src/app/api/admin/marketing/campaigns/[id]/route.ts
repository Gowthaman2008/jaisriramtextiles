import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { compileEmailHtml } from "@/lib/marketing/email-compiler";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (subject !== undefined) updates.subject = subject.trim();
    if (preview_text !== undefined) updates.preview_text = preview_text ? preview_text.trim() : null;
    if (sender_name !== undefined) updates.sender_name = sender_name.trim();
    if (sender_email !== undefined) updates.sender_email = sender_email.trim();
    if (reply_to !== undefined) updates.reply_to = reply_to ? reply_to.trim() : null;
    if (audience_type !== undefined) updates.audience_type = audience_type;
    if (segment_id !== undefined) updates.segment_id = segment_id || null;
    if (filter_rules !== undefined) updates.filter_rules = filter_rules;
    if (selected_user_ids !== undefined) updates.selected_user_ids = selected_user_ids;
    if (status !== undefined) updates.status = status;
    if (scheduled_at !== undefined) {
      updates.scheduled_at = scheduled_at ? new Date(scheduled_at).toISOString() : null;
    }

    if (content_json !== undefined) {
      updates.content_json = content_json;
      updates.content_html = compileEmailHtml(content_json, {
        previewText: preview_text || updates.preview_text || "",
      });
    }

    const { data, error } = await supabase
      .from("email_campaigns")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        action: "campaign.update",
        entity: "email_campaigns",
        entity_id: id,
        meta: { updates },
      });
    } catch {}

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
