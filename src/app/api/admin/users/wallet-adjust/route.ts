import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function checkAdminAuth() {
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
    return user;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, amountRupees, actionType, note } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    const amountInt = Math.floor(amountRupees);
    if (!amountRupees || isNaN(amountRupees) || amountInt < 1) {
      return NextResponse.json({ error: "Valid whole rupee amount (minimum ₹1) is required — no paisa adjustments" }, { status: 400 });
    }
    if (!["add", "deduct"].includes(actionType)) {
      return NextResponse.json({ error: "Action type must be either 'add' or 'deduct'" }, { status: 400 });
    }
    if (!note?.trim()) {
      return NextResponse.json({ error: "Adjustment note/reason is required" }, { status: 400 });
    }

    // Only whole rupees — multiply integer by 100 for paise
    const amountPaise = amountInt * 100;
    const adjustPaise = actionType === "add" ? amountPaise : -amountPaise;

    const supabase = createServiceClient();

    // 1. Get current wallet balance or initialize wallet row
    let { data: wallet, error: getError } = await supabase
      .from("wallets")
      .select("balance_paise")
      .eq("user_id", userId)
      .maybeSingle();

    if (getError) throw getError;

    let currentBalance = wallet ? wallet.balance_paise : 0;
    const nextBalance = currentBalance + adjustPaise;

    if (nextBalance < 0) {
      return NextResponse.json(
        { error: `Insufficient wallet balance. User only has ₹${(currentBalance / 100).toFixed(2)}.` },
        { status: 400 }
      );
    }

    // 2. Insert transaction record
    const { error: txnError } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        type: "admin_adjust",
        amount_paise: adjustPaise,
        note: note.trim(),
      });

    if (txnError) throw txnError;

    // 3. Upsert wallet balance
    const { error: upsertError } = await supabase
      .from("wallets")
      .upsert({
        user_id: userId,
        balance_paise: nextBalance,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) throw upsertError;

    return NextResponse.json({
      success: true,
      newBalancePaise: nextBalance,
    });
  } catch (error: any) {
    console.error("Wallet adjust error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
