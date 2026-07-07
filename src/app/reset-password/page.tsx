"use client";
 
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
 
function ResetPasswordContent() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();

      // If code query parameter exists in the URL, exchange it first
      const params = new URLSearchParams(window.location.search);
      
      // Handle custom token_hash from our scanner-proof email link
      const tokenHash = params.get("token_hash");
      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery"
        });
        if (verifyError) {
          setError(verifyError.message);
          setChecking(false);
          return;
        }
        // Clean URL query params so they aren't visible or reused
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Handle standard PKCE code fallback
      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          setChecking(false);
          return;
        }
        // Clean URL query params so they aren't visible or reused
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setChecking(false);
    }
    checkUser();
  }, []);

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

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/account"), 1500);
  }

  if (checking) {
    return (
      <div className="flex min-h-[calc(100vh-76px)] items-center py-16">
        <Container className="max-w-[420px]">
          <div className="zari-frame rounded-card bg-ivory p-8 shadow-soft text-center">
            <p className="text-sm text-taupe font-medium">Checking reset session…</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-76px)] items-center py-16">
        <Container className="max-w-[420px]">
          <div className="zari-frame rounded-card bg-ivory p-8 shadow-soft text-center">
            <h1 className="font-display text-2xl text-ink">Invalid reset link</h1>
            <p className="mt-2 text-sm text-taupe">
              The password reset session is invalid or has expired. Please request a new link.
            </p>
            <Button href="/forgot-password" variant="gold" size="lg" className="mt-6 w-full">
              Request new link
            </Button>
          </div>
        </Container>
      </div>
    );
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
          <p className="mt-1 text-sm text-taupe">Enter a new password for <strong className="text-ink">{user.email}</strong>.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">
                New password
              </label>
              <div className="relative flex w-full">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-pill border border-line bg-white pl-4 pr-12 text-sm text-ink outline-none focus-visible:border-zari"
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
                Confirm new password
              </label>
              <div className="relative flex w-full">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 w-full rounded-pill border border-line bg-white pl-4 pr-12 text-sm text-ink outline-none focus-visible:border-zari"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-taupe hover:text-ink focus:outline-none"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" variant="gold" size="lg" className="mt-1 w-full" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
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
