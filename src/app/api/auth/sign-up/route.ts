import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, signUpConfirmationEmailHtml } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, password, name, phone } = await request.json();

    if (!email || !password || !name || !phone) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, "");

    if (cleanPhone.length !== 10) {
      return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Generate the verification link
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/callback?next=/account`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: cleanEmail,
      password: password,
      options: {
        redirectTo,
        data: {
          full_name: name,
          phone: cleanPhone,
        },
      },
    });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    const confirmationLink = linkData.properties.action_link;

    // 2. Send the confirmation email
    await sendEmail({
      to: cleanEmail,
      subject: "Confirm your email address - JAI SRI RAM TEXTILES",
      html: signUpConfirmationEmailHtml({
        name,
        confirmationLink,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Sign Up API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to register account" }, { status: 500 });
  }
}
