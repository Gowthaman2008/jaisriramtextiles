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
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("email_campaigns")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Cancel remaining queued recipients
    await supabase
      .from("email_campaign_recipients")
      .update({ status: "failed", error_message: "Campaign was cancelled by administrator" })
      .eq("campaign_id", id)
      .eq("status", "queued");

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        action: "campaign.cancel",
        entity: "email_campaigns",
        entity_id: id,
      });
    } catch {}

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
