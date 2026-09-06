"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Sparkles,
  AlertCircle,
  MailCheck,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  title?: string;
  subtitle?: string;
  nextUrl?: string;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>
  );
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Sign In to Claim ₹100 Gift Card",
  subtitle = "Please sign in or create an account so we can link your ₹100 gift card code.",
  nextUrl,
}: AuthModalProps) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [resendingLink, setResendingLink] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen && typeof document !== "undefined") {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    const supabase = createClient();
    const nextPath = nextUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (authError) {
      setError(authError.message);
      setGoogleLoading(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Invalid email or password.");
      }

      if (resData.user) {
        const supabase = createClient();
        await supabase.auth.getUser();
        onSuccess(resData.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
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
      const signupRes = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: cleanPhone,
        }),
      });

      const resData = await signupRes.json();
      if (!signupRes.ok) {
        throw new Error(resData.error || "Failed to create account.");
      }

      // Show dedicated verification link screen
      setEmailVerificationSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to register account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email.trim() || !name.trim() || !phone.trim() || !password) return;
    try {
      setResendingLink(true);
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim().replace(/\D/g, ""),
        }),
      });
      if (res.ok) {
        alert("Verification link resent to " + email);
      }
    } catch {
      // ignore
    } finally {
      setResendingLink(false);
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in"
      data-lenis-prevent
    >
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-[#FFFDF9] via-white to-[#FAF7F0] rounded-3xl shadow-2xl border border-amber-200/90 overflow-hidden animate-scale-up max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/70 p-5 sm:p-6 relative border-b border-amber-200/60 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 bg-white hover:bg-stone-100 rounded-full p-1.5 transition-colors cursor-pointer border border-stone-200 shadow-xs"
            aria-label="Close Modal"
          >
            <X size={17} />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 via-amber-400 to-amber-500 text-stone-950 flex items-center justify-center shadow-xs">
              <Sparkles size={13} />
            </span>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-900 font-sans">
              Member Sign In
            </span>
          </div>
          <h3 className="font-display text-base sm:text-lg text-stone-900 font-bold leading-tight">{title}</h3>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed line-clamp-2">{subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-4 pb-1 flex-shrink-0">
          <div className="p-1 bg-stone-100/90 rounded-2xl border border-stone-200/80 flex gap-1">
            <button
              type="button"
              onClick={() => { setTab("signin"); setError(""); }}
              className={`flex-1 py-2.5 text-xs font-bold transition-all text-center rounded-xl cursor-pointer ${
                tab === "signin"
                  ? "bg-white text-stone-950 shadow-xs border border-amber-300/70"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab("signup"); setError(""); }}
              className={`flex-1 py-2.5 text-xs font-bold transition-all text-center rounded-xl cursor-pointer ${
                tab === "signup"
                  ? "bg-white text-stone-950 shadow-xs border border-amber-300/70"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div 
          className="p-5 sm:p-6 pt-3 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain"
          data-lenis-prevent
        >
          {emailVerificationSent ? (
            /* VERIFICATION LINK SENT SCREEN */
            <div className="py-2 text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
                <MailCheck size={32} />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-display text-lg text-stone-900 font-bold">
                  Verification Link Sent to Your Email!
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                  We have sent an activation link to:
                  <br />
                  <strong className="text-stone-900 font-mono text-sm underline">{email}</strong>
                </p>
              </div>

              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-left space-y-2 text-xs">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  Next Steps to Activate Your Account:
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-600 text-[11px] leading-relaxed">
                  <li>Check your inbox (and spam/promotions folder).</li>
                  <li>Click the <strong>&quot;Confirm Email Address&quot;</strong> button inside.</li>
                  <li>After verifying, click the button below to sign in and continue!</li>
                </ol>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailVerificationSent(false);
                    setTab("signin");
                    setError("");
                  }}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-stone-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <span>I&apos;ve Verified — Sign In & Continue</span>
                  <ArrowRight size={15} />
                </button>

                <div className="flex items-center justify-between pt-1 px-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailVerificationSent(false);
                      setTab("signup");
                    }}
                    className="text-[11px] text-stone-500 hover:text-stone-900 underline cursor-pointer"
                  >
                    Edit details / Change email
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingLink}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={resendingLink ? "animate-spin" : ""} />
                    <span>{resendingLink ? "Resending..." : "Resend Email Link"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {error && (
                error.toLowerCase().includes("invalid login credentials") ||
                error.toLowerCase().includes("invalid_grant") ||
                error.toLowerCase().includes("user not found") ||
                error.toLowerCase().includes("invalid email or password") ? (
                  <div className="p-3.5 bg-amber-50/95 border border-amber-300 text-amber-950 text-xs rounded-2xl space-y-2.5 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-amber-900">
                          No Account Found or Incorrect Password
                        </p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          We couldn&apos;t find an active account for <strong className="text-stone-900 font-bold">{email || "this email"}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-amber-800 font-medium">Don&apos;t have an account yet?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTab("signup");
                          setError("");
                        }}
                        className="text-xs font-bold text-amber-900 hover:text-stone-950 underline flex items-center gap-1 cursor-pointer transition-colors bg-white px-3 py-1 rounded-lg border border-amber-300 shadow-xs"
                      >
                        Create Account &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )
              )}

              {/* Google 1-Click Login */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-800 shadow-xs transition-all duration-200 hover:border-amber-400 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                <GoogleIcon />
                <span>{googleLoading ? "Connecting with Google..." : "Continue with Google"}</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-stone-200 w-full" />
                <span className="bg-[#FAF8F3] px-3 text-[10px] uppercase font-bold text-stone-400 tracking-wider absolute">
                  or with email
                </span>
              </div>

              {/* SIGN IN FORM */}
              {tab === "signin" ? (
                <form onSubmit={handleSignIn} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/60 hover:bg-white focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-stone-50/60 hover:bg-white focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-stone-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    {loading ? "Signing In..." : "Sign In & Continue"}
                  </button>
                </form>
              ) : (
                /* SIGN UP FORM */
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Full Name"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/60 hover:bg-white focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Mobile Number (10 digits) *
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="9876543210"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/60 hover:bg-white focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/60 hover:bg-white focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Create Password (min 6 chars) *
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-stone-50/60 hover:bg-white focus:bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-stone-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    {loading ? "Creating Account..." : "Create Account & Continue"}
                  </button>
                </form>
              )}

              <div className="pt-2 text-center border-t border-stone-200/80">
                <a
                  href={`/sign-in?next=${encodeURIComponent(nextUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/"))}`}
                  className="text-[11px] text-stone-500 hover:text-amber-800 font-medium underline transition-colors"
                >
                  Prefer dedicated page? Open Sign In page &rarr;
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
