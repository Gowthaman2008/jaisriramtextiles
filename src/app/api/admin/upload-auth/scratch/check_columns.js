const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from("products")
    .select("id, is_featured, is_bestseller, is_new, is_trending")
    .limit(1);

  if (error) {
    console.error("Columns do not exist or query failed:", error.message);
  } else {
    console.log("Success! Columns exist in database. Sample data:", data);
  }
}

main();
