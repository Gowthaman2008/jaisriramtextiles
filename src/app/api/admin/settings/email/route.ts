import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { checkAdminAuth } from "@/lib/admin-auth";

const SETTINGS_KEY = "admin_email_settings";
const DEFAULT_EMAIL = "jaisriramtextilekpm@gmail.com";

export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    return NextResponse.json({ email: data?.value?.email || DEFAULT_EMAIL });
  } catch (err: any) {
    return NextResponse.json({ email: DEFAULT_EMAIL });
  }
}

export async function PATCH(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: SETTINGS_KEY,
          value: { email: email.trim() },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
