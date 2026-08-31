import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { evaluateAudience } from "@/lib/marketing/segmentation-engine";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data: segments, error } = await supabase
      .from("email_segments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json([]);
    }

    return NextResponse.json(segments || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { name, description, filter_rules } = body;

    if (!name || !filter_rules) {
      return NextResponse.json({ error: "Segment name and filter rules are required" }, { status: 400 });
    }

    // Evaluate live matching audience count
    const evalRes = await evaluateAudience({
      audienceType: "custom_filter",
      filterRules: filter_rules,
    });

    const newSegment = {
      name: name.trim(),
      description: description ? description.trim() : null,
      filter_rules,
      user_count_cache: evalRes.totalEligible,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("email_segments")
      .insert(newSegment)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        action: "segment.create",
        entity: "email_segments",
        entity_id: data.id,
        meta: { name: data.name, count: evalRes.totalEligible },
      });
    } catch {}

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { id, name, description, filter_rules } = body;

    if (!id) {
      return NextResponse.json({ error: "Segment ID is required" }, { status: 400 });
    }

    let user_count_cache = undefined;
    if (filter_rules) {
      const evalRes = await evaluateAudience({
        audienceType: "custom_filter",
        filterRules: filter_rules,
      });
      user_count_cache = evalRes.totalEligible;
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (filter_rules) updates.filter_rules = filter_rules;
    if (user_count_cache !== undefined) updates.user_count_cache = user_count_cache;

    const { data, error } = await supabase
      .from("email_segments")
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
      return NextResponse.json({ error: "Segment ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("email_segments").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
