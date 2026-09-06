"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      setLoading(false);
      return;
    }

    try {
      const checkRes = await fetch("/api/auth/check-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), phone: cleanPhone }),
      });

      if (!checkRes.ok) {
        const errorData = await checkRes.json();
        setError(errorData.error || "An error occurred checking registration details.");
        setLoading(false);
        return;
      }

      const checkData = await checkRes.json();
      if (checkData.exists) {
        if (checkData.field === "email") {
          setError("An account with this email already exists.");
        } else if (checkData.field === "phone") {
          setError("An account with this mobile number already exists.");
        } else {
          setError("An account with these details already exists.");
        }
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError("Failed to check if account details exist. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const signupRes = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, phone: cleanPhone }),
      });

      if (!signupRes.ok) {
        const errorData = await signupRes.json();
        setError(errorData.error || "An error occurred during account creation.");
        setLoading(false);
        return;
      }

      setDone(true);
      setLoading(false);
    } catch (err: any) {
      setError("Failed to register. Please check your network and try again.");
      setLoading(false);
    }
  }

  const signInHref = next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";

  if (done) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center p-4 py-8 sm:py-16 bg-cream/20">
        <div className="w-full max-w-[440px] mx-auto">
          <div className="zari-frame rounded-3xl bg-white p-6 sm:p-8 shadow-lift border border-line/70 text-center">
            <p className="font-display text-xl sm:text-2xl text-ink font-bold">Check your email</p>
            <p className="mt-2 text-sm text-taupe">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
              account, then sign in.
            </p>
            <div className="mt-6">
              <Button href={signInHref} variant="gold" size="md" className="w-full">
                Go to sign in
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center p-4 py-8 sm:py-16 bg-cream/20">
      <div className="w-full max-w-[440px] mx-auto">
        <div className="zari-frame rounded-3xl bg-white p-6 sm:p-8 shadow-lift border border-line/70">
          <h1 className="font-display text-2xl sm:text-3xl text-ink font-bold">Create account</h1>
          <p className="mt-1 text-sm text-taupe">Join JAI SRI RAM TEXTILES</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-ink">
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-pill border border-line bg-ivory px-4 text-sm text-ink outline-none focus-visible:border-zari"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-ink">
                Mobile Number
              </label>
              <input
                id="phone"
                type="tel"
                required
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-pill border border-line bg-ivory px-4 text-sm text-ink outline-none focus-visible:border-zari"
              />
            </div>

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
                className="h-11 rounded-pill border border-line bg-ivory px-4 text-sm text-ink outline-none focus-visible:border-zari"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative flex w-full">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-pill border border-line bg-ivory pl-4 pr-12 text-sm text-ink outline-none focus-visible:border-zari"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-taupe hover:text-ink focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" variant="gold" size="lg" className="mt-2 w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <div className="zari-rule my-6" />

          <p className="text-center text-sm text-taupe">
            Already have an account?{" "}
            <Link href={signInHref} className="font-medium text-zari-deep hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] flex-col items-center justify-center bg-ivory">
          <div className="animate-spin text-zari w-10 h-10 mb-3" />
          <p className="font-display text-lg text-ink">Loading...</p>
        </div>
      }
    >
      <SignUpPageContent />
    </Suspense>
  );
}
