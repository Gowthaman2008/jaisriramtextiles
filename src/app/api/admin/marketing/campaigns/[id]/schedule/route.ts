import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { scheduled_at } = await request.json();

    if (!scheduled_at) {
      return NextResponse.json({ error: "Scheduled date/time is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("email_campaigns")
      .update({
        status: "scheduled",
        scheduled_at: new Date(scheduled_at).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        action: "campaign.schedule",
        entity: "email_campaigns",
        entity_id: id,
        meta: { scheduled_at },
      });
    } catch {}

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
