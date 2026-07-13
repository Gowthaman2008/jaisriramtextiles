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

// GET: Retrieve support messages, bulk inquiries, and newsletter subscriptions for admin
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const [supportRes, bulkRes, subsRes] = await Promise.all([
      supabase
        .from("support_messages")
        .select("*, profiles(user_id)")
        .order("created_at", { ascending: false }),
      supabase
        .from("bulk_inquiries")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("newsletter_subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    if (supportRes.error) throw supportRes.error;
    if (bulkRes.error) throw bulkRes.error;
    if (subsRes.error) throw subsRes.error;

    return NextResponse.json({
      supportMessages: supportRes.data || [],
      bulkInquiries: bulkRes.data || [],
      newsletterSubs: subsRes.data || []
    });
  } catch (error: any) {
    console.error("Fetch communications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
