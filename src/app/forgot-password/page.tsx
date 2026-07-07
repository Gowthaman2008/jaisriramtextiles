"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email);

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-[calc(100vh-76px)] items-center py-16">
        <Container className="max-w-[420px]">
          <div className="zari-frame rounded-card bg-ivory p-8 shadow-soft text-center">
            <h1 className="font-display text-2xl text-ink">Check your email</h1>
            <p className="mt-2 text-sm text-taupe">
              We&apos;ve sent a 6-digit code to <strong className="text-ink">{email}</strong>. Enter it on the next screen along with your new password.
            </p>
            <Button href={`/reset-password?email=${encodeURIComponent(email)}`} variant="gold" size="lg" className="mt-6 w-full">
              Enter code
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-76px)] items-center py-16">
      <Container className="max-w-[420px]">
        <div className="zari-frame rounded-card bg-ivory p-8 shadow-soft">
          <h1 className="font-display text-2xl text-ink">Forgot password</h1>
          <p className="mt-1 text-sm text-taupe">Enter your email and we&apos;ll send you a reset code.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-pill border border-line bg-white px-4 text-sm text-ink outline-none focus-visible:border-zari"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" variant="gold" size="lg" className="mt-1 w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset code"}
            </Button>
          </form>

          <div className="zari-rule my-6" />

          <p className="text-center text-sm text-taupe">
            Remembered your password?{" "}
            <Link href="/sign-in" className="font-medium text-zari-deep hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
