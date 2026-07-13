import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import cloudinary from "@/lib/cloudinary";

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

export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const [
      { count: countProfiles },
      { count: countProducts },
      { count: countOrders },
      { count: countSessions },
      { count: countPageViews },
      { count: countActiveSessions },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).neq("payment_status", "created"),
      supabase.from("sessions").select("*", { count: "exact", head: true }),
      supabase.from("page_views").select("*", { count: "exact", head: true }),
      supabase.from("sessions").select("*", { count: "exact", head: true }).gt("last_seen_at", fifteenMinutesAgo),
    ]);

    const dbStats = {
      users: countProfiles || 0,
      products: countProducts || 0,
      orders: countOrders || 0,
      sessions: countSessions || 0,
      pageViews: countPageViews || 0,
      activeSessions: countActiveSessions || 0,
    };

    // 2. Fetch Supabase storage and database size metrics
    let supabaseStorageStats: any = null;
    try {
      const { data, error: rpcError } = await supabase.rpc("get_supabase_storage_stats");
      if (rpcError) throw rpcError;
      supabaseStorageStats = data;
    } catch (sError: any) {
      console.warn("Could not retrieve Supabase storage statistics, using estimated fallback:", sError.message || sError);
      
      // Calculate a realistic estimate of database size based on row counts
      // Minimum size is ~1.5 MB for postgres system catalogs + schema overhead.
      // Average sizes per row: users: 500B, products: 1KB, orders: 2KB, sessions: 1KB, pageViews: 500B
      const estimatedDbBytes = Math.max(1024 * 1024 * 1.5, Math.round(
        dbStats.users * 500 + 
        dbStats.products * 1000 + 
        dbStats.orders * 2000 + 
        dbStats.sessions * 1000 + 
        dbStats.pageViews * 500
      ));

      supabaseStorageStats = {
        db_size_bytes: estimatedDbBytes,
        storage_size_bytes: 0,
        is_estimated: true
      };
    }

    // 3. Fetch Cloudinary usage details (handle missing config gracefully)
    let cloudinaryStats: any = null;
    try {
      if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        const usage = await cloudinary.api.usage();
        
        const storageLimit = usage.storage?.limit || 0;
        const storageUsed = usage.storage?.usage || 0;
        const storagePercent = usage.storage?.used_percent || (storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0);

        const bandwidthLimit = usage.bandwidth?.limit || 0;
        const bandwidthUsed = usage.bandwidth?.usage || 0;
        const bandwidthPercent = usage.bandwidth?.used_percent || (bandwidthLimit > 0 ? Math.round((bandwidthUsed / bandwidthLimit) * 100) : 0);

        cloudinaryStats = {
          plan: usage.plan,
          lastUpdated: usage.last_updated,
          storage: {
            used: storageUsed,
            limit: storageLimit,
            percent: storagePercent,
          },
          bandwidth: {
            used: bandwidthUsed,
            limit: bandwidthLimit,
            percent: bandwidthPercent,
          },
          credits: usage.credits ? {
            used: usage.credits.usage || 0,
            limit: usage.credits.limit || 0,
            percent: usage.credits.used_percent || 0,
          } : null,
        };
      } else {
        console.warn("Cloudinary API Key or Secret is missing from environment variables");
        cloudinaryStats = {
          error: "Cloudinary API Key or Secret is missing from environment variables (.env.local)",
        };
      }
    } catch (cError: any) {
      console.error("Could not retrieve Cloudinary usage statistics:", cError);
      cloudinaryStats = {
        error: cError.message || "Failed to contact Cloudinary API server",
      };
    }

    // 3. Fetch visitor session history with profiles and page views (last 100 sessions)
    const { data: sessionHistory, error: sessionsError } = await supabase
      .from("sessions")
      .select(`
        id,
        visitor_id,
        user_id,
        device,
        browser,
        os,
        country,
        referrer,
        started_at,
        last_seen_at,
        page_views,
        profiles (full_name, email),
        page_views_list:page_views (id, path, created_at)
      `)
      .order("last_seen_at", { ascending: false })
      .limit(100);

    if (sessionsError) throw sessionsError;

    // 4. Calculate some high-level admin metrics
    // Fetch sum of all order totals (in paise) and count
    const { data: salesSumData } = await supabase
      .from("orders")
      .select("total_paise")
      .eq("payment_status", "paid");

    const totalSalesPaise = (salesSumData || []).reduce((sum, ord) => sum + ord.total_paise, 0);
    const completedOrdersCount = (salesSumData || []).length;
    const avgOrderValPaise = completedOrdersCount > 0 ? Math.round(totalSalesPaise / completedOrdersCount) : 0;

    const metrics = {
      totalSalesPaise,
      completedOrdersCount,
      avgOrderValPaise,
    };

    return NextResponse.json({
      dbStats,
      cloudinaryStats,
      supabaseStorageStats,
      sessionHistory: sessionHistory || [],
      metrics,
    });
  } catch (error: any) {
    console.error("Fetch admin analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
