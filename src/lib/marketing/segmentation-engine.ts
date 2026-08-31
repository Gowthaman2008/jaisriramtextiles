import { createServiceClient } from "@/lib/supabase/admin";
import { FilterRuleGroup, FilterCondition } from "./types";

export interface EvaluatedRecipient {
  userId?: string | null;
  email: string;
  fullName?: string;
  phone?: string;
  city?: string;
  state?: string;
  totalOrders: number;
  totalSpendingRupees: number;
  lastOrderDate?: string;
  marketingConsent: boolean;
}

export async function evaluateAudience(options: {
  audienceType: string;
  segmentId?: string | null;
  filterRules?: FilterRuleGroup | null;
  selectedUserIds?: string[];
}): Promise<{
  recipients: EvaluatedRecipient[];
  totalMatched: number;
  totalEligible: number;
  unsubscribedCount: number;
  invalidEmailCount: number;
}> {
  const supabase = createServiceClient();
  const { audienceType, segmentId, filterRules, selectedUserIds } = options;

  // 1. Fetch all profiles, addresses, orders, and unsubscribed emails
  const [profilesRes, addressesRes, ordersRes, newsletterRes, unsubscribedRes] = await Promise.all([
    supabase.from("profiles").select("id, user_id, full_name, email, phone, role, provider, created_at"),
    supabase.from("addresses").select("user_id, city, state, pincode, is_default"),
    supabase.from("orders").select("id, user_id, status, total_paise, subtotal_paise, placed_at, shipping_address, order_items(product_id, name)"),
    supabase.from("newsletter_subscriptions").select("email, created_at"),
    supabase.from("email_unsubscribes").select("email"),
  ]);

  const profiles = profilesRes.data || [];
  const addresses = addressesRes.data || [];
  const orders = ordersRes.data || [];
  const newsletterSubs = newsletterRes.data || [];
  const unsubscribedSet = new Set(
    ((unsubscribedRes as any)?.data || []).map((u: any) => (u.email || "").toLowerCase().trim())
  );

  // Group default addresses by user_id
  const addressByUser: Record<string, { city?: string; state?: string; pincode?: string }> = {};
  addresses.forEach((addr: any) => {
    if (addr.user_id && (!addressByUser[addr.user_id] || addr.is_default)) {
      addressByUser[addr.user_id] = {
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
      };
    }
  });

  // Group orders and compute user aggregate metrics
  const userOrderMetrics: Record<
    string,
    {
      totalOrders: number;
      totalSpendingRupees: number;
      lastOrderDate?: string;
      purchasedProductIds: Set<string>;
      orderStatuses: Set<string>;
      states: Set<string>;
      cities: Set<string>;
    }
  > = {};

  orders.forEach((order: any) => {
    const uid = order.user_id;
    if (!uid) return;

    if (!userOrderMetrics[uid]) {
      userOrderMetrics[uid] = {
        totalOrders: 0,
        totalSpendingRupees: 0,
        purchasedProductIds: new Set(),
        orderStatuses: new Set(),
        states: new Set(),
        cities: new Set(),
      };
    }

    const metric = userOrderMetrics[uid];
    metric.totalOrders += 1;
    metric.totalSpendingRupees += (order.total_paise || 0) / 100;
    metric.orderStatuses.add(order.status);

    if (!metric.lastOrderDate || new Date(order.placed_at) > new Date(metric.lastOrderDate)) {
      metric.lastOrderDate = order.placed_at;
    }

    if (order.shipping_address) {
      if (order.shipping_address.state) metric.states.add(order.shipping_address.state.toLowerCase());
      if (order.shipping_address.city) metric.cities.add(order.shipping_address.city.toLowerCase());
    }

    if (Array.isArray(order.order_items)) {
      order.order_items.forEach((item: any) => {
        if (item.product_id) metric.purchasedProductIds.add(item.product_id);
      });
    }
  });

  // Build candidate user pool with consolidated metrics
  const candidateMap: Map<string, EvaluatedRecipient> = new Map();

  profiles.forEach((p: any) => {
    const email = (p.email || "").toLowerCase().trim();
    if (!email) return;

    const addr = addressByUser[p.id] || {};
    const metrics = userOrderMetrics[p.id] || {
      totalOrders: 0,
      totalSpendingRupees: 0,
      purchasedProductIds: new Set(),
      orderStatuses: new Set(),
      states: new Set(),
      cities: new Set(),
    };

    candidateMap.set(email, {
      userId: p.id,
      email,
      fullName: p.full_name || "",
      phone: p.phone || "",
      city: addr.city || "",
      state: addr.state || "",
      totalOrders: metrics.totalOrders,
      totalSpendingRupees: metrics.totalSpendingRupees,
      lastOrderDate: metrics.lastOrderDate,
      marketingConsent: true,
    });
  });

  // Also include newsletter-only subscribers who may not have registered accounts yet
  newsletterSubs.forEach((sub: any) => {
    const email = (sub.email || "").toLowerCase().trim();
    if (email && !candidateMap.has(email)) {
      candidateMap.set(email, {
        userId: null,
        email,
        fullName: "Subscriber",
        phone: "",
        city: "",
        state: "",
        totalOrders: 0,
        totalSpendingRupees: 0,
        marketingConsent: true,
      });
    }
  });

  const allCandidates = Array.from(candidateMap.values());

  // Determine effective filter rules
  let effectiveRules: FilterRuleGroup | null = null;

  if (audienceType === "custom_filter" && filterRules) {
    effectiveRules = filterRules;
  } else if (audienceType === "segment" && segmentId) {
    const { data: segment } = await supabase
      .from("email_segments")
      .select("filter_rules")
      .eq("id", segmentId)
      .maybeSingle();
    if (segment?.filter_rules) {
      effectiveRules = segment.filter_rules;
    }
  }

  // Filter based on audience type
  let matchedList: EvaluatedRecipient[] = [];

  if (audienceType === "all_users") {
    matchedList = allCandidates;
  } else if (audienceType === "subscribers_only") {
    matchedList = allCandidates.filter((u) => u.marketingConsent);
  } else if (audienceType === "selected_users" && selectedUserIds) {
    const idSet = new Set(selectedUserIds);
    matchedList = allCandidates.filter((u) => u.userId && idSet.has(u.userId));
  } else if (effectiveRules && effectiveRules.conditions && effectiveRules.conditions.length > 0) {
    matchedList = allCandidates.filter((u) => {
      const results = effectiveRules!.conditions.map((cond) => evaluateCondition(u, cond));
      if (effectiveRules!.combinator === "OR") {
        return results.some(Boolean);
      }
      return results.every(Boolean);
    });
  } else {
    matchedList = allCandidates;
  }

  // Calculate exclusions: Unsubscribed & Invalid emails
  let unsubscribedCount = 0;
  let invalidEmailCount = 0;
  const eligibleRecipients: EvaluatedRecipient[] = [];

  matchedList.forEach((u) => {
    const email = u.email.toLowerCase().trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      invalidEmailCount++;
      return;
    }

    if (unsubscribedSet.has(email)) {
      unsubscribedCount++;
      return;
    }

    eligibleRecipients.push(u);
  });

  return {
    recipients: eligibleRecipients,
    totalMatched: matchedList.length,
    totalEligible: eligibleRecipients.length,
    unsubscribedCount,
    invalidEmailCount,
  };
}

