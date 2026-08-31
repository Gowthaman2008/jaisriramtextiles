import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("c");
  const recipientId = url.searchParams.get("r");
  const targetUrl = url.searchParams.get("url") || process.env.NEXT_PUBLIC_SITE_URL || "https://jaisriramtextiles.in";

  try {
    if (campaignId && recipientId) {
      const supabase = createServiceClient();

      // Fetch recipient
      const { data: recipient } = await supabase
        .from("email_campaign_recipients")
        .select("id, status, clicked_at, opened_at")
        .eq("id", recipientId)
        .maybeSingle();

      if (recipient) {
        const updates: any = {
          status: "clicked",
          clicked_at: recipient.clicked_at || new Date().toISOString(),
          opened_at: recipient.opened_at || new Date().toISOString(), // Clicking implies it was opened
        };

        await supabase
          .from("email_campaign_recipients")
          .update(updates)
          .eq("id", recipientId);

        // Update campaign counters
        const { data: camp } = await supabase
          .from("email_campaigns")
          .select("clicked_count, unique_clicks_count")
          .eq("id", campaignId)
          .maybeSingle();

        if (camp) {
          await supabase
            .from("email_campaigns")
            .update({
              clicked_count: (camp.clicked_count || 0) + 1,
              unique_clicks_count: recipient.clicked_at ? camp.unique_clicks_count : (camp.unique_clicks_count || 0) + 1,
            })
            .eq("id", campaignId);
        }
      }
    }
  } catch (err) {
    console.error("Click tracking error:", err);
  }

  // Redirect to original URL
  return NextResponse.redirect(targetUrl, 302);
}
