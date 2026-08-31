const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envContent = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
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

function getISTParts(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const getVal = (type) => parts.find(p => p.type === type).value;
  return {
    year: parseInt(getVal("year")),
    month: parseInt(getVal("month")),
    day: parseInt(getVal("day")),
    hour: parseInt(getVal("hour")),
    minute: parseInt(getVal("minute")),
    second: parseInt(getVal("second")),
  };
}

function getISTMidnight(date) {
  const parts = getISTParts(date);
  return new Date(`${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T00:00:00.000+05:30`);
}

async function run() {
  try {
    const { data: sessions, error: sErr } = await supabase.from("sessions").select("*");
    if (sErr) throw sErr;
    console.log("Total Sessions loaded:", sessions.length);

    const { data: pvs, error: pErr } = await supabase.from("page_views").select("*");
    if (pErr) throw pErr;
    console.log("Total Page Views loaded:", pvs.length);

    const now = new Date();
    const parts = getISTParts(now);
    const istToday = getISTMidnight(now);

    console.log("IST Now Parts:", parts);
    console.log("IST Today Midnight:", istToday.toISOString());

  } catch (error) {
    console.error("Test error:", error);
  }
}

run();
