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
      // Check the profiles table (not user_metadata) for the sent flag — OAuth
      // providers re-sync user_metadata on every login and can wipe custom keys,
      // so relying on it caused Google users to be re-sent the welcome email.
      const { data: profile } = await supabase
        .from("profiles")
        .select("welcome_email_sent")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && profile.welcome_email_sent !== true) {
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

        // 2. Mark as sent on the profile row so re-logins never trigger it again
        await supabase
          .from("profiles")
          .update({ welcome_email_sent: true })
          .eq("id", user.id)
          .then(({ error }) => {
            if (error) console.error("Failed to update welcome_email_sent flag:", error);
          });
      }
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
