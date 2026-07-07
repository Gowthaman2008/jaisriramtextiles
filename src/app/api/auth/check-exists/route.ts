import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, phone } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, "");

    if (cleanPhone.length !== 10) {
      return NextResponse.json({ error: "Phone number must be exactly 10 digits" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check if email already exists
    const { data: emailData, error: emailError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", cleanEmail)
      .limit(1);

    if (emailError) throw emailError;

    if (emailData && emailData.length > 0) {
      return NextResponse.json({ exists: true, field: "email" });
    }

    // Check if phone already exists
    const { data: phoneData, error: phoneError } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", cleanPhone)
      .limit(1);

    if (phoneError) throw phoneError;

    if (phoneData && phoneData.length > 0) {
      return NextResponse.json({ exists: true, field: "phone" });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("Auth check-exists API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to check registration details" }, { status: 500 });
  }
}
