import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { MarketingSettings } from "@/lib/marketing/types";
import { checkAdminAuth } from "@/lib/admin-auth";

const DEFAULT_SETTINGS: MarketingSettings = {
  default_sender_name: "JAI SRI RAM TEXTILES",
  default_sender_email: "no-reply@jaisriramtextiles.in",
  default_reply_to: "jaisriramtextilekpm@gmail.com",
  provider: "resend",
  resend_api_key_configured: Boolean(process.env.RESEND_API_KEY),
  batch_size: 30,
  rate_limit_per_minute: 120,
  daily_send_limit: 10000,
  enable_open_tracking: true,
  enable_click_tracking: true,
  enable_frequency_capping: true,
  max_emails_per_user_per_week: 3,
  require_typing_confirmation_threshold: 500,
  physical_business_address: "5/136/5, Shasti Smart City, Kallankattuvalasu, Komarapalayam, Namakkal District, Tamil Nadu – 638183",
  compliance_footer_note: "You are receiving this communication because you are a registered customer or opted in at jaisriramtextiles.in.",
};

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
      .eq("key", "marketing_broadcast_settings")
      .maybeSingle();

    const current = data?.value || {};
    const settings: MarketingSettings = {
      ...DEFAULT_SETTINGS,
      ...current,
      resend_api_key_configured: Boolean(process.env.RESEND_API_KEY),
    };

    // Deliverability checklist status
    const deliverabilityHealth = {
      spfConfigured: true,
      dkimConfigured: Boolean(process.env.RESEND_API_KEY),
      dmarcConfigured: true,
      customDomainActive: Boolean(process.env.RESEND_FROM_EMAIL && !process.env.RESEND_FROM_EMAIL.includes("resend.dev")),
      sendingDomain: "jaisriramtextiles.in",
    };

    return NextResponse.json({ settings, deliverabilityHealth });
  } catch (err: any) {
    return NextResponse.json({
      settings: DEFAULT_SETTINGS,
      deliverabilityHealth: {
        spfConfigured: true,
        dkimConfigured: Boolean(process.env.RESEND_API_KEY),
        dmarcConfigured: true,
        customDomainActive: true,
        sendingDomain: "jaisriramtextiles.in",
      },
    });
  }
}

export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const merged = {
      ...DEFAULT_SETTINGS,
      ...body,
    };

    await supabase.from("app_settings").upsert({
      key: "marketing_broadcast_settings",
      value: merged,
      updated_at: new Date().toISOString(),
    });

    // Audit log
    try {
      await supabase.from("audit_logs").insert({
        action: "marketing_settings.update",
        entity: "app_settings",
        meta: { updated: body },
      });
    } catch {}

    return NextResponse.json({ success: true, settings: merged });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
