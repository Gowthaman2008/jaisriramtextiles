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

    // First sign-in for a brand-new OAuth account: created_at and last_sign_in_at
    // land within moments of each other. Returning users' last_sign_in_at is far newer.
    if (user?.email) {
      const createdAt = new Date(user.created_at).getTime();
      const lastSignIn = new Date(user.last_sign_in_at || user.created_at).getTime();
      const isFirstSignIn = Math.abs(lastSignIn - createdAt) < 10_000;

      if (isFirstSignIn) {
        const provider = user.app_metadata?.provider || "google";
        // Awaited (not fire-and-forget): Vercel can freeze the function the instant
        // the redirect response is returned, killing any still-pending promise.
        await sendEmail({
          to: user.email,
          subject: "Welcome to JAI SRI RAM TEXTILES!",
          html: welcomeEmailHtml({
            name: user.user_metadata?.full_name || user.user_metadata?.name,
            email: user.email,
            provider,
          }),
        }).catch((err) => console.error("Welcome email failed:", err));
      }
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
