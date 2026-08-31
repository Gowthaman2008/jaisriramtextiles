import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { substituteMergeTags, sendMarketingEmail } from "@/lib/marketing/email-service";
import { compileEmailHtml } from "@/lib/marketing/email-compiler";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { testEmails = [], content_json, subject, preview_text } = await request.json();

    if (!Array.isArray(testEmails) || testEmails.length === 0) {
      return NextResponse.json({ error: "At least one test email address is required" }, { status: 400 });
    }

    // 1. Fetch current campaign details
    const { data: campaign } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const activeSubject = subject || campaign?.subject || "Special Announcement";
    const activePreview = preview_text || campaign?.preview_text || "";
    const activeBlocks = content_json || campaign?.content_json || [];

    const compiledHtml = compileEmailHtml(activeBlocks, {
      previewText: activePreview,
    });

    const results = [];

    for (const rawEmail of testEmails) {
      const email = String(rawEmail).trim();
      if (!email || !email.includes("@")) continue;

      const personalizedSubject = `[TEST] ` + substituteMergeTags(activeSubject, {
        email,
        firstName: "Admin (Test Preview)",
        lastName: "Tester",
        city: "Komarapalayam",
        state: "Tamil Nadu",
        totalOrders: 3,
        totalSpendingRupees: 2499,
        couponCode: "TEST10",
      });

      const personalizedHtml = substituteMergeTags(compiledHtml, {
        email,
        firstName: "Admin (Test Preview)",
        lastName: "Tester",
        city: "Komarapalayam",
        state: "Tamil Nadu",
        totalOrders: 3,
        totalSpendingRupees: 2499,
        couponCode: "TEST10",
      });

      const sendRes = await sendMarketingEmail({
        to: email,
        subject: personalizedSubject,
        html: personalizedHtml,
        fromName: campaign?.sender_name || "JAI SRI RAM TEXTILES",
        fromEmail: campaign?.sender_email || "no-reply@jaisriramtextiles.in",
        replyTo: campaign?.reply_to || "jaisriramtextilekpm@gmail.com",
      });

      results.push({ email, success: sendRes.success, error: sendRes.error });
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "No valid email addresses found. Please enter a valid email." }, { status: 400 });
    }

    const allFailed = !results.some((r) => r.success);
    if (allFailed) {
      const firstError = results.find((r) => r.error)?.error || "Failed to send test email";
      return NextResponse.json({
        success: false,
        error: firstError,
        results,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
