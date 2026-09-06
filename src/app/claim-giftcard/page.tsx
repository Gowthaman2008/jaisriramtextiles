"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/ui/auth-modal";
import { useNotification } from "@/components/providers/notification-provider";
import {
  Gift,
  UploadCloud,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  FileImage,
  X,
  AlertCircle,
  Wallet,
  ChevronDown,
  Info,
  ExternalLink
} from "lucide-react";

interface GeneratedGiftCard {
  id: string;
  code: string;
  amount_paise: number;
  amount_rupees: number;
  platform: string;
  screenshot_url?: string;
  created_at: string;
}

const PLATFORMS = [
  { id: "amazon", name: "Amazon", icon: "📦", color: "from-amber-500/10 to-orange-500/10", border: "border-amber-400/50" },
  { id: "flipkart", name: "Flipkart", icon: "🛍️", color: "from-blue-500/10 to-sky-500/10", border: "border-blue-400/50" },
  { id: "google", name: "Google Reviews", icon: "⭐", color: "from-emerald-500/10 to-teal-500/10", border: "border-emerald-400/50" },
  { id: "meesho", name: "Meesho", icon: "✨", color: "from-pink-500/10 to-rose-500/10", border: "border-pink-400/50" },
  { id: "myntra", name: "Myntra", icon: "👗", color: "from-purple-500/10 to-indigo-500/10", border: "border-purple-400/50" },
  { id: "other", name: "Other Platform", icon: "🏷️", color: "from-neutral-500/10 to-stone-500/10", border: "border-line" },
];

