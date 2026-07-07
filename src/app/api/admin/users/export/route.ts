import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";

async function checkAdminAuth() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

function csvEscape(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    
    // 1. Fetch all profiles from database
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("email, full_name, phone, role, provider, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // 2. Build the CSV content
    const headers = "Email,Full Name,Phone,Role,Provider,Created At\n";
    const rows = (profiles || []).map(p => 
      `${csvEscape(p.email)},${csvEscape(p.full_name || "")},${csvEscape(p.phone || "")},${csvEscape(p.role)},${csvEscape(p.provider)},${csvEscape(p.created_at)}`
    ).join("\n");

    const csvContent = headers + rows + "\n";

    // 3. Write/Sync to the local file public/users.csv
    const publicDir = path.join(process.cwd(), "public");
    const filePath = path.join(publicDir, "users.csv");

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(filePath, csvContent, "utf8");

    // 4. Return as downloadable file attachment
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=users.csv",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Export users error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Change user roles
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, role } = await request.json();
    if (!userId || !role) {
      return NextResponse.json({ error: "User ID and Role are required" }, { status: 400 });
    }

    if (!["customer", "staff", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update user role error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
