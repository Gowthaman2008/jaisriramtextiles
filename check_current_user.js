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
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, user_id, full_name");

  if (error) {
    console.error("Error fetching profiles:", error.message);
  } else {
    console.log("Profiles list in DB:");
    console.dir(profiles);
  }
}

main();
