"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || "Failed to trigger password reset. Please try again.");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (err: any) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center p-4 py-8 sm:py-16 bg-cream/20">
        <div className="w-full max-w-[440px] mx-auto">
          <div className="zari-frame rounded-3xl bg-ivory p-6 sm:p-8 shadow-lift border border-line/70 text-center">
            <h1 className="font-display text-2xl sm:text-3xl text-ink font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-taupe">
              We&apos;ve sent a password reset link to <strong className="text-ink">{email}</strong>. Click the link in the email to choose a new password.
            </p>
            <Button href="/sign-in" variant="gold" size="lg" className="mt-6 w-full">
              Back to sign in
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center p-4 py-8 sm:py-16 bg-cream/20">
      <div className="w-full max-w-[440px] mx-auto">
        <div className="zari-frame rounded-3xl bg-ivory p-6 sm:p-8 shadow-lift border border-line/70">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-4 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} /> Back to Sign In
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl text-ink font-bold">Forgot password</h1>
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
      </div>
    </main>
  );
}