function evaluateCondition(user: EvaluatedRecipient, cond: FilterCondition): boolean {
  const { field, operator, value } = cond;

  let userVal: any;

  switch (field) {
    case "full_name":
      userVal = user.fullName || "";
      break;
    case "email":
      userVal = user.email || "";
      break;
    case "phone":
      userVal = user.phone || "";
      break;
    case "state":
      userVal = user.state || "";
      break;
    case "city":
      userVal = user.city || "";
      break;
    case "total_orders":
      userVal = user.totalOrders || 0;
      break;
    case "total_spending":
      userVal = user.totalSpendingRupees || 0;
      break;
    case "last_order_days":
      if (!user.lastOrderDate) return operator === "greater_than" || operator === "greater_equal";
      const diffMs = Date.now() - new Date(user.lastOrderDate).getTime();
      userVal = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      break;
    default:
      userVal = "";
  }

  switch (operator) {
    case "equals":
      return String(userVal).toLowerCase() === String(value).toLowerCase();
    case "not_equals":
      return String(userVal).toLowerCase() !== String(value).toLowerCase();
    case "contains":
      return String(userVal).toLowerCase().includes(String(value).toLowerCase());
    case "greater_than":
      return Number(userVal) > Number(value);
    case "less_than":
      return Number(userVal) < Number(value);
    case "greater_equal":
      return Number(userVal) >= Number(value);
    case "less_equal":
      return Number(userVal) <= Number(value);
    case "is_true":
      return Boolean(userVal) === true;
    case "is_false":
      return Boolean(userVal) === false;
    default:
      return true;
  }
}
