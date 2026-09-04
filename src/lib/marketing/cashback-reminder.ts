import { createServiceClient } from "@/lib/supabase/admin";
import { reconcileAllWallets } from "@/lib/wallet";
import { sendEmail, cashbackExpiryReminderEmailHtml } from "@/lib/email";

export interface CashbackReminderUser {
  userId: string;
  profileId: string;
  name: string;
  email: string;
  balancePaise: number;
  daysRemaining: number;
  earliestExpiry: string;
  lastSentAt: string | null;
  isDueNow: boolean;
}

/**
 * Evaluates all users in the database and returns those who have active unexpired
 * cashback rewards along with their 10-day reminder eligibility status.
 */
export async function getCashbackReminderEligibleUsers(): Promise<CashbackReminderUser[]> {
  const supabase = createServiceClient();
  const now = new Date();

  // 1. Reconcile all wallets to ensure expired credits are cleanly deducted
  await reconcileAllWallets(supabase);

  // 2. Fetch all profiles that have an active wallet balance > 0
  const { data: wallets, error: walletErr } = await supabase
    .from("wallets")
    .select("user_id, balance_paise, profiles(id, user_id, full_name, email, last_cashback_reminder_sent_at)")
    .gt("balance_paise", 0);

  if (walletErr) {
    console.error("[cashback-reminder] Failed to fetch wallets:", walletErr);
    return [];
  }

  const eligibleUsers: CashbackReminderUser[] = [];

  for (const w of wallets || []) {
    const profile = (w.profiles as any) || {};
    if (!profile.email) continue;

    // 3. Fetch active unexpired cashback credit transactions to find the earliest expiry date
    const { data: txns } = await supabase
      .from("wallet_transactions")
      .select("expires_at, type, amount_paise")
      .eq("user_id", w.user_id)
      .eq("type", "cashback_credit")
      .gt("expires_at", now.toISOString())
      .order("expires_at", { ascending: true });

    let earliestExpiryDate: Date;
    if (txns && txns.length > 0 && txns[0].expires_at) {
      earliestExpiryDate = new Date(txns[0].expires_at);
    } else {
      // Default: 90 days from now if not explicitly pinned
      earliestExpiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    }

    const diffMs = earliestExpiryDate.getTime() - now.getTime();
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // 4. Check 10-day throttling rule
    const lastSentStr = profile.last_cashback_reminder_sent_at || null;
    let isDueNow = true;

    if (lastSentStr) {
      const lastSentDate = new Date(lastSentStr);
      if (!isNaN(lastSentDate.getTime())) {
        const daysSinceLastSent = (now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSent < 10) {
          isDueNow = false;
        }
      }
    }

    eligibleUsers.push({
      userId: profile.user_id || "N/A",
      profileId: profile.id || w.user_id,
      name: profile.full_name || "Valued Customer",
      email: profile.email,
      balancePaise: w.balance_paise,
      daysRemaining,
      earliestExpiry: earliestExpiryDate.toISOString(),
      lastSentAt: lastSentStr,
      isDueNow,
    });
  }

  return eligibleUsers;
}

/**
 * Dispatches the 10-day automated cashback expiry reminder emails.
 * Only sends to users with an active cashback balance who have not received
 * a reminder in the last 10 days (unless forceAll is specified).
 */
export async function sendCashbackExpiryReminders(options?: {
  forceAll?: boolean;
  specificProfileId?: string;
  websiteUrl?: string;
}) {
  const supabase = createServiceClient();
  const allEligible = await getCashbackReminderEligibleUsers();

  let targetUsers = allEligible;
  if (options?.specificProfileId) {
    targetUsers = allEligible.filter((u) => u.profileId === options.specificProfileId);
  } else if (!options?.forceAll) {
    targetUsers = allEligible.filter((u) => u.isDueNow);
  }

  let sentCount = 0;
  let skippedCount = allEligible.length - targetUsers.length;
  const errors: any[] = [];

  for (const user of targetUsers) {
    try {
      const expiryDateFormatted = new Date(user.earliestExpiry).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const formattedRupees = (user.balancePaise / 100).toFixed(0);
      const subject = `💰 ₹${formattedRupees} Cashback Expiring in ${user.daysRemaining} Days — Order Now | JAI SRI RAM TEXTILES`;

      const html = cashbackExpiryReminderEmailHtml({
        name: user.name,
        balancePaise: user.balancePaise,
        daysLeft: user.daysRemaining,
        expiryDateFormatted,
        websiteUrl: options?.websiteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://jaisriramtextiles.in",
      });

      await sendEmail({
        to: user.email,
        subject,
        html,
      });

      // Update last sent timestamp on profile
      await supabase
        .from("profiles")
        .update({ last_cashback_reminder_sent_at: new Date().toISOString() })
        .eq("id", user.profileId);

      sentCount++;
    } catch (err: any) {
      console.error(`[cashback-reminder] Failed to send email to ${user.email}:`, err);
      errors.push({ email: user.email, error: err.message || String(err) });
    }
  }

  return {
    success: true,
    totalEligible: allEligible.length,
    sentCount,
    skippedCount,
    errors,
  };
}
