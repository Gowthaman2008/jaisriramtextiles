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

export async function GET(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Fetch user wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (walletError) throw walletError;

    // 3. Fetch wallet transaction history
    const { data: walletTransactions, error: txnError } = await supabase
      .from("wallet_transactions")
      .select("*, orders(order_number)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (txnError) throw txnError;

    // 4. Fetch saved addresses
    const { data: addresses, error: addrError } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", profile.id)
      .order("is_default", { ascending: false });

    if (addrError) throw addrError;

    // 5. Fetch orders and item details
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", profile.id)
      .order("placed_at", { ascending: false });

    if (ordersError) throw ordersError;

    // 6. Fetch browsing sessions for website usage stats
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("started_at, last_seen_at, page_views, device, browser")
      .eq("user_id", profile.id)
      .order("started_at", { ascending: false });

    if (sessionsError) throw sessionsError;

    const sessionList = sessions || [];
    const totalSessions = sessionList.length;
    const totalPageViews = sessionList.reduce((sum, s) => sum + (s.page_views || 0), 0);
    const totalSecondsSpent = sessionList.reduce((sum, s) => {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.last_seen_at).getTime();
      return sum + Math.max(0, (end - start) / 1000);
    }, 0);
    const lastVisitAt = sessionList[0]?.last_seen_at || null;

    // 7. Compute lifetime stats
    const ordersList = orders || [];
    const lifetimeOrders = ordersList.length;
    const lifetimeReturns = ordersList.filter((o) => o.status === "returned").length;
    const lifetimeRejected = ordersList.filter((o) => o.status === "rejected").length;
    const lifetimeSpentPaise = ordersList.reduce((sum, o) => sum + (o.total_paise || 0), 0);
    const lifetimeCashbackEarnedPaise = (walletTransactions || [])
      .filter((t) => t.type === "cashback_credit")
      .reduce((sum, t) => sum + t.amount_paise, 0);

    return NextResponse.json({
      profile,
      wallet: wallet || { balance_paise: 0 },
      walletTransactions: walletTransactions || [],
      addresses: addresses || [],
      orders: ordersList,
      usage: {
        totalSessions,
        totalPageViews,
        totalSecondsSpent,
        lastVisitAt,
      },
      lifetime: {
        orders: lifetimeOrders,
        returns: lifetimeReturns,
        rejected: lifetimeRejected,
        spentPaise: lifetimeSpentPaise,
        cashbackEarnedPaise: lifetimeCashbackEarnedPaise,
      },
    });
  } catch (error: any) {
    console.error("Inspect user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
