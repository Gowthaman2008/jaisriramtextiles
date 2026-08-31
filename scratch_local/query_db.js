const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Parse env file
const envContent = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  // strip comments
  const cleanLine = line.split("#")[0].trim();
  const match = cleanLine.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  try {
    console.log("Connecting to Supabase...");
    
    const { data: sessions, error: sErr, count: sCount } = await supabase
      .from("sessions")
      .select("*", { count: "exact" })
      .limit(3);

    if (sErr) throw sErr;
    console.log("Sessions count:", sCount);
    console.log("Sample Sessions:", JSON.stringify(sessions, null, 2));

    const { data: pvs, error: pErr, count: pCount } = await supabase
      .from("page_views")
      .select("*", { count: "exact" })
      .limit(3);

    if (pErr) throw pErr;
    console.log("Page Views count:", pCount);
    console.log("Sample Page Views:", JSON.stringify(pvs, null, 2));

  } catch (error) {
    console.error("Error executing query:", error);
  }
}

run();
