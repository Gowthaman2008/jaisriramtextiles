import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const limit = checkRateLimit(clientIp, { prefix: "support_msg", maxRequests: 5, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many support messages. Please wait a moment." }, { status: 429 });
    }

    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Please fill in all fields" }, { status: 400 });
    }

    // Determine actual authenticated user ID if logged in (do not trust client param)
    let validatedUserId: string | null = null;
    try {
      const userClient = await createClient();
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        validatedUserId = user.id;
      }
    } catch {
      // Unauthenticated visitor
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        user_id: validatedUserId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      queryId: data?.id,
      message: "Your message has been received! Our support team will get back to you shortly.",
    });
  } catch (error: any) {
    console.error("Support Inquiry API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process inquiry" }, { status: 500 });
  }
}
