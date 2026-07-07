"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp.trim(),
      type: "recovery",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/account"), 1500);
  }

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-76px)] items-center py-16">
        <Container className="max-w-[420px]">
          <div className="zari-frame rounded-card bg-ivory p-8 shadow-soft text-center">
            <h1 className="font-display text-2xl text-ink">Password updated</h1>
            <p className="mt-2 text-sm text-taupe">Redirecting you to your account…</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-76px)] items-center py-16">
      <Container className="max-w-[420px]">
        <div className="zari-frame rounded-card bg-ivory p-8 shadow-soft">
          <h1 className="font-display text-2xl text-ink">Reset password</h1>
          <p className="mt-1 text-sm text-taupe">Enter the code we emailed you and choose a new password.</p>

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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="otp" className="text-sm font-medium text-ink">
                6-digit code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="h-11 rounded-pill border border-line bg-white px-4 text-center text-sm tracking-[0.3em] text-ink outline-none focus-visible:border-zari"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-pill border border-line bg-white px-4 text-sm text-ink outline-none focus-visible:border-zari"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-pill border border-line bg-white px-4 text-sm text-ink outline-none focus-visible:border-zari"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" variant="gold" size="lg" className="mt-1 w-full" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>

          <div className="zari-rule my-6" />

          <p className="text-center text-sm text-taupe">
            <Link href="/sign-in" className="font-medium text-zari-deep hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] flex-col items-center justify-center bg-ivory">
          <p className="font-display text-lg text-ink">Loading...</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
