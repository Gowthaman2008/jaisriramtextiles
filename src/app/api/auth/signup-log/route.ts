import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

function csvEscape(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone, provider } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), "public");
    const filePath = path.join(publicDir, "users.csv");

    // Ensure the public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const dateStr = new Date().toISOString();
    const row = `${csvEscape(email)},${csvEscape(name || "")},${csvEscape(phone || "")},${csvEscape(provider || "email")},${csvEscape(dateStr)}\n`;

    let fileExists = fs.existsSync(filePath);
    if (!fileExists) {
      // Write headers
      const headers = "Email,Full Name,Phone,Provider,Created At\n";
      fs.writeFileSync(filePath, headers + row, "utf8");
    } else {
      // Append row
      fs.appendFileSync(filePath, row, "utf8");
    }

    return NextResponse.json({ success: true, message: "User logged to Excel" });
  } catch (error) {
    console.error("Signup CSV Logging Error:", error);
    return NextResponse.json({ error: "Failed to log signup to CSV file" }, { status: 500 });
  }
}
