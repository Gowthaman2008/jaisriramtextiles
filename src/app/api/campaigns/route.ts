import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

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
        "Cache-Control": "s-maxage=10, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    console.error("Fetch active campaigns error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
