import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = await createClient();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError) {
      const msg = authError.message || "";
      const isUnconfirmed = msg.toLowerCase().includes("email not confirmed");
      const isInvalid = msg.toLowerCase().includes("invalid login credentials") || msg.toLowerCase().includes("invalid_grant");

      if (isUnconfirmed) {
        return NextResponse.json({
          error: "Your email is not confirmed yet. Please check your inbox and click the verification link.",
          code: "email_not_confirmed",
        }, { status: 400 });
      }

      if (isInvalid) {
        return NextResponse.json({
          error: "No account found with this email or password incorrect.",
          code: "invalid_credentials",
          notFound: true,
        }, { status: 400 });
      }

      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (err: any) {
    console.error("[api/auth/sign-in] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to sign in. Please try again." }, { status: 500 });
  }
}
