import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/types";

type DbCategory = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  image_url: string | null;
};

type DbProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_paise: number;
  compare_at_paise: number | null;
  cashback_paise: number;
  stock: number;
  is_on_sale: boolean;
  rating_avg: number;
  rating_count: number;
  show_size: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_trending: boolean;
  pieces_per_pack: number | null;
  categories: { slug: string; name: string } | null;
  product_images: { url: string; alt: string | null; sort_order: number }[];
  product_variants: { id: string; size: string | null; color: string | null; sku: string | null; stock: number }[];
};

function getDefaultRating(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  const hashAbs = Math.abs(hash);
  const ratings = [3.5, 4.0, 4.5, 5.0];
  const rating = ratings[hashAbs % ratings.length];
  const count = 105 + (hashAbs % 95);
  return { rating, count };
}

function toCardProduct(row: DbProduct): Product {
  const images = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order);

  let displayRating = Number(row.rating_avg) || 0;
  let displayCount = row.rating_count || 0;

  // Fallback to default mock ratings only if the admin hasn't set anything
  if (displayCount === 0 && displayRating === 0) {
    const defaultStats = getDefaultRating(row.slug);
    displayRating = defaultStats.rating;
    displayCount = defaultStats.count;
  }

  // Build the badges array dynamically based on database properties
  const badges: ("new" | "bestseller" | "trending" | "sale")[] = [];
  if (row.is_new) badges.push("new");
  if (row.is_bestseller) badges.push("bestseller");
  if (row.is_trending) badges.push("trending");
  if (row.is_on_sale) badges.push("sale");

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.categories?.slug ?? "",
    categoryLabel: row.categories?.name ?? "",
    pricePaise: row.price_paise,
    compareAtPaise: row.compare_at_paise,
    cashbackPaise: row.cashback_paise,
    rating: displayRating,
    reviewCount: displayCount,
    image: images[0]?.url ?? "",
    images: images.map((i) => i.url),
    inStock: row.stock > 0,
    stock: row.stock,
    badges: badges.length > 0 ? badges : undefined,
    variants: row.product_variants || [],
    showSize: row.show_size || false,
    isFeatured: row.is_featured || false,
    isBestseller: row.is_bestseller || false,
    isNewArrival: row.is_new || false,
    isTrending: row.is_trending || false,
    piecesPerPack: row.pieces_per_pack || 1,
  };
}

// Hardcoded select — avoids a runtime probe query on every page load
const PRODUCT_SELECT =
  "id, slug, name, description, price_paise, compare_at_paise, cashback_paise, stock, is_on_sale, rating_avg, rating_count, show_size, is_featured, is_bestseller, is_new, is_trending, pieces_per_pack, categories(slug, name), product_images(url, alt, sort_order), product_variants(id, size, color, sku, stock)";

export async function getCategoryBySlug(slug: string): Promise<DbCategory | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, tagline, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function getProductsByCategoryId(categoryId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })
    .returns<DbProduct[]>();
  return (data ?? []).map(toCardProduct);
}

export async function getOnSaleProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("is_on_sale", true)
    .order("created_at", { ascending: false })
    .returns<DbProduct[]>();
  return (data ?? []).map(toCardProduct);
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<DbProduct[]>();
  return (data ?? []).map(toCardProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<DbProduct>();
  return data ? toCardProduct(data) : null;
}

export async function getProductReviews(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(`
      id, rating, title, body, created_at,
      profiles (full_name),
      review_photos (url)
    `)
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  return data || [];
}

/**
 * Used exclusively in generateStaticParams — runs at build time outside any
 * request scope, so it must NOT use createClient() (which calls cookies()).
 * Uses the service client instead.
 */
export async function getAllProductSlugs(): Promise<string[]> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("products")
      .select("slug")
      .eq("is_active", true);
    return (data ?? []).map((p: { slug: string }) => p.slug);
  } catch {
    return [];
  }
}

export async function getActiveCategories() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("categories")
      .select("id, slug, name, tagline, image_url")
      .eq("is_active", true)
      .order("name");
    return data || [];
  } catch (err: any) {
    if (err && (err.name === "DynamicServerError" || err.message?.includes("Dynamic server usage"))) {
      throw err;
    }
    return [];
  }
}

export async function getActiveCarouselSlides() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("carousel_slides")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return data || [];
  } catch (err: any) {
    if (err && (err.name === "DynamicServerError" || err.message?.includes("Dynamic server usage"))) {
      throw err;
    }
    console.error("Failed to load active carousel slides:", err);
    return [];
  }
}
