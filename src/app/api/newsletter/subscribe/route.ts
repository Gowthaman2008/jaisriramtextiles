import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Initialize Supabase Client bypassing RLS via Service Role Key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from("newsletter_subscriptions").insert({
      email: email.trim().toLowerCase(),
    });

    // Check for duplicate key error (23505) and return a friendly message instead of crashing
    if (error && error.code === "23505") {
      return NextResponse.json({
        success: true,
        message: "You are already subscribed. Welcome back!",
      });
    }
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "You've successfully subscribed to our newsletter!",
    });
  } catch (error: any) {
    console.error("Newsletter Subscription API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to subscribe" }, { status: 500 });
  }
}
