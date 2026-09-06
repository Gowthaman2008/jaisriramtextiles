import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ authenticated: false, giftCards: [] });
    }

    const serviceClient = createServiceClient();
    const { data: giftCards, error } = await serviceClient
      .from("gift_cards")
      .select("id, code, amount_paise, status, platform, order_reference, review_screenshot_url, created_at, expires_at, redeemed_at")
      .or(`user_id.eq.${user.id},created_by.eq.${user.id},redeemed_by.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch user gift cards history error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      authenticated: true,
      giftCards: giftCards || [],
    });
  } catch (err: any) {
    console.error("Gift card history API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
