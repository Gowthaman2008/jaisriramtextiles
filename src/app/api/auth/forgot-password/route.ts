import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = createServiceClient();

    // Check if the user exists in profiles first
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (profileError) throw profileError;

    // To prevent user enumeration, we return success even if user doesn't exist
    if (!profile) {
      return NextResponse.json({ success: true });
    }

    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/reset-password`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: cleanEmail,
      options: { redirectTo },
    });

    if (linkError) throw linkError;

    // Direct local link containing token_hash, making it scanner-proof
    const localResetLink = `${origin}/reset-password?token_hash=${linkData.properties.hashed_token}`;

    // Send the email via Resend with our beautiful custom HTML template
    await sendEmail({
      to: cleanEmail,
      subject: "Reset your password - JAI SRI RAM TEXTILES",
      html: passwordResetEmailHtml({
        name: profile.full_name || undefined,
        resetLink: localResetLink,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Forgot Password API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to trigger password reset" }, { status: 500 });
  }
}
