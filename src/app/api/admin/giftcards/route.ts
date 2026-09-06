import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { generateGiftCardCode } from "@/lib/gift-cards";

/**
 * Helper to ensure the caller is an authenticated admin/staff.
 */
async function verifyAdmin() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "staff"].includes(profile.role)) {
    return null;
  }

  return { user, profile, serviceClient };
}

// ── GET: Fetch Gift Cards with Filters & Analytics ──────────────────────────
export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceClient } = auth;
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "all";
    const platform = url.searchParams.get("platform")?.trim() || "all";

    // 1. Fetch all gift cards with creator & redeemer profiles
    let query = serviceClient
      .from("gift_cards")
      .select(`
        *,
        creator:created_by (id, full_name, email, phone),
        redeemer:redeemed_by (id, full_name, email, phone)
      `)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (platform !== "all") {
      query = query.eq("platform", platform.toLowerCase());
    }

    const { data: giftCards, error } = await query;
    if (error) {
      console.error("[admin/giftcards] Fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allCards = giftCards || [];

    // Filter by search term on code, notes, or user details
    const filtered = allCards.filter((c: any) => {
      if (!search) return true;
      const term = search.toLowerCase();
      const codeMatch = c.code?.toLowerCase().includes(term);
      const noteMatch = c.notes?.toLowerCase().includes(term);
      const creatorName = c.creator?.full_name?.toLowerCase().includes(term);
      const creatorEmail = c.creator?.email?.toLowerCase().includes(term);
      const redeemerName = c.redeemer?.full_name?.toLowerCase().includes(term);
      const redeemerEmail = c.redeemer?.email?.toLowerCase().includes(term);
      const platformMatch = c.platform?.toLowerCase().includes(term);
      return codeMatch || noteMatch || creatorName || creatorEmail || redeemerName || redeemerEmail || platformMatch;
    });

    // 2. Compute KPI Metrics
    const totalIssued = allCards.length;
    const totalActive = allCards.filter((c: any) => c.status === "active").length;
    const totalRedeemed = allCards.filter((c: any) => c.status === "redeemed").length;
    const totalRedeemedPaise = allCards
      .filter((c: any) => c.status === "redeemed")
      .reduce((sum: number, c: any) => sum + (c.amount_paise || 0), 0);
    const totalScreenshotSubmissions = allCards.filter((c: any) => !!c.review_screenshot_url).length;

    return NextResponse.json({
      giftCards: filtered,
      metrics: {
        totalIssued,
        totalActive,
        totalRedeemed,
        totalRedeemedPaise,
        totalRedeemedRupees: totalRedeemedPaise / 100,
        totalScreenshotSubmissions,
      },
    });
  } catch (err: any) {
    console.error("[admin/giftcards] GET Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch gift cards" }, { status: 500 });
  }
}

// ── POST: Generate New Single / Batch Gift Cards ────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, serviceClient } = auth;
    const body = await request.json();

    const amountRupees = Number(body.amountRupees) || 100;
    const amountPaise = Math.round(amountRupees * 100);
    const platform = (body.platform as string) || "direct";
    const customCode = body.customCode ? body.customCode.trim().toUpperCase() : null;
    const notes = body.notes ? body.notes.trim() : null;
    const defaultOneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : defaultOneYear;
    const quantity = Math.min(Math.max(Number(body.quantity) || 1, 1), 50); // cap batch at 50

    const cardsToInsert: any[] = [];

    for (let i = 0; i < quantity; i++) {
      let code = customCode;
      if (!code || quantity > 1) {
        code = generateGiftCardCode(`JSRT-${amountRupees}`);
      }

      cardsToInsert.push({
        code,
        amount_paise: amountPaise,
        status: "active",
        platform: platform.toLowerCase(),
        created_by: user.id,
        notes: notes || `Admin-generated gift card (₹${amountRupees})`,
        expires_at: expiresAt,
        is_one_time: true,
      });
    }

    const { data: inserted, error: insertErr } = await serviceClient
      .from("gift_cards")
      .insert(cardsToInsert)
      .select("*");

    if (insertErr) {
      console.error("[admin/giftcards] Insert error:", insertErr);
      return NextResponse.json({ error: insertErr.message || "Failed to create gift card" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${cardsToInsert.length} gift card${cardsToInsert.length > 1 ? "s" : ""}`,
      giftCards: inserted,
    });
  } catch (err: any) {
    console.error("[admin/giftcards] POST Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create gift card" }, { status: 500 });
  }
}

// ── PUT: Update Gift Card Status / Notes ────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceClient } = auth;
    const body = await request.json();
    const { id, status, notes, amountRupees, expiresAt } = body;

    if (!id) {
      return NextResponse.json({ error: "Gift card ID is required" }, { status: 400 });
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (amountRupees !== undefined) updates.amount_paise = Math.round(Number(amountRupees) * 100);
    if (expiresAt !== undefined) updates.expires_at = expiresAt ? new Date(expiresAt).toISOString() : null;

    const { data: updated, error } = await serviceClient
      .from("gift_cards")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[admin/giftcards] Update error:", error);
      return NextResponse.json({ error: error.message || "Failed to update gift card" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Gift card updated successfully",
      giftCard: updated,
    });
  } catch (err: any) {
    console.error("[admin/giftcards] PUT Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update gift card" }, { status: 500 });
  }
}

// ── DELETE: Delete a Gift Card ──────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceClient } = auth;
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Gift card ID is required" }, { status: 400 });
    }

    const { error } = await serviceClient
      .from("gift_cards")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[admin/giftcards] Delete error:", error);
      return NextResponse.json({ error: error.message || "Failed to delete gift card" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Gift card deleted successfully",
    });
  } catch (err: any) {
    console.error("[admin/giftcards] DELETE Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete gift card" }, { status: 500 });
  }
}
