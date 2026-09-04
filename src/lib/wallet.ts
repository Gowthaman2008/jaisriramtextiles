import { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Robustly parses user/admin delivery date strings (e.g. "Tuesday, 15 Aug 2026", "15 Aug 2026", "2026-08-15")
 */
export function parseDeliveryDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // 1. Direct parse
  const d1 = new Date(clean);
  if (!isNaN(d1.getTime())) return d1;

  // 2. Strip weekday prefix like "Tuesday, "
  const stripped = clean.replace(/^[A-Za-z]+,\s*/, "").trim();
  const d2 = new Date(stripped);
  if (!isNaN(d2.getTime())) return d2;

  // 3. Match DD/MM/YYYY or DD-MM-YYYY
  const match = stripped.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    const d3 = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(d3.getTime())) return d3;
  }

  return null;
}

/**
 * Calculates cashback expiration timestamp (90 days from delivery)
 */
export function calculateCashbackExpiry(deliveredAt: Date | string | null | undefined): Date {
  const baseDate = deliveredAt instanceof Date ? deliveredAt : (deliveredAt ? new Date(deliveredAt) : new Date());
  const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const expiry = new Date(validBase.getTime() + 90 * 24 * 60 * 60 * 1000);
  return expiry;
}

interface CreditBucket {
  id: string;
  orderId?: string | null;
  orderNumber?: string | null;
  amountPaise: number;
  remainingPaise: number;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Reconciles a single user's wallet:
 * 1. Tracks FIFO consumption of cashback credits by redemptions.
 * 2. Identifies any cashback credits that have passed their 90-day expiry date.
 * 3. Automatically inserts 'expiry' transactions for unredeemed expired amounts.
 * 4. Updates the wallets table balance to match active, unexpired funds.
 */
export async function reconcileUserWallet(userId: string, customClient?: SupabaseClient) {
  const supabase = customClient || createServiceClient();
  const now = new Date();

  // 1. Fetch all transactions for this user along with order details
  const { data: rawTxns, error: txnErr } = await supabase
    .from("wallet_transactions")
    .select("id, user_id, type, amount_paise, order_id, note, expires_at, created_at, orders(id, order_number, status, delivered_at, shipping_address)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (txnErr) {
    console.error(`[wallet-reconcile] Error fetching transactions for user ${userId}:`, txnErr);
    throw txnErr;
  }

  const txns = rawTxns || [];
  const creditBuckets: CreditBucket[] = [];
  const existingExpiryTxnIds = new Set<string>();

  // 2. Build credit buckets and process existing transactions
  for (const txn of txns) {
    if (txn.type === "cashback_credit") {
      let expiryDate: Date | null = null;
      if (txn.expires_at) {
        const parsed = new Date(txn.expires_at);
        if (!isNaN(parsed.getTime())) expiryDate = parsed;
      }

      // If no valid expires_at was saved, determine from order delivery details or creation time
      if (!expiryDate) {
        const order = txn.orders as any;
        const deliveryDateStr = order?.shipping_address?.delivery_date;
        const parsedDelivery = parseDeliveryDate(deliveryDateStr);
        if (parsedDelivery) {
          expiryDate = calculateCashbackExpiry(parsedDelivery);
        } else if (order?.delivered_at) {
          expiryDate = calculateCashbackExpiry(new Date(order.delivered_at));
        } else {
          expiryDate = calculateCashbackExpiry(new Date(txn.created_at));
        }
      }

      creditBuckets.push({
        id: txn.id,
        orderId: txn.order_id,
        orderNumber: (txn.orders as any)?.order_number || null,
        amountPaise: txn.amount_paise,
        remainingPaise: Math.max(0, txn.amount_paise),
        expiresAt: expiryDate,
        createdAt: new Date(txn.created_at),
      });
    } else if (txn.type === "redeem" || (txn.type === "admin_adjust" && txn.amount_paise < 0)) {
      let toDeduct = Math.abs(txn.amount_paise);
      const txnTime = new Date(txn.created_at);

      // FIFO deduction from oldest bucket with remaining balance that was not expired AT THE TIME of redemption
      for (const bucket of creditBuckets) {
        if (toDeduct <= 0) break;
        if (bucket.remainingPaise <= 0) continue;

        // If the bucket had already expired before this redemption took place, skip it
        if (bucket.expiresAt && bucket.expiresAt < txnTime) continue;

        const deductFromBucket = Math.min(bucket.remainingPaise, toDeduct);
        bucket.remainingPaise -= deductFromBucket;
        toDeduct -= deductFromBucket;
      }
    } else if (txn.type === "expiry") {
      existingExpiryTxnIds.add(txn.id);
      let toDeduct = Math.abs(txn.amount_paise);

      // Deduct from the matching order bucket or oldest expired bucket
      if (txn.order_id) {
        const match = creditBuckets.find((b) => b.orderId === txn.order_id && b.remainingPaise > 0);
        if (match) {
          const deductAmount = Math.min(match.remainingPaise, toDeduct);
          match.remainingPaise -= deductAmount;
          toDeduct -= deductAmount;
        }
      }

      for (const bucket of creditBuckets) {
        if (toDeduct <= 0) break;
        if (bucket.remainingPaise <= 0) continue;
        const deductAmount = Math.min(bucket.remainingPaise, toDeduct);
        bucket.remainingPaise -= deductAmount;
        toDeduct -= deductAmount;
      }
    } else if (txn.type === "admin_adjust" && txn.amount_paise > 0) {
      // Positive admin adjustment without expiry
      creditBuckets.push({
        id: txn.id,
        orderId: null,
        orderNumber: null,
        amountPaise: txn.amount_paise,
        remainingPaise: txn.amount_paise,
        expiresAt: null, // does not expire
        createdAt: new Date(txn.created_at),
      });
    }
  }

  // 3. Find newly expired buckets that still have unredeemed balance
  const newlyExpiredTxns: any[] = [];
  for (const bucket of creditBuckets) {
    if (bucket.remainingPaise > 0 && bucket.expiresAt && bucket.expiresAt <= now) {
      const expiredAmount = bucket.remainingPaise;
      const orderLabel = bucket.orderNumber ? ` for order ${bucket.orderNumber}` : "";
      const formattedDate = bucket.expiresAt.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      newlyExpiredTxns.push({
        user_id: userId,
        type: "expiry",
        amount_paise: -expiredAmount,
        order_id: bucket.orderId || null,
        note: `Expired cashback${orderLabel} (Expired on ${formattedDate})`,
        expires_at: bucket.expiresAt.toISOString(),
        created_at: bucket.expiresAt.toISOString() <= now.toISOString() ? bucket.expiresAt.toISOString() : now.toISOString(),
      });

      bucket.remainingPaise = 0;
    }
  }

  // 4. If any credits expired, insert the expiry ledger transactions
  if (newlyExpiredTxns.length > 0) {
    const { error: insertErr } = await supabase.from("wallet_transactions").insert(newlyExpiredTxns);
    if (insertErr) {
      console.error(`[wallet-reconcile] Failed to insert expiry transactions for user ${userId}:`, insertErr);
    }
  }

  // 5. Calculate reconciled active balance
  let finalBalancePaise = 0;
  for (const bucket of creditBuckets) {
    if (bucket.remainingPaise > 0) {
      if (!bucket.expiresAt || bucket.expiresAt > now) {
        finalBalancePaise += bucket.remainingPaise;
      }
    }
  }

  finalBalancePaise = Math.max(0, finalBalancePaise);

  // 6. Update the wallets table with current verified balance
  const { error: walletUpdateErr } = await supabase
    .from("wallets")
    .upsert({
      user_id: userId,
      balance_paise: finalBalancePaise,
      updated_at: new Date().toISOString(),
    });

  if (walletUpdateErr) {
    console.error(`[wallet-reconcile] Failed to update wallets row for user ${userId}:`, walletUpdateErr);
  }

  return {
    userId,
    activeBalancePaise: finalBalancePaise,
    expiredCount: newlyExpiredTxns.length,
    newlyExpiredPaise: newlyExpiredTxns.reduce((sum, t) => sum + Math.abs(t.amount_paise), 0),
  };
}

/**
 * Reconciles all active user wallets across the entire store
 */
export async function reconcileAllWallets(customClient?: SupabaseClient) {
  const supabase = customClient || createServiceClient();
  try {
    const { data: usersWithTxns, error } = await supabase
      .from("wallet_transactions")
      .select("user_id")
      .not("user_id", "is", null);

    if (error || !usersWithTxns) return { totalReconciled: 0 };

    const distinctUserIds = [...new Set(usersWithTxns.map((u) => u.user_id))];
    const results = await Promise.allSettled(
      distinctUserIds.map((uid) => reconcileUserWallet(uid, supabase))
    );

    const successful = results.filter((r) => r.status === "fulfilled");
    return {
      totalReconciled: successful.length,
      distinctUsers: distinctUserIds.length,
    };
  } catch (err) {
    console.error("[wallet-reconcile-all] Error:", err);
    return { totalReconciled: 0 };
  }
}
