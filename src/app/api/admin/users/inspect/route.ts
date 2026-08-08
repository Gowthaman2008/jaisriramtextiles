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
    const userId = searchParams.get("userId")?.trim().toUpperCase();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1.5. Fetch auth details from supabase auth admin API
    let authDetails = null;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      if (authUser?.user) {
        authDetails = {
          last_sign_in_at: authUser.user.last_sign_in_at,
          email_confirmed_at: authUser.user.email_confirmed_at,
          phone_confirmed_at: authUser.user.phone_confirmed_at,
          user_metadata: authUser.user.user_metadata || {}
        };
      }
    } catch (e) {
      console.error("Fetch auth user error:", e);
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
      .neq("payment_status", "created")
      .order("placed_at", { ascending: false });

    if (ordersError) throw ordersError;

    // 6. Fetch browsing sessions for website usage stats
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("started_at, last_seen_at, page_views, device, browser, page_views_list:page_views(id, path, created_at)")
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

    const allPageViews: any[] = [];
    sessionList.forEach((session: any) => {
      if (session.page_views_list && Array.isArray(session.page_views_list)) {
        allPageViews.push(...session.page_views_list);
      }
    });

    const productViewsMap: Record<string, number> = {};
    let totalProductViews = 0;
    
    allPageViews.forEach((pv: any) => {
      const path = pv.path || "";
      if (path.startsWith("/product/")) {
        const slug = path.replace("/product/", "").split("?")[0].split("#")[0];
        if (slug) {
          productViewsMap[slug] = (productViewsMap[slug] || 0) + 1;
          totalProductViews++;
        }
      }
    });

    const sortedProductViews = Object.entries(productViewsMap)
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count);

    const distinctProductsViewed = sortedProductViews.length;

    const topProductsWithDetails = await Promise.all(
      sortedProductViews.slice(0, 3).map(async (pv) => {
        const { data: product } = await supabase
          .from("products")
          .select(`
            name, slug, price_paise,
            product_images (url)
          `)
          .eq("slug", pv.slug)
          .maybeSingle();
        return {
          slug: pv.slug,
          views: pv.count,
          name: product?.name || pv.slug,
          image: product?.product_images?.[0]?.url || null,
          price_paise: product?.price_paise || null
        };
      })
    );

    // 6.5. Fetch user support tickets and replies
    const { data: tickets, error: ticketsError } = await supabase
      .from("support_messages")
      .select("*")
      .or(`user_id.eq.${profile.id},email.eq.${profile.email}`)
      .order("created_at", { ascending: false });

    if (ticketsError) throw ticketsError;

    const ticketsWithReplies = await Promise.all(
      (tickets || []).map(async (ticket) => {
        const { data: replies } = await supabase
          .from("support_message_replies")
          .select("*")
          .eq("message_id", ticket.id)
          .order("created_at", { ascending: true });
        return {
          ...ticket,
          replies: replies || [],
        };
      })
    );

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
      authDetails,
      wallet: wallet || { balance_paise: 0 },
      walletTransactions: walletTransactions || [],
      addresses: addresses || [],
      orders: ordersList,
      tickets: ticketsWithReplies,
      sessions: sessionList,
      usage: {
        totalSessions,
        totalPageViews,
        totalSecondsSpent,
        lastVisitAt,
        totalProductViews,
        distinctProductsViewed,
        topProducts: topProductsWithDetails,
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
