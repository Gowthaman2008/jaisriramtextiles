const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

let url = "";
let key = "";

try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const lines = envContent.split("\n");
  for (const line of lines) {
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      url = line.split("=")[1].split("#")[0].trim();
    }
    if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
      key = line.split("=")[1].split("#")[0].trim();
    }
  }
} catch (e) {
  console.error("Failed to read env:", e.message);
  process.exit(1);
}

const supabase = createClient(url, key);

const PRODUCT_SELECT =
  "id, slug, name, description, price_paise, compare_at_paise, cashback_paise, stock, is_on_sale, rating_avg, rating_count, show_size, is_featured, is_bestseller, is_new, is_trending, pieces_per_pack, categories(slug, name), product_images(url, alt, sort_order), product_variants(id, size, color, sku, stock)";

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log("=== MAPPED PRODUCTS ===");
  products.forEach(p => {
    console.log({
      name: p.name,
      category_id: p.category_id,
      categories_relation: p.categories,
      mapped_category: p.categories?.slug ?? ""
    });
  });
}

main();