export default function ClaimGiftCardPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const supabase = createClient();

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Form states
  const [selectedPlatform, setSelectedPlatform] = useState("amazon");
  const [orderReference, setOrderReference] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Result state
  const [generatedCard, setGeneratedCard] = useState<GeneratedGiftCard | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check initial user authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle file select
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!file.type.startsWith("image/")) {
      notify("Please select an image file (PNG, JPG, WEBP).", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify("File size exceeds 5MB limit. Please upload a smaller image.", "error");
      return;
    }

    setScreenshotFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSubmitError("");
  }

  function handleRemoveFile() {
    setScreenshotFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Trigger file dialog or auth modal
  function handleTriggerUpload() {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    fileInputRef.current?.click();
  }

  // Submit and generate ₹100 Gift Card
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!screenshotFile) {
      setSubmitError("Please upload your review submitted screenshot.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData();
      formData.append("screenshot", screenshotFile);
      formData.append("platform", selectedPlatform);
      if (orderReference.trim()) formData.append("orderReference", orderReference.trim());
      if (notes.trim()) formData.append("notes", notes.trim());

      const res = await fetch("/api/giftcards/claim", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate gift card. Please try again.");
      }

      if (data.giftCard) {
        setGeneratedCard(data.giftCard);

        // Auto copy code to clipboard
        try {
          await navigator.clipboard.writeText(data.giftCard.code);
          setCopied(true);
          notify("🎉 ₹100 Gift Card code generated & automatically copied to clipboard!", "success");
        } catch {
          notify("🎉 ₹100 Gift Card code generated successfully!", "success");
        }
      }
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred while uploading screenshot.");
      notify(err.message || "Upload failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Manual copy function
  async function handleManualCopy() {
    if (!generatedCard?.code) return;
    try {
      await navigator.clipboard.writeText(generatedCard.code);
      setCopied(true);
      notify("Gift Card Code copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      notify("Failed to copy code. Please copy manually.", "error");
    }
  }

  return (
    <main className="min-h-screen bg-ivory text-ink pb-20">
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          notify("Signed in successfully! You can now upload your review screenshot.", "success");
        }}
        title="Sign In to Claim ₹100 Gift Card"
        subtitle="Sign in or register to verify your review screenshot and receive your ₹100 gift card."
      />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#181410] via-ink to-[#1f1a14] text-ivory pt-16 pb-20 border-b border-zari/40">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#B08D4C_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <Container className="relative z-10 text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zari/20 border border-zari/40 text-zari-soft text-xs font-bold uppercase tracking-wider animate-fade-in">
            <Sparkles size={14} className="text-zari-soft animate-pulse" />
            Special Customer Appreciation Reward
          </div>

          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl text-ivory tracking-tight leading-tight">
            Claim Your <span className="text-gradient-gold">₹100 Gift Card</span>
          </h1>

          <p className="text-sm sm:text-base text-taupe/90 max-w-2xl mx-auto leading-relaxed">
            Reviewed <strong className="text-ivory">JAI SRI RAM TEXTILES</strong> on Amazon, Flipkart, Meesho, or Google? Upload your submitted review screenshot below to instantly generate a ₹100 one-time gift card code!
          </p>

          {/* Quick 3-Step Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <span className="w-7 h-7 rounded-full bg-zari/20 text-zari-soft flex items-center justify-center font-bold text-xs mb-2">1</span>
              <p className="font-bold text-sm text-ivory">Submit Review</p>
              <p className="text-xs text-taupe/80 mt-1">Rate 5-stars & share your feedback on Amazon, Flipkart, etc.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <span className="w-7 h-7 rounded-full bg-zari/20 text-zari-soft flex items-center justify-center font-bold text-xs mb-2">2</span>
              <p className="font-bold text-sm text-ivory">Upload Screenshot</p>
              <p className="text-xs text-taupe/80 mt-1">Upload the review submission screenshot as proof.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <span className="w-7 h-7 rounded-full bg-zari/20 text-zari-soft flex items-center justify-center font-bold text-xs mb-2">3</span>
              <p className="font-bold text-sm text-ivory">Instant ₹100 Code</p>
              <p className="text-xs text-taupe/80 mt-1">Auto-copied to clipboard & redeemable into wallet cashback!</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Content Area */}
      <Container className="py-12 max-w-4xl mx-auto">
        {!generatedCard ? (
          /* ================= STEP 1: UPLOAD FORM ================= */
          <div className="bg-white border border-line rounded-3xl p-6 sm:p-10 shadow-soft space-y-8 animate-fade-up">
            <div className="border-b border-line/60 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="font-display text-2xl text-ink">Upload Review Screenshot</h2>
                <p className="text-xs text-taupe mt-0.5">Fill in the platform details and attach your screenshot</p>
              </div>
              {user ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Signed in as {user.user_metadata?.full_name || user.email}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="text-xs font-bold text-zari-deep hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Sign in for faster submission &rarr;
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* 1. Platform Selector */}
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  1. Select Review Platform *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PLATFORMS.map((p) => {
                    const active = selectedPlatform === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlatform(p.id)}
                        className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                          active
                            ? `bg-gradient-to-r ${p.color} ${p.border} border-2 shadow-sm font-bold text-ink`
                            : "bg-white border-line hover:border-zari/40 text-taupe hover:text-ink"
                        }`}
                      >
                        <span className="text-xl">{p.icon}</span>
                        <span className="text-xs">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. File Upload Box */}
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  2. Upload Review Submitted Screenshot *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!previewUrl ? (
                  <div
                    onClick={handleTriggerUpload}
                    className="border-2 border-dashed border-zari/40 hover:border-zari bg-cream/20 hover:bg-cream/40 rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center space-y-3"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-zari/10 group-hover:bg-zari/20 text-zari flex items-center justify-center transition-colors">
                      <UploadCloud size={32} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-ink group-hover:text-zari transition-colors">
                        Click or drag review screenshot here
                      </p>
                      <p className="text-xs text-taupe mt-1">
                        Supports PNG, JPG, JPEG, WEBP (Max 5MB)
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-ivory text-xs font-bold rounded-xl group-hover:bg-zari transition-colors shadow-sm">
                      <FileImage size={14} /> Browse Image File
                    </span>
                  </div>
                ) : (
                  <div className="relative rounded-3xl border border-line bg-cream/10 p-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-line shrink-0 bg-white">
                      <img
                        src={previewUrl}
                        alt="Review Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1 text-left">
                      <p className="font-bold text-sm text-ink truncate">{screenshotFile?.name}</p>
                      <p className="text-xs text-taupe">
                        Size: {screenshotFile ? (screenshotFile.size / 1024).toFixed(1) + " KB" : ""}
                      </p>
                      <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold pt-1">
                        <CheckCircle2 size={14} /> Ready for generation
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <X size={14} /> Remove / Change
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Optional Reference / Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                    Platform Order ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 402-1234567-8901234"
                    value={orderReference}
                    onChange={(e) => setOrderReference(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari focus:ring-1 focus:ring-zari/40 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1">
                    Reviewer Name or Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Reviewed under username 'Gowthaman'"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-line rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-zari focus:ring-1 focus:ring-zari/40 shadow-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-ink via-ink to-[#1a1612] hover:from-zari hover:via-zari-deep hover:to-[#8C6D2D] text-ivory text-sm font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Sparkles className="animate-spin" size={18} />
                      Verifying & Generating ₹100 Gift Card...
                    </>
                  ) : (
                    <>
                      <Gift size={18} />
                      Generate ₹100 Gift Card Code Now
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ================= STEP 2: RESULT CARD ================= */
          <div className="bg-white border-2 border-zari/50 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-scale-up text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-zari/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-zari/10 rounded-full blur-2xl pointer-events-none" />

            {/* Reward Icon & Header */}
            <div className="space-y-3">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-zari-soft via-zari to-zari-deep text-ivory flex items-center justify-center shadow-lg animate-bounce">
                <Gift size={36} />
              </div>
              <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
                ✓ Screenshot Verified & Code Generated
              </span>
              <h2 className="font-display text-2xl sm:text-4xl text-ink">
                Here is Your ₹100 Gift Card!
              </h2>
              <p className="text-xs sm:text-sm text-taupe max-w-md mx-auto">
                This code is ready for one-time use. It has been automatically copied to your clipboard.
              </p>
            </div>

            {/* Generated Code Highlight Box */}
            <div className="max-w-lg mx-auto bg-gradient-to-br from-cream/40 via-white to-cream/20 border-2 border-dashed border-zari rounded-2xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between text-xs text-taupe uppercase tracking-wider font-bold">
                <span>Gift Card Code</span>
                <span className="text-zari-deep font-extrabold">Value: ₹100.00</span>
              </div>

              {/* Code string with highlight */}
              <div className="bg-ink text-zari-soft font-mono text-xl sm:text-3xl font-extrabold tracking-widest py-4 px-6 rounded-xl select-all flex items-center justify-center shadow-inner">
                {generatedCard.code}
              </div>

              {/* Action 1: Manual Copy Button */}
              <button
                type="button"
                onClick={handleManualCopy}
                className={`w-full py-3 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                  copied
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-white hover:bg-cream/40 text-ink border-line hover:border-zari shadow-sm"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={16} /> Code Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy Gift Card Code
                  </>
                )}
              </button>
            </div>

            {/* Action 2: Redeem Gift Code as Cashback Button */}
            <div className="max-w-lg mx-auto space-y-3 pt-2">
              <Link
                href={`/account?tab=wallet&redeem=${encodeURIComponent(generatedCard.code)}`}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-zari-deep via-zari to-zari-deep hover:brightness-110 text-white font-bold text-sm uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wallet size={18} />
                Redeem Gift Code as Cashback &rarr;
              </Link>
              <p className="text-[11px] text-taupe">
                Clicking will redirect to your Wallet section where you can convert this code into instant ₹100 wallet balance.
              </p>
            </div>

            {/* Claim Another Reset Button */}
            <div className="border-t border-line/60 pt-6 flex items-center justify-center gap-4 text-xs font-semibold text-taupe">
              <button
                onClick={() => {
                  setGeneratedCard(null);
                  setScreenshotFile(null);
                  setPreviewUrl(null);
                  setOrderReference("");
                  setNotes("");
                }}
                className="hover:text-ink underline cursor-pointer"
              >
                Submit another review screenshot
              </button>
              <span>•</span>
              <Link href="/shop" className="hover:text-ink underline">
                Browse Textile Collection
              </Link>
            </div>
          </div>
        )}

        {/* ================= TERMS & CONDITIONS ================= */}
        <div className="mt-12 bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-soft space-y-4">
          <div className="flex items-center gap-2 text-ink">
            <ShieldCheck className="w-5 h-5 text-zari" />
            <h3 className="font-display text-lg">Terms & Conditions — ₹100 Gift Card</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-taupe leading-relaxed">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-zari-deep">•</span>
                <p><strong className="text-ink">One-Time Use:</strong> Each generated ₹100 gift card code is valid for a single redemption per customer and review.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-zari-deep">•</span>
                <p><strong className="text-ink">Wallet Redemption:</strong> Users can redeem the code into their JAI SRI RAM TEXTILES Wallet as cashback balance.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-zari-deep">•</span>
                <p><strong className="text-ink">Checkout Rule:</strong> Wallet cashback balance is redeemable during checkout up to <strong className="text-ink font-semibold">20% of the cart subtotal, with a maximum limit of ₹50 per order</strong>.</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-zari-deep">•</span>
                <p><strong className="text-ink">Authentic Reviews:</strong> Screenshots must clearly show a submitted or published review on supported marketplaces (Amazon, Flipkart, Google, Meesho, Myntra).</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-zari-deep">•</span>
                <p><strong className="text-ink">Store Moderation:</strong> JAI SRI RAM TEXTILES reserves the right to verify submissions and deactivate fraudulent or duplicated entries.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-zari-deep">•</span>
                <p><strong className="text-ink">Support:</strong> For any assistance regarding your gift card code or wallet balance, contact our support desk from your account portal.</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
