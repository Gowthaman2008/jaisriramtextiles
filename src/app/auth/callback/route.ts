import { createClient } from "@/lib/supabase/server";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const user = data?.user;

    if (user?.email) {
      // Robust check: check if welcome email was already sent using user metadata
      const welcomeEmailSent = user.user_metadata?.welcome_email_sent === true;

      if (!welcomeEmailSent) {
        const provider = user.app_metadata?.provider || "email";

        // 1. Send the welcome email
        await sendEmail({
          to: user.email,
          subject: "Welcome to JAI SRI RAM TEXTILES!",
          html: welcomeEmailHtml({
            name: user.user_metadata?.full_name || user.user_metadata?.name,
            email: user.email,
            provider,
          }),
        }).catch((err) => console.error("Welcome email failed:", err));

        // 2. Mark as sent in user metadata to prevent duplicate emails
        await supabase.auth.updateUser({
          data: {
            welcome_email_sent: true,
          },
        }).catch((err) => console.error("Failed to update welcome email metadata:", err));
      }
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
