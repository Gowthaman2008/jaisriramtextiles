"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Eye, EyeOff, Lock, Mail, User as UserIcon, Phone, Sparkles } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  title?: string;
  subtitle?: string;
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
  const [signupSuccessMsg, setSignupSuccessMsg] = useState("");

  if (!isOpen) return null;

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    const supabase = createClient();
    const callbackUrl = typeof window !== "undefined" ? window.location.href : "/";
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
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data?.user) {
        onSuccess(data.user);
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
    setSignupSuccessMsg("");

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

      // Automatically sign in after registration
      const supabase = createClient();
      const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signinError || !signinData?.user) {
        setSignupSuccessMsg("Account created! Please enter your password to sign in.");
        setTab("signin");
      } else {
        onSuccess(signinData.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to register account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-line overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-ink via-ink to-[#1a1612] text-ivory p-6 relative border-b border-zari/40">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-ivory/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded-md bg-zari/20 text-zari-soft">
              <Sparkles size={16} />
            </span>
            <span className="text-[11px] uppercase tracking-widest font-bold text-zari-soft">Authentication</span>
          </div>
          <h3 className="font-display text-lg text-ivory">{title}</h3>
          <p className="text-xs text-taupe/80 mt-1 leading-relaxed">{subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-line bg-cream/30">
          <button
            type="button"
            onClick={() => { setTab("signin"); setError(""); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors text-center border-b-2 ${
              tab === "signin"
                ? "border-zari text-ink bg-white"
                : "border-transparent text-taupe hover:text-ink"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setError(""); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors text-center border-b-2 ${
              tab === "signup"
                ? "border-zari text-ink bg-white"
                : "border-transparent text-taupe hover:text-ink"
            }`}
          >
            Create New Account
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {signupSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
              {signupSuccessMsg}
            </div>
          )}

          {/* Google 1-Click Login */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-line bg-white hover:bg-cream/40 text-xs font-bold text-ink shadow-sm transition-all duration-200 hover:border-zari/60 cursor-pointer disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? "Connecting with Google..." : "Continue with Google"}
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-line w-full" />
            <span className="bg-white px-3 text-[10px] uppercase font-bold text-taupe tracking-wider absolute">
              or with email
            </span>
          </div>

          {/* SIGN IN FORM */}
          {tab === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari focus:ring-1 focus:ring-zari/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari focus:ring-1 focus:ring-zari/40 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-ink hover:bg-zari text-ivory text-xs font-bold rounded-xl transition-all duration-300 shadow-soft cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Signing In..." : "Sign In & Continue"}
              </button>
            </form>
          ) : (
            /* SIGN UP FORM */
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari focus:ring-1 focus:ring-zari/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Mobile Number (10 digits) *
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari focus:ring-1 focus:ring-zari/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari focus:ring-1 focus:ring-zari/40 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                  Create Password (min 6 chars) *
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari focus:ring-1 focus:ring-zari/40 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-ink hover:bg-zari text-ivory text-xs font-bold rounded-xl transition-all duration-300 shadow-soft cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Creating Account..." : "Create Account & Continue"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
