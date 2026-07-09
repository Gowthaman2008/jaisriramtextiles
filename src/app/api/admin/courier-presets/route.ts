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

// Shown until the admin saves their first courier preset — at that point the
// table stops being empty and these fallback defaults are no longer served.
const DEFAULT_COURIER_PRESETS = [
  { name: "Blue Dart", tracking_url: "https://www.bluedart.com/tracking" },
  { name: "Delhivery", tracking_url: "https://www.delhivery.com/tracking" },
  { name: "DTDC", tracking_url: "https://www.dtdc.in/tracking" },
  { name: "India Post (Speed Post)", tracking_url: "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx" },
  { name: "Ecom Express", tracking_url: "https://ecomexpress.in/tracking/" },
  { name: "XpressBees", tracking_url: "https://www.xpressbees.com/track" },
  { name: "Shadowfax", tracking_url: "https://www.shadowfax.in/track" },
  { name: "Ekart Logistics", tracking_url: "https://ekartlogistics.com/track/" },
  { name: "Professional Couriers", tracking_url: "https://www.tpcindia.com/track.php" },
  { name: "ST Courier", tracking_url: "https://stcourier.com/track/shipment" },
  { name: "TCI Express", tracking_url: "https://www.tciexpress.in/tracking" },
  { name: "VRL Logistics", tracking_url: "https://www.vrlgroup.in/vrl_tracking.aspx" },
  { name: "Gati", tracking_url: "https://www.gati.com/track-your-shipment/" },
  { name: "Aramex India", tracking_url: "https://www.aramex.com/in/en/track/track-your-shipment" },
  { name: "FedEx India", tracking_url: "https://www.fedex.com/en-in/tracking.html" },
  { name: "DHL India", tracking_url: "https://www.dhl.com/in-en/home/tracking.html" },
  { name: "Trackon Couriers", tracking_url: "https://trackon.in/" },
  { name: "Safexpress", tracking_url: "https://www.safexpress.com/track-trace" },
  { name: "Amazon Shipping", tracking_url: "https://track.amazon.in/" },
  { name: "First Flight Couriers", tracking_url: "https://www.firstflight.net/track_trace.aspx" },
];

// GET: list courier presets (falls back to defaults if none saved yet)
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("courier_presets")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({
        presets: DEFAULT_COURIER_PRESETS.map((p, i) => ({
          id: `default-${i}`,
          name: p.name,
          tracking_url: p.tracking_url,
          sort_order: i,
        })),
        isDefault: true,
      });
    }

    // Backfill any newly-added defaults that aren't in the DB yet (e.g. this list
    // grew after the table was first seeded) so older installs stay up to date.
    const existingNames = new Set(data.map((r: any) => r.name));
    const missingDefaults = DEFAULT_COURIER_PRESETS.filter((p) => !existingNames.has(p.name));

    if (missingDefaults.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("courier_presets")
        .insert(missingDefaults.map((p, i) => ({ name: p.name, tracking_url: p.tracking_url, sort_order: data.length + i })))
        .select();
      if (insertErr) throw insertErr;
      return NextResponse.json({ presets: [...data, ...(inserted || [])], isDefault: false });
    }

    return NextResponse.json({ presets: data, isDefault: false });
  } catch (error: any) {
    console.error("Fetch courier presets error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: add a new courier preset
export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServiceClient();

    // First edit/delete against the still-default list seeds all defaults as
    // real rows so the specific one being changed actually has a row to act on.
    if (body.seedDefaults) {
      const { data: existing } = await supabase.from("courier_presets").select("id").limit(1);
      if (existing && existing.length > 0) {
        const { data } = await supabase.from("courier_presets").select("*").order("sort_order", { ascending: true });
        return NextResponse.json({ presets: data || [] });
      }
      const { data, error } = await supabase
        .from("courier_presets")
        .insert(DEFAULT_COURIER_PRESETS.map((p, i) => ({ name: p.name, tracking_url: p.tracking_url, sort_order: i })))
        .select();
      if (error) throw error;
      return NextResponse.json({ presets: data });
    }

    const { name, tracking_url, sort_order } = body;
    if (!name || !name.trim() || !tracking_url || !tracking_url.trim()) {
      return NextResponse.json({ error: "Courier name and tracking URL are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("courier_presets")
      .insert({ name: name.trim(), tracking_url: tracking_url.trim(), sort_order: sort_order ?? 0 })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Create courier preset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: edit an existing courier preset
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, name, tracking_url } = await request.json();
    if (!id || !name || !name.trim() || !tracking_url || !tracking_url.trim()) {
      return NextResponse.json({ error: "ID, courier name, and tracking URL are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("courier_presets")
      .update({ name: name.trim(), tracking_url: tracking_url.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Update courier preset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: remove a courier preset
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("courier_presets").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete courier preset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
