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
  const res1 = await supabase.from("support_messages").select("*", { count: "exact", head: true });
  console.log("support_messages count error:", res1.error);

  const res2 = await supabase.from("bulk_inquiries").select("*", { count: "exact", head: true });
  console.log("bulk_inquiries count error:", res2.error);

  const res3 = await supabase.from("newsletter_subscriptions").select("*", { count: "exact", head: true });
  console.log("newsletter_subscriptions count error:", res3.error);
}

main();
