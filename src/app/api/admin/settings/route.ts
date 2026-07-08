import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

const SETTINGS_KEY = "shipping_settings";

/** Default values in case the row hasn't been created yet */
const DEFAULTS = {
  free_shipping_threshold_paise: 69900, // ₹699
  shipping_charge_paise: 9900,           // ₹99
};

/** GET /api/admin/settings — returns current shipping settings */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error) {
      console.error("Failed to read shipping settings:", error);
      return NextResponse.json(DEFAULTS);
    }

    return NextResponse.json(data?.value || DEFAULTS);
  } catch (err: any) {
    return NextResponse.json(DEFAULTS);
  }
}

/** PATCH /api/admin/settings — upsert shipping settings */
export async function PATCH(request: Request) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // Validate incoming values
    const freeThresholdPaise = body.free_shipping_threshold_paise;
    const shippingChargePaise = body.shipping_charge_paise;

    if (
      typeof freeThresholdPaise !== "number" ||
      typeof shippingChargePaise !== "number" ||
      freeThresholdPaise < 0 ||
      shippingChargePaise < 0
    ) {
      return NextResponse.json({ error: "Invalid settings values" }, { status: 400 });
    }

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: SETTINGS_KEY,
          value: { free_shipping_threshold_paise: freeThresholdPaise, shipping_charge_paise: shippingChargePaise },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) {
      console.error("Failed to save shipping settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
