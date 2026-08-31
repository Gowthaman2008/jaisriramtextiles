import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "all";
    const exportCsv = url.searchParams.get("export") === "true";

    const supabase = createServiceClient();

    // 1. Fetch profiles, addresses, orders, newsletter subscriptions, and unsubscribes
    const [profilesRes, ordersRes, newsletterRes, unsubscribesRes] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, email, phone, created_at"),
      supabase.from("orders").select("id, user_id, total_paise, placed_at"),
      supabase.from("newsletter_subscriptions").select("email, created_at"),
      supabase.from("email_unsubscribes").select("email, created_at, reason"),
    ]);

    const profiles = profilesRes.data || [];
    const orders = ordersRes.data || [];
    const newsletterSubs = newsletterRes.data || [];
    const unsubscribes = (unsubscribesRes as any)?.data || [];

    const unsubscribedMap = new Map();
    unsubscribes.forEach((u: any) => {
      unsubscribedMap.set((u.email || "").toLowerCase().trim(), u);
    });

    const ordersByUser: Record<string, { totalOrders: number; totalSpendingPaise: number; lastOrderAt?: string }> = {};
    orders.forEach((o: any) => {
      if (!o.user_id) return;
      if (!ordersByUser[o.user_id]) {
        ordersByUser[o.user_id] = { totalOrders: 0, totalSpendingPaise: 0 };
      }
      ordersByUser[o.user_id].totalOrders += 1;
      ordersByUser[o.user_id].totalSpendingPaise += o.total_paise || 0;
      if (!ordersByUser[o.user_id].lastOrderAt || new Date(o.placed_at) > new Date(ordersByUser[o.user_id].lastOrderAt!)) {
        ordersByUser[o.user_id].lastOrderAt = o.placed_at;
      }
    });

    const subscribersMap: Map<string, any> = new Map();

    profiles.forEach((p: any) => {
      const email = (p.email || "").toLowerCase().trim();
      if (!email) return;

      const orderData = ordersByUser[p.id] || { totalOrders: 0, totalSpendingPaise: 0 };
      const isUnsub = unsubscribedMap.has(email);

      subscribersMap.set(email, {
        id: p.id,
        user_id: p.user_id || p.id,
        email,
        name: p.full_name || "Customer",
        phone: p.phone || "",
        status: isUnsub ? "unsubscribed" : "subscribed",
        marketing_opt_in: !isUnsub,
        total_orders: orderData.totalOrders,
        total_spending_paise: orderData.totalSpendingPaise,
        last_order_at: orderData.lastOrderAt || null,
        created_at: p.created_at,
      });
    });

    // Also include newsletter-only subscribers
    newsletterSubs.forEach((sub: any) => {
      const email = (sub.email || "").toLowerCase().trim();
      if (email && !subscribersMap.has(email)) {
        const isUnsub = unsubscribedMap.has(email);
        subscribersMap.set(email, {
          id: `sub_${email}`,
          user_id: null,
          email,
          name: "Subscriber",
          phone: "",
          status: isUnsub ? "unsubscribed" : "subscribed",
          marketing_opt_in: !isUnsub,
          total_orders: 0,
          total_spending_paise: 0,
          last_order_at: null,
          created_at: sub.created_at,
        });
      }
    });

    let subscribers = Array.from(subscribersMap.values());

    // Apply filtering
    if (status && status !== "all") {
      subscribers = subscribers.filter((s) => s.status === status);
    }

    if (search) {
      const term = search.toLowerCase();
      subscribers = subscribers.filter(
        (s) => s.email.includes(term) || (s.name || "").toLowerCase().includes(term) || (s.phone || "").includes(term)
      );
    }

    // CSV Export
    if (exportCsv) {
      let csv = "Email,Name,Phone,Status,Marketing Opt-In,Total Orders,Total Spent (INR),Last Order Date,Subscribed On\n";
      subscribers.forEach((s) => {
        csv += `"${s.email}","${s.name}","${s.phone}","${s.status}","${s.marketing_opt_in ? "YES" : "NO"}","${s.total_orders}","${(s.total_spending_paise / 100).toFixed(0)}","${s.last_order_at || ""}","${s.created_at}"\n`;
      });

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="subscribers-export.csv"`,
        },
      });
    }

    return NextResponse.json(subscribers);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createServiceClient();
    const { email, status, reason } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (status === "unsubscribed") {
      // Record unsubscribe
      await supabase.from("email_unsubscribes").upsert({
        email: cleanEmail,
        reason: reason || "Admin manual opt-out",
        created_at: new Date().toISOString(),
      });
    } else if (status === "subscribed") {
      // Remove from unsubscription table
      await supabase.from("email_unsubscribes").delete().eq("email", cleanEmail);
    }

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        action: "subscriber.status_change",
        entity: "subscribers",
        meta: { email: cleanEmail, new_status: status },
      });
    } catch {}

    return NextResponse.json({ success: true, email: cleanEmail, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
