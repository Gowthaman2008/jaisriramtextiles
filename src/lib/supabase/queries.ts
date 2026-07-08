import { createClient } from "@/lib/supabase/server";
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

  const defaultStats = getDefaultRating(row.slug);
  const realCount = row.rating_count || 0;
  const realAvg = row.rating_avg || 0;
  const displayCount = defaultStats.count + realCount;
  const displayRating = Math.round((((defaultStats.rating * defaultStats.count) + (Number(realAvg) * realCount)) / displayCount) * 10) / 10;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
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
    badges: row.is_on_sale ? ["sale"] : undefined,
    variants: row.product_variants || [],
    showSize: (row as any).show_size || false,
  };
}

let hasShowSizeColumn: boolean | null = null;

async function getProductSelect() {
  if (hasShowSizeColumn !== null) {
    return hasShowSizeColumn 
      ? "id, slug, name, description, price_paise, compare_at_paise, cashback_paise, stock, is_on_sale, rating_avg, rating_count, show_size, categories(slug, name), product_images(url, alt, sort_order), product_variants(id, size, color, sku, stock)"
      : "id, slug, name, description, price_paise, compare_at_paise, cashback_paise, stock, is_on_sale, rating_avg, rating_count, categories(slug, name), product_images(url, alt, sort_order), product_variants(id, size, color, sku, stock)";
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("products").select("show_size").limit(1);
    if (error && error.message.includes("show_size")) {
      hasShowSizeColumn = false;
    } else {
      hasShowSizeColumn = true;
    }
  } catch (err) {
    hasShowSizeColumn = false;
  }
  return hasShowSizeColumn 
    ? "id, slug, name, description, price_paise, compare_at_paise, cashback_paise, stock, is_on_sale, rating_avg, rating_count, show_size, categories(slug, name), product_images(url, alt, sort_order), product_variants(id, size, color, sku, stock)"
    : "id, slug, name, description, price_paise, compare_at_paise, cashback_paise, stock, is_on_sale, rating_avg, rating_count, categories(slug, name), product_images(url, alt, sort_order), product_variants(id, size, color, sku, stock)";
}

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
  const selectClause = await getProductSelect();
  const { data } = await supabase
    .from("products")
    .select(selectClause)
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })
    .returns<DbProduct[]>();
  return (data ?? []).map(toCardProduct);
}

export async function getOnSaleProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const selectClause = await getProductSelect();
  const { data } = await supabase
    .from("products")
    .select(selectClause)
    .eq("is_active", true)
    .eq("is_on_sale", true)
    .order("created_at", { ascending: false })
    .returns<DbProduct[]>();
  return (data ?? []).map(toCardProduct);
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const selectClause = await getProductSelect();
  const { data } = await supabase
    .from("products")
    .select(selectClause)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<DbProduct[]>();
  return (data ?? []).map(toCardProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const selectClause = await getProductSelect();
  const { data } = await supabase
    .from("products")
    .select(selectClause)
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
