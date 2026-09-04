import { NextResponse } from "next/server";
import { evaluateAudience } from "@/lib/marketing/segmentation-engine";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { audience_type = "all_users", segment_id, filter_rules, selected_user_ids } = body;

    const result = await evaluateAudience({
      audienceType: audience_type,
      segmentId: segment_id,
      filterRules: filter_rules,
      selectedUserIds: selected_user_ids,
    });

    // Provide a preview sample of up to 10 matching users
    const sample = result.recipients.slice(0, 10).map((r) => ({
      email: r.email,
      name: r.fullName || "Customer",
      city: r.city,
      state: r.state,
      totalOrders: r.totalOrders,
      totalSpendingRupees: r.totalSpendingRupees,
    }));

    return NextResponse.json({
      totalMatched: result.totalMatched,
      totalEligible: result.totalEligible,
      unsubscribedCount: result.unsubscribedCount,
      invalidEmailCount: result.invalidEmailCount,
      sample,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
