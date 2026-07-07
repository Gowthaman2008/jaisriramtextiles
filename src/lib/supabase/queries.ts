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
  categories: { slug: string; name: string } | null;
  product_images: { url: string; alt: string | null; sort_order: number }[];
  product_variants: { id: string; size: string | null; color: string | null; sku: string | null; stock: number }[];
};

function toCardProduct(row: DbProduct): Product {
  const images = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.categories?.slug ?? "",
    categoryLabel: row.categories?.name ?? "",
    pricePaise: row.price_paise,
    compareAtPaise: row.compare_at_paise,
    cashbackPaise: row.cashback_paise,
    rating: row.rating_avg,
    reviewCount: row.rating_count,
    image: images[0]?.url ?? "",
    images: images.map((i) => i.url),
    inStock: row.stock > 0,
    stock: row.stock,
    badges: row.is_on_sale ? ["sale"] : undefined,
    variants: row.product_variants || [],
  };
}

const PRODUCT_SELECT =
  "id, slug, name, description, price_paise, compare_at_paise, cashback_paise, stock, is_on_sale, rating_avg, rating_count, categories(slug, name), product_images(url, alt, sort_order), product_variants(id, size, color, sku, stock)";

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
