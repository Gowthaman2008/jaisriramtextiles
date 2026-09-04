import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { reconcileUserWallet } from "@/lib/wallet";

export async function GET() {
  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 1. Reconcile any past-due cashback for this user
    await reconcileUserWallet(user.id, supabase);

    // 2. Fetch fresh wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance_paise")
      .eq("user_id", user.id)
      .maybeSingle();

    // 3. Fetch latest transactions ledger
    const { data: transactions } = await supabase
      .from("wallet_transactions")
      .select("*, orders(order_number)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      balance_paise: wallet?.balance_paise || 0,
      transactions: transactions || [],
    });
  } catch (error: any) {
    console.error("Account wallet fetch/reconcile error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
