import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { processCampaignBatch } from "@/lib/marketing/queue-worker";
import { checkAdminOrCronAuth } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const auth = await checkAdminOrCronAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const specificCampaignId = url.searchParams.get("campaignId");

    let campaignsToProcess: string[] = [];

    if (specificCampaignId) {
      campaignsToProcess = [specificCampaignId];
    } else {
      // 1. Check for scheduled campaigns whose scheduled_at <= now()
      const nowIso = new Date().toISOString();
      const { data: dueScheduled } = await supabase
        .from("email_campaigns")
        .select("id")
        .eq("status", "scheduled")
        .lte("scheduled_at", nowIso);

      if (dueScheduled && dueScheduled.length > 0) {
        for (const sc of dueScheduled) {
          // Trigger send API internally or queue
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/marketing/campaigns/${sc.id}/send`, {
            method: "POST",
            headers: {
              ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {})
            }
          }).catch(() => null);
        }
      }

      // 2. Find campaigns currently in 'sending' status
      const { data: activeCampaigns } = await supabase
        .from("email_campaigns")
        .select("id")
        .eq("status", "sending");

      campaignsToProcess = (activeCampaigns || []).map((c) => c.id);
    }

    const batchResults = [];

    for (const cid of campaignsToProcess) {
      const res = await processCampaignBatch(cid, 30);
      batchResults.push({ campaignId: cid, ...res });
    }

    return NextResponse.json({
      success: true,
      processedCampaigns: batchResults,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
