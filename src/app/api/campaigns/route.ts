import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Check if user is logged in
    let userId: string | null = null;
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const userClient = await createClient();
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch (e) {
      // Ignore if not logged in
    }

    let claimedCampaignIds: string[] = [];
    let claimedProducts: Array<{ product_id: string; size?: string; color?: string }> = [];

    if (userId) {
      const { data: pastItems } = await supabase
        .from("order_items")
        .select("campaign_id, product_id, size, color, unit_price_paise, orders!inner(status, user_id)")
        .eq("orders.user_id", userId)
        .neq("orders.status", "rejected");

      if (pastItems) {
        claimedCampaignIds = pastItems
          .map((item: any) => item.campaign_id)
          .filter(Boolean);

        claimedProducts = pastItems
          .filter((item: any) => item.unit_price_paise === 0)
          .map((item: any) => ({
            product_id: item.product_id,
            size: item.size || undefined,
            color: item.color || undefined,
          }));
      }
    }

    // Query active campaigns
    const { data: campaigns, error } = await supabase
      .from("free_product_campaigns")
      .select(`
        *,
        product:products(id, name, price_paise, slug, stock, is_active, product_images(url)),
        variant:product_variants(id, size, color, sku, stock)
      `)
      .eq("is_active", true);

    if (error) throw error;

    // Filter campaigns by start/expiration timestamps in memory for reliability
    const activeCampaigns = (campaigns || []).filter((c: any) => {
      // If user already claimed it, filter it out
      if (userId && claimedCampaignIds.includes(c.id)) {
        return false;
      }

      // Fallback check for past orders placed before campaign_id column was introduced:
      // If the user has a free order item for this product/variant, filter it out.
      if (userId && claimedProducts.some(p => 
        p.product_id === c.product_id && 
        (!c.variant || (p.size === c.variant.size && p.color === c.variant.color))
      )) {
        return false;
      }

      // If product itself is inactive or out of stock, ignore the campaign
      if (!c.product || !c.product.is_active || c.product.stock <= 0) {
        return false;
      }
      // Check variant stock if variant is selected
      if (c.variant && c.variant.stock <= 0) {
        return false;
      }

      const starts = c.starts_at ? new Date(c.starts_at) : null;
      const expires = c.expires_at ? new Date(c.expires_at) : null;
      const currentTime = new Date();

      if (starts && currentTime < starts) return false;
      if (expires && currentTime > expires) return false;

      return true;
    });

    return NextResponse.json(activeCampaigns, {
      headers: {
        "Cache-Control": "no-store, max-age=0", // disable caching since response is user-specific now
      },
    });
  } catch (error: any) {
    console.error("Fetch active campaigns error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
