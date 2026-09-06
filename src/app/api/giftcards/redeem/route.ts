import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { reconcileUserWallet } from "@/lib/wallet";

export async function POST(request: Request) {
  try {
    // 1. Verify user authentication
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to redeem your gift card." }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const rawCode = body?.code;

    if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
      return NextResponse.json({ error: "Please enter a valid gift card code." }, { status: 400 });
    }

    const code = rawCode.trim().toUpperCase();
    const serviceClient = createServiceClient();

    // 3. Find the gift card in database
    const { data: giftCard, error: fetchErr } = await serviceClient
      .from("gift_cards")
      .select("*")
      .ilike("code", code)
      .maybeSingle();

    if (fetchErr) {
      console.error("[giftcards/redeem] Error fetching gift card:", fetchErr);
      return NextResponse.json({ error: "Failed to verify gift card code." }, { status: 500 });
    }

    if (!giftCard) {
      return NextResponse.json({ error: "Invalid gift card code. Please check the code and try again." }, { status: 404 });
    }

    // 4. Validate status & expiration
    if (giftCard.status === "redeemed") {
      return NextResponse.json({
        error: `This gift card was already redeemed on ${giftCard.redeemed_at ? new Date(giftCard.redeemed_at).toLocaleDateString("en-IN") : "a previous date"}.`,
      }, { status: 400 });
    }

    if (giftCard.status === "disabled") {
      return NextResponse.json({ error: "This gift card code has been deactivated." }, { status: 400 });
    }

    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      return NextResponse.json({ error: "This gift card code has expired." }, { status: 400 });
    }

    // 5. Update gift card status to redeemed
    const { error: updateCardErr } = await serviceClient
      .from("gift_cards")
      .update({
        status: "redeemed",
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", giftCard.id);

    if (updateCardErr) {
      console.error("[giftcards/redeem] Error updating gift card status:", updateCardErr);
      return NextResponse.json({ error: "Failed to redeem gift card. Please try again." }, { status: 500 });
    }

    // 6. Record transaction in wallet_transactions
    const amountRupees = giftCard.amount_paise / 100;
    const { error: txnErr } = await serviceClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "cashback_credit",
        amount_paise: giftCard.amount_paise,
        note: `Redeemed Gift Card: ${giftCard.code} (+₹${amountRupees})`,
        expires_at: null, // Gift card cashbacks do not expire or follow store terms
        created_at: new Date().toISOString(),
      });

    if (txnErr) {
      console.error("[giftcards/redeem] Error logging wallet transaction:", txnErr);
    }

    // 7. Reconcile user's wallet to compute up-to-date balance
    let newBalancePaise = giftCard.amount_paise;
    try {
      const recon = await reconcileUserWallet(user.id, serviceClient);
      newBalancePaise = recon.activeBalancePaise;
    } catch (reconErr) {
      console.error("[giftcards/redeem] Error reconciling wallet:", reconErr);
      // Fallback: manually fetch and update wallet
      const { data: walletRow } = await serviceClient
        .from("wallets")
        .select("balance_paise")
        .eq("user_id", user.id)
        .maybeSingle();

      const updatedBal = (walletRow?.balance_paise || 0) + giftCard.amount_paise;
      await serviceClient
        .from("wallets")
        .upsert({
          user_id: user.id,
          balance_paise: updatedBal,
          updated_at: new Date().toISOString(),
        });
      newBalancePaise = updatedBal;
    }

    return NextResponse.json({
      success: true,
      message: `🎉 ₹${amountRupees} Gift Card successfully redeemed into your cashback wallet!`,
      amount_paise: giftCard.amount_paise,
      amount_rupees: amountRupees,
      new_balance_paise: newBalancePaise,
      new_balance_rupees: newBalancePaise / 100,
      code: giftCard.code,
    });
  } catch (err: any) {
    console.error("[giftcards/redeem] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred." }, { status: 500 });
  }
}
