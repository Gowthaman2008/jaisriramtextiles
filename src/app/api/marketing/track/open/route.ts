import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

// 1x1 transparent GIF base64
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("c");
    const recipientId = url.searchParams.get("r");

    if (campaignId && recipientId) {
      const supabase = createServiceClient();

      // Check if already recorded open
      const { data: recipient } = await supabase
        .from("email_campaign_recipients")
        .select("id, status, opened_at")
        .eq("id", recipientId)
        .maybeSingle();

      if (recipient && !recipient.opened_at) {
        // Record first open
        await supabase
          .from("email_campaign_recipients")
          .update({
            status: "opened",
            opened_at: new Date().toISOString(),
          })
          .eq("id", recipientId);

        // Increment opened_count on campaign
        const { data: camp } = await supabase
          .from("email_campaigns")
          .select("opened_count, unique_opens_count")
          .eq("id", campaignId)
          .maybeSingle();

        if (camp) {
          await supabase
            .from("email_campaigns")
            .update({
              opened_count: (camp.opened_count || 0) + 1,
              unique_opens_count: (camp.unique_opens_count || 0) + 1,
            })
            .eq("id", campaignId);
        }
      }
    }
  } catch (err) {
    console.error("Open tracking error:", err);
  }

  // Return the transparent GIF image with no-cache headers
  return new Response(TRANSPARENT_GIF_BUFFER, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF_BUFFER.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
