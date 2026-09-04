import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const limit = checkRateLimit(clientIp, { prefix: "newsletter", maxRequests: 5, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many subscription attempts. Please wait a moment." }, { status: 429 });
    }

    const { email } = await request.json();

    if (!email || !email.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabase = createServiceClient();

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
