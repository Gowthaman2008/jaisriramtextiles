import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { BUILT_IN_TEMPLATES } from "@/lib/marketing/built-in-templates";
import { compileEmailHtml } from "@/lib/marketing/email-compiler";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data: dbTemplates, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });

    const customTemplates = dbTemplates || [];
    const allTemplates = [...BUILT_IN_TEMPLATES, ...customTemplates];

    return NextResponse.json(allTemplates);
  } catch (err: any) {
    return NextResponse.json(BUILT_IN_TEMPLATES);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { name, category = "promotional", subject = "", preview_text = "", content_json = [] } = body;

    if (!name) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    const content_html = compileEmailHtml(content_json, {
      previewText: preview_text,
    });

    const newTemplate = {
      name: name.trim(),
      category,
      subject: subject.trim(),
      preview_text: preview_text?.trim() || null,
      content_json,
      content_html,
      is_built_in: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("email_templates")
      .insert(newTemplate)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { id, name, category, subject, preview_text, content_json } = body;

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    if (name) updates.name = name.trim();
    if (category) updates.category = category;
    if (subject !== undefined) updates.subject = subject.trim();
    if (preview_text !== undefined) updates.preview_text = preview_text ? preview_text.trim() : null;
    if (content_json) {
      updates.content_json = content_json;
      updates.content_html = compileEmailHtml(content_json, {
        previewText: preview_text || updates.preview_text || "",
      });
    }

    const { data, error } = await supabase
      .from("email_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("email_templates").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
