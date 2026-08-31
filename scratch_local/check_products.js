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

async function main() {
  // 1. Fetch categories
  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, slug, name, is_active");
  
  if (catErr) {
    console.error("Error fetching categories:", catErr.message);
    return;
  }

  console.log("=== CATEGORIES ===");
  console.dir(categories);

  // 2. Fetch products
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, slug, name, category_id, is_active");
  
  if (prodErr) {
    console.error("Error fetching products:", prodErr.message);
    return;
  }

  console.log("\n=== PRODUCTS ===");
  console.dir(products);
}

main();
