import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const supabase = createServiceClient();

    const { data } = await supabase
      .from("email_unsubscribes")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    return NextResponse.json({
      email: cleanEmail,
      isUnsubscribed: Boolean(data),
      unsubscribedAt: data?.created_at || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, campaignId, recipientId, reason, preferences } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const supabase = createServiceClient();

    // 1. Record unsubscription in email_unsubscribes
    await supabase.from("email_unsubscribes").upsert({
      email: cleanEmail,
      reason: reason || "User 1-click unsubscribe",
      campaign_id: campaignId || null,
      created_at: new Date().toISOString(),
    });

    // 2. If recipientId provided, update recipient status to 'unsubscribed'
    if (recipientId) {
      await supabase
        .from("email_campaign_recipients")
        .update({
          status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
        })
        .eq("id", recipientId);
    }

    // 3. If campaignId provided, increment unsubscribed_count
    if (campaignId) {
      const { data: camp } = await supabase
        .from("email_campaigns")
        .select("unsubscribed_count")
        .eq("id", campaignId)
        .maybeSingle();

      if (camp) {
        await supabase
          .from("email_campaigns")
          .update({ unsubscribed_count: (camp.unsubscribed_count || 0) + 1 })
          .eq("id", campaignId);
      }
    }

    return NextResponse.json({
      success: true,
      message: "You have been successfully unsubscribed from marketing communications.",
      email: cleanEmail,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
