import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

const SETTINGS_KEY = "shipping_settings";

const DEFAULTS = {
  free_shipping_threshold_paise: 69900,
  shipping_charge_paise: 9900,
};

/** Public GET endpoint — returns shipping thresholds for cart/checkout use. */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    return NextResponse.json(data?.value || DEFAULTS, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}
