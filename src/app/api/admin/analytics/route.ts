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

function getISTParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => parts.find(p => p.type === type)!.value;
  return {
    year: parseInt(getVal("year")),
    month: parseInt(getVal("month")),
    day: parseInt(getVal("day")),
    hour: parseInt(getVal("hour")),
    minute: parseInt(getVal("minute")),
    second: parseInt(getVal("second")),
  };
}

function getISTMidnight(date: Date) {
  const parts = getISTParts(date);
  return new Date(`${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T00:00:00.000+05:30`);
}

function calculatePercentChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export async function GET(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7days";

  try {
    const supabase = createServiceClient();

    // 1. Fetch DB Stats (existing counters)
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

    // 2. Fetch Storage sizes
    let supabaseStorageStats: any = null;
    try {
      const { data, error: rpcError } = await supabase.rpc("get_supabase_storage_stats");
      if (rpcError) throw rpcError;
      supabaseStorageStats = data;
    } catch (sError: any) {
      console.warn("Could not retrieve Supabase storage statistics, using estimated fallback:", sError.message || sError);
      
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

    // 3. Cloudinary statistics
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
          storage: { used: storageUsed, limit: storageLimit, percent: storagePercent },
          bandwidth: { used: bandwidthUsed, limit: bandwidthLimit, percent: bandwidthPercent },
          credits: usage.credits ? {
            used: usage.credits.usage || 0,
            limit: usage.credits.limit || 0,
            percent: usage.credits.used_percent || 0,
          } : null,
        };
      } else {
        cloudinaryStats = { error: "Cloudinary configuration missing" };
      }
    } catch (cError: any) {
      cloudinaryStats = { error: cError.message || "Failed to contact Cloudinary API" };
    }

    // 4. Fetch Order metrics
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

    // 5. Fetch all Sessions and Page Views to aggregate metrics in JS (extremely fast for current volume)
    const { data: allSessions, error: sErr } = await supabase
      .from("sessions")
      .select("*")
      .order("last_seen_at", { ascending: false });

    if (sErr) throw sErr;

    const { data: allPageViews, error: pvErr } = await supabase
      .from("page_views")
      .select("*")
      .order("created_at", { ascending: false });

    if (pvErr) throw pvErr;

    // Preserve the historic sessionHistory logic (last 100 sessions with details)
    const sessionHistory = (allSessions || []).slice(0, 100).map((session: any) => {
      const pvsForSession = (allPageViews || []).filter(pv => pv.session_id === session.id);
      return {
        ...session,
        page_views_list: pvsForSession.slice(0, 50)
      };
    });

    // 6. Calculate Time Windows
    const now = new Date();
    const parts = getISTParts(now);
    
    const istToday = getISTMidnight(now);
    const istYesterday = new Date(istToday.getTime() - 24 * 60 * 60 * 1000);
    
    const ist7DaysAgo = new Date(istToday.getTime() - 6 * 24 * 60 * 60 * 1000);
    const ist14DaysAgo = new Date(ist7DaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const ist30DaysAgo = new Date(istToday.getTime() - 29 * 24 * 60 * 60 * 1000);
    const ist60DaysAgo = new Date(ist30DaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const istMonthStart = new Date(`${parts.year}-${String(parts.month).padStart(2, "0")}-01T00:00:00.000+05:30`);
    let prevMonth = parts.month - 1;
    let prevMonthYear = parts.year;
    if (prevMonth === 0) { prevMonth = 12; prevMonthYear -= 1; }
    const istPrevMonthStart = new Date(`${prevMonthYear}-${String(prevMonth).padStart(2, "0")}-01T00:00:00.000+05:30`);
    
    const istYearStart = new Date(`${parts.year}-01-01T00:00:00.000+05:30`);
    const istPrevYearStart = new Date(`${parts.year - 1}-01-01T00:00:00.000+05:30`);

    let currentStart: Date;
    let currentEnd: Date = now;
    let prevStart: Date;
    let prevEnd: Date;
    
    if (period === "today") {
      currentStart = istToday;
      prevStart = istYesterday;
      prevEnd = istToday;
    } else if (period === "7days") {
      currentStart = ist7DaysAgo;
      prevStart = ist14DaysAgo;
      prevEnd = ist7DaysAgo;
    } else if (period === "30days") {
      currentStart = ist30DaysAgo;
      prevStart = ist60DaysAgo;
      prevEnd = ist30DaysAgo;
    } else if (period === "thismonth") {
      currentStart = istMonthStart;
      prevStart = istPrevMonthStart;
      prevEnd = istMonthStart;
    } else if (period === "thisyear") {
      currentStart = istYearStart;
      prevStart = istPrevYearStart;
      prevEnd = istYearStart;
    } else {
      // all
      currentStart = new Date(0);
      prevStart = new Date(0);
      prevEnd = new Date(0);
    }

    // Filter current and previous datasets
    const currentSessions = (allSessions || []).filter(s => {
      const lastSeen = new Date(s.last_seen_at).getTime();
      return lastSeen >= currentStart.getTime() && lastSeen <= currentEnd.getTime();
    });

    const prevSessions = (allSessions || []).filter(s => {
      const lastSeen = new Date(s.last_seen_at).getTime();
      return lastSeen >= prevStart.getTime() && lastSeen < prevEnd.getTime();
    });

    const currentPVs = (allPageViews || []).filter(pv => {
      const created = new Date(pv.created_at).getTime();
      return created >= currentStart.getTime() && created <= currentEnd.getTime();
    });

    const prevPVs = (allPageViews || []).filter(pv => {
      const created = new Date(pv.created_at).getTime();
      return created >= prevStart.getTime() && created < prevEnd.getTime();
    });

    // 7. Calculate total website views KPI (Today, Week, Month, All Time)
    const todayViews = (allPageViews || []).filter(pv => new Date(pv.created_at).getTime() >= istToday.getTime()).length;
    const weekViews = (allPageViews || []).filter(pv => new Date(pv.created_at).getTime() >= ist7DaysAgo.getTime()).length;
    const monthViews = (allPageViews || []).filter(pv => new Date(pv.created_at).getTime() >= istMonthStart.getTime()).length;
    const allTimeViews = (allPageViews || []).length;

    const viewsBreakdown = { today: todayViews, week: weekViews, month: monthViews, allTime: allTimeViews };

    // Unique Visitors breakdown
    const todayUnique = new Set((allSessions || []).filter(s => new Date(s.last_seen_at).getTime() >= istToday.getTime()).map(s => s.visitor_id)).size;
    const weekUnique = new Set((allSessions || []).filter(s => new Date(s.last_seen_at).getTime() >= ist7DaysAgo.getTime()).map(s => s.visitor_id)).size;
    const monthUnique = new Set((allSessions || []).filter(s => new Date(s.last_seen_at).getTime() >= istMonthStart.getTime()).map(s => s.visitor_id)).size;
    const allTimeUnique = new Set((allSessions || []).map(s => s.visitor_id)).size;

    const uniqueBreakdown = { today: todayUnique, week: weekUnique, month: monthUnique, allTime: allTimeUnique };

    // Period specific totals
    const totalViews = currentPVs.length;
    const prevViews = prevPVs.length;
    const viewsChange = calculatePercentChange(totalViews, prevViews);

    const currentUniqueSet = new Set(currentSessions.map(s => s.visitor_id));
    const uniqueVisitors = currentUniqueSet.size;
    const prevUniqueSet = new Set(prevSessions.map(s => s.visitor_id));
    const prevUnique = prevUniqueSet.size;
    const uniqueChange = calculatePercentChange(uniqueVisitors, prevUnique);

    // New vs Returning visitors
    const firstSeenMap = new Map<string, number>();
    (allSessions || []).forEach(s => {
      const started = new Date(s.started_at).getTime();
      if (!firstSeenMap.has(s.visitor_id) || started < firstSeenMap.get(s.visitor_id)!) {
        firstSeenMap.set(s.visitor_id, started);
      }
    });

    let newVisitors = 0;
    let returningVisitors = 0;
    Array.from(currentUniqueSet).forEach(vid => {
      const firstSeen = firstSeenMap.get(vid) || 0;
      if (firstSeen >= currentStart.getTime()) {
        newVisitors++;
      } else {
        returningVisitors++;
      }
    });

    // Average Session Duration
    let totalDurationMs = 0;
    currentSessions.forEach(s => {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.last_seen_at).getTime();
      totalDurationMs += Math.max(0, end - start);
    });
    const averageSessionDuration = currentSessions.length > 0 ? Math.round(totalDurationMs / currentSessions.length / 1000) : 0;

    // Pages per Session
    const totalPageViewsInSessions = currentSessions.reduce((sum, s) => sum + (s.page_views || 0), 0);
    const pagesPerSession = currentSessions.length > 0 ? Math.round((totalPageViewsInSessions / currentSessions.length) * 10) / 10 : 0;

    // Bounce Rate
    const bouncedSessions = currentSessions.filter(s => (s.page_views || 0) <= 1).length;
    const bounceRate = currentSessions.length > 0 ? Math.round((bouncedSessions / currentSessions.length) * 100) : 0;

    // 8. Top Viewed Pages
    const pageCounts = new Map<string, { views: number; uniqueSet: Set<string> }>();
    currentPVs.forEach(pv => {
      const session = (allSessions || []).find(s => s.id === pv.session_id);
      const visitorId = session ? session.visitor_id : "unknown";
      
      if (!pageCounts.has(pv.path)) {
        pageCounts.set(pv.path, { views: 0, uniqueSet: new Set() });
      }
      const data = pageCounts.get(pv.path)!;
      data.views++;
      data.uniqueSet.add(visitorId);
    });

    const topPages = Array.from(pageCounts.entries())
      .map(([path, data]) => ({
        path,
        views: data.views,
        unique: data.uniqueSet.size
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // 9. Traffic Sources
    const sourcesCounts = { Google: 0, Direct: 0, Instagram: 0, Facebook: 0, WhatsApp: 0, Other: 0 };
    currentSessions.forEach(s => {
      const ref = (s.referrer || "").toLowerCase();
      if (ref.includes("google") || ref.includes("android-app://com.google")) {
        sourcesCounts.Google++;
      } else if (ref.includes("instagram") || ref.includes("ig")) {
        sourcesCounts.Instagram++;
      } else if (ref.includes("facebook") || ref.includes("fb")) {
        sourcesCounts.Facebook++;
      } else if (ref.includes("whatsapp") || ref.includes("wa.me")) {
        sourcesCounts.WhatsApp++;
      } else if (ref.includes("direct") || ref.trim() === "" || ref.trim() === "direct") {
        sourcesCounts.Direct++;
      } else {
        sourcesCounts.Other++;
      }
    });

    const totalSourceCount = currentSessions.length || 1;
    const trafficSources = Object.entries(sourcesCounts).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalSourceCount) * 100)
    })).sort((a, b) => b.count - a.count);

    // 10. Devices Share
    const deviceCounts = { Mobile: 0, Desktop: 0, Tablet: 0 };
    currentSessions.forEach(s => {
      const dev = (s.device || "desktop").toLowerCase();
      if (dev.includes("mobile") || dev.includes("phone")) {
        deviceCounts.Mobile++;
      } else if (dev.includes("tablet") || dev.includes("ipad")) {
        deviceCounts.Tablet++;
      } else {
        deviceCounts.Desktop++;
      }
    });

    const totalDeviceCount = currentSessions.length || 1;
    const devices = Object.entries(deviceCounts).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalDeviceCount) * 100)
    }));

    // 11. Geographic Location share
    const locationCounts = new Map<string, { country: string; region: string; city: string; count: number }>();
    currentSessions.forEach(s => {
      const geo = s.country || "India";
      const geoParts = geo.split("|").map((p: string) => p.trim());
      const country = geoParts[0] || "India";
      const region = geoParts[1] || "Unknown Region";
      const city = geoParts[2] || "";
      
      const key = `${country}-${region}-${city}`;
      if (!locationCounts.has(key)) {
        locationCounts.set(key, { country, region, city, count: 0 });
      }
      locationCounts.get(key)!.count++;
    });

    const locations = Array.from(locationCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 12. Peak Traffic times
    const hoursCount = Array(24).fill(0);
    const weekdaysCount = Array(7).fill(0);
    
    currentPVs.forEach(pv => {
      const d = new Date(pv.created_at);
      const p = getISTParts(d);
      hoursCount[p.hour]++;
      weekdaysCount[d.getDay()]++;
    });

    let maxHour = 0;
    let maxHourVal = -1;
    for (let i = 0; i < 24; i++) {
      if (hoursCount[i] > maxHourVal) {
        maxHourVal = hoursCount[i];
        maxHour = i;
      }
    }

    const formatHour = (h: number) => {
      const hr = h % 12 || 12;
      const ampm = h < 12 ? "AM" : "PM";
      return `${hr} ${ampm}`;
    };

    const peakHourStr = maxHourVal > 0 ? `${formatHour(maxHour)} – ${formatHour((maxHour + 2) % 24)}` : "N/A";

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let maxDay = 0;
    let maxDayVal = -1;
    for (let i = 0; i < 7; i++) {
      if (weekdaysCount[i] > maxDayVal) {
        maxDayVal = weekdaysCount[i];
        maxDay = i;
      }
    }

    const peakDayStr = maxDayVal > 0 ? weekdays[maxDay] : "N/A";
    const peakTraffic = { hour: peakHourStr, day: peakDayStr };

    // 13. Graph Data preparation
    let graphData: any[] = [];
    if (period === "today") {
      const currentHourPVs = Array(24).fill(0);
      currentPVs.forEach(pv => {
        const hr = getISTParts(new Date(pv.created_at)).hour;
        currentHourPVs[hr]++;
      });

      const prevHourPVs = Array(24).fill(0);
      prevPVs.forEach(pv => {
        const hr = getISTParts(new Date(pv.created_at)).hour;
        prevHourPVs[hr]++;
      });

      graphData = Array.from({ length: 24 }, (_, i) => {
        const hr = i % 12 || 12;
        const ampm = i < 12 ? "AM" : "PM";
        return {
          label: `${hr} ${ampm}`,
          value: currentHourPVs[i],
          prevValue: prevHourPVs[i]
        };
      });
    } else if (period === "7days") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(istToday.getTime() - i * 24 * 60 * 60 * 1000);
        const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
        const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        const tStart = getISTMidnight(d).getTime();
        const tEnd = tStart + 24 * 60 * 60 * 1000;
        
        const val = currentPVs.filter(pv => {
          const t = new Date(pv.created_at).getTime();
          return t >= tStart && t < tEnd;
        }).length;
        
        const prevTStart = tStart - 7 * 24 * 60 * 60 * 1000;
        const prevTEnd = tEnd - 7 * 24 * 60 * 60 * 1000;
        const prevVal = prevPVs.filter(pv => {
          const t = new Date(pv.created_at).getTime();
          return t >= prevTStart && t < prevTEnd;
        }).length;
        
        graphData.push({
          label: dayName,
          dateStr,
          value: val,
          prevValue: prevVal
        });
      }
    } else if (period === "30days") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(istToday.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        const tStart = getISTMidnight(d).getTime();
        const tEnd = tStart + 24 * 60 * 60 * 1000;
        
        const val = currentPVs.filter(pv => {
          const t = new Date(pv.created_at).getTime();
          return t >= tStart && t < tEnd;
        }).length;
        
        const prevTStart = tStart - 30 * 24 * 60 * 60 * 1000;
        const prevTEnd = tEnd - 30 * 24 * 60 * 60 * 1000;
        const prevVal = prevPVs.filter(pv => {
          const t = new Date(pv.created_at).getTime();
          return t >= prevTStart && t < prevTEnd;
        }).length;
        
        graphData.push({
          label: dateStr,
          value: val,
          prevValue: prevVal
        });
      }
    } else if (period === "thismonth") {
      const daysInMonth = new Date(parts.year, parts.month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const tStart = new Date(`${parts.year}-${String(parts.month).padStart(2, "0")}-${String(i).padStart(2, "0")}T00:00:00.000+05:30`).getTime();
        const tEnd = tStart + 24 * 60 * 60 * 1000;
        
        const val = currentPVs.filter(pv => {
          const t = new Date(pv.created_at).getTime();
          return t >= tStart && t < tEnd;
        }).length;
        
        let prevMonthVal = 0;
        const prevMonthParts = getISTParts(istPrevMonthStart);
        const daysInPrevMonth = new Date(prevMonthParts.year, prevMonthParts.month, 0).getDate();
        if (i <= daysInPrevMonth) {
          const prevTStart = new Date(`${prevMonthParts.year}-${String(prevMonthParts.month).padStart(2, "0")}-${String(i).padStart(2, "0")}T00:00:00.000+05:30`).getTime();
          const prevTEnd = prevTStart + 24 * 60 * 60 * 1000;
          prevMonthVal = prevPVs.filter(pv => {
            const t = new Date(pv.created_at).getTime();
            return t >= prevTStart && t < prevTEnd;
          }).length;
        }
        
        graphData.push({
          label: `${i}`,
          value: val,
          prevValue: prevMonthVal
        });
      }
    } else if (period === "thisyear") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      graphData = monthNames.map((name, i) => {
        const val = currentPVs.filter(pv => {
          const d = new Date(pv.created_at);
          const p = getISTParts(d);
          return p.year === parts.year && p.month === i + 1;
        }).length;
        
        const prevVal = prevPVs.filter(pv => {
          const d = new Date(pv.created_at);
          const p = getISTParts(d);
          return p.year === parts.year - 1 && p.month === i + 1;
        }).length;
        
        return { label: name, value: val, prevValue: prevVal };
      });
    } else {
      // Group by month of the last 12 calendar months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        const yr = d.getFullYear();
        const m = d.getMonth();
        
        const val = (allPageViews || []).filter(pv => {
          const p = getISTParts(new Date(pv.created_at));
          return p.year === yr && p.month === m + 1;
        }).length;
        
        graphData.push({ label, value: val, prevValue: 0 });
      }
    }

    // 14. Live Activity logs
    const last25PVs = (allPageViews || []).slice(0, 25);
    const liveActivity = last25PVs.map(pv => {
      const session = (allSessions || []).find(s => s.id === pv.session_id);
      const visitorId = session ? session.visitor_id : "";
      const shortAnonId = visitorId ? visitorId.slice(0, 4).toUpperCase() : "XXXX";
      
      let action = `viewed ${pv.path}`;
      if (pv.path === "/") {
        action = "viewed Home";
      } else if (pv.path.startsWith("/product/")) {
        const slug = pv.path.split("/")[2]?.split("?")[0] || "";
        const name = slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        action = `opened Product: ${name}`;
      } else if (pv.path.startsWith("/shop")) {
        const category = pv.path.split("?")[0].split("/")[2];
        if (category) {
          const name = category.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          action = `viewed Category: ${name}`;
        } else {
          action = "viewed Shop";
        }
      } else if (pv.path.startsWith("/action/add-to-cart")) {
        const match = pv.path.match(/product=([^&]+)/);
        const productName = match ? decodeURIComponent(match[1]) : "Product";
        action = `added product to cart: ${productName}`;
      } else if (pv.path === "/checkout") {
        action = "started checkout";
      } else if (pv.path.startsWith("/checkout/success")) {
        action = "completed checkout/order";
      } else if (pv.path === "/cart") {
        action = "viewed Cart";
      } else if (pv.path === "/contact") {
        action = "viewed Contact page";
      } else if (pv.path === "/about") {
        action = "viewed About page";
      }
      
      return {
        id: pv.id,
        text: `Visitor #${shortAnonId} ${action}`,
        timestamp: pv.created_at
      };
    });

    // 15. Live Visitors count (last 3 minutes)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const liveSessions = (allSessions || []).filter(s => s.last_seen_at >= threeMinutesAgo);
    const liveVisitors = new Set(liveSessions.map(s => s.visitor_id)).size;

    // Compiled period analytics
    const periodStats = {
      selectedPeriod: period,
      totalViews,
      viewsChange,
      viewsBreakdown,
      uniqueVisitors,
      uniqueChange,
      uniqueBreakdown,
      newVisitors,
      returningVisitors,
      averageSessionDuration,
      pagesPerSession,
      bounceRate,
      topPages,
      trafficSources,
      devices,
      locations,
      peakTraffic,
      graphData,
      liveActivity,
      liveVisitors,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      dbStats,
      cloudinaryStats,
      supabaseStorageStats,
      sessionHistory: sessionHistory || [],
      metrics,
      periodStats
    });
  } catch (error: any) {
    console.error("Fetch admin analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    
    // Clear sessions (which cascades to page_views)
    const { error } = await supabase
      .from("sessions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all rows
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

