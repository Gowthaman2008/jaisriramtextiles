import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCashbackReminderEligibleUsers, sendCashbackExpiryReminders } from "@/lib/marketing/cashback-reminder";

async function checkAdminOrCronAuth(request: Request) {
  // 1. Check for Cron Secret Header (for external cron services or Vercel Cron)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.MARKETING_CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { isCron: true };
  }

  // 2. Check for Admin / Staff session
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return null;
    }
    return { user, profile };
  } catch {
    return null;
  }
}

// GET: Preview users who have active cashback and check 10-day eligibility
export async function GET(request: Request) {
  const auth = await checkAdminOrCronAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getCashbackReminderEligibleUsers();
    const dueCount = users.filter((u) => u.isDueNow).length;

    return NextResponse.json({
      totalWithBalance: users.length,
      dueNowCount: dueCount,
      users,
    });
  } catch (error: any) {
    console.error("Cashback reminder preview error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Execute the 10-day automated cashback expiry reminder broadcast
export async function POST(request: Request) {
  const auth = await checkAdminOrCronAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { forceAll, specificProfileId, websiteUrl } = body;

    const result = await sendCashbackExpiryReminders({
      forceAll: !!forceAll,
      specificProfileId,
      websiteUrl,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cashback reminder dispatch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
