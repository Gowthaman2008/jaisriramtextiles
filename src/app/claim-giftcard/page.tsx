"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gift,
  UploadCloud,
  CheckCircle2,
  Copy,
  Check,
  Wallet,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileImage,
  X,
  ExternalLink,
  Lock,
  Clock,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { useNotification } from "@/components/providers/notification-provider";
import { AuthModal } from "@/components/ui/auth-modal";
import { createClient } from "@/lib/supabase/client";

interface GeneratedGiftCard {
  id: string;
  code: string;
  amount_paise: number;
  amount_rupees: number;
  status: string;
  platform: string;
  screenshot_url?: string;
  screenshot_urls?: string[];
  expires_at?: string;
  created_at: string;
}

const PLATFORMS = [
  { id: "amazon", name: "Amazon", icon: "📦", color: "from-amber-500/10 to-orange-500/10", border: "border-amber-300" },
  { id: "flipkart", name: "Flipkart", icon: "🛍️", color: "from-blue-500/10 to-yellow-500/10", border: "border-blue-300" },
  { id: "google", name: "Google Reviews", icon: "⭐", color: "from-red-500/10 to-green-500/10", border: "border-emerald-300" },
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

  // Live Order ID verification state
  const [verifyingOrderId, setVerifyingOrderId] = useState(false);
  const [orderVerificationResult, setOrderVerificationResult] = useState<{
    valid?: boolean;
    claimed?: boolean;
    exists?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Google 1-time claim tracking
  const [googleClaimed, setGoogleClaimed] = useState(false);
  const [googleCardInfo, setGoogleCardInfo] = useState<any>(null);
  const [checkingGoogleStatus, setCheckingGoogleStatus] = useState(false);

  // Screenshot states (Slot 1 used for all; Slot 2 used for Amazon/Flipkart)
  const [screenshot1, setScreenshot1] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);

  const [screenshot2, setScreenshot2] = useState<File | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Result state
  const [generatedCard, setGeneratedCard] = useState<GeneratedGiftCard | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const isGoogle = selectedPlatform === "google";

  // Debounced live verification of Amazon/Flipkart Order ID against Admin registry
  useEffect(() => {
    if (isGoogle || !orderReference.trim()) {
      setOrderVerificationResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setVerifyingOrderId(true);
        const res = await fetch(`/api/giftcards/verify-order?platform=${encodeURIComponent(selectedPlatform)}&orderId=${encodeURIComponent(orderReference.trim())}`);
        const data = await res.json();
        setOrderVerificationResult(data);
      } catch (err) {
        console.error("Order verification error:", err);
      } finally {
        setVerifyingOrderId(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [orderReference, selectedPlatform, isGoogle]);

  // Check Google 1-time claim status
  async function checkGoogleStatus() {
    try {
      setCheckingGoogleStatus(true);
      const res = await fetch("/api/giftcards/claim");
      if (res.ok) {
        const data = await res.json();
        setGoogleClaimed(!!data.googleClaimed);
        setGoogleCardInfo(data.googleCard || null);
      }
    } catch (err) {
      console.error("Failed to check Google claim status:", err);
    } finally {
      setCheckingGoogleStatus(false);
    }
  }

  // Check initial user authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          checkGoogleStatus();
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        checkGoogleStatus();
      } else {
        setGoogleClaimed(false);
        setGoogleCardInfo(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle file select for slot 1
  function handleFileChange1(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (isGoogle && googleClaimed) {
      notify("You have already claimed your 1-time Google Review gift card.", "error");
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

    setScreenshot1(file);
    setPreview1(URL.createObjectURL(file));
    setSubmitError("");
  }

  // Handle file select for slot 2
  function handleFileChange2(e: React.ChangeEvent<HTMLInputElement>) {
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

    setScreenshot2(file);
    setPreview2(URL.createObjectURL(file));
    setSubmitError("");
  }

  function handleRemoveFile1() {
    setScreenshot1(null);
    if (preview1) URL.revokeObjectURL(preview1);
    setPreview1(null);
    if (fileInputRef1.current) fileInputRef1.current.value = "";
  }

  function handleRemoveFile2() {
    setScreenshot2(null);
    if (preview2) URL.revokeObjectURL(preview2);
    setPreview2(null);
    if (fileInputRef2.current) fileInputRef2.current.value = "";
  }

  // Trigger file dialog or auth modal
  function handleTriggerUpload1() {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (isGoogle && googleClaimed) {
      notify("Google Review reward is 1-time only and has already been claimed for this account.", "error");
      return;
    }
    fileInputRef1.current?.click();
  }

  function handleTriggerUpload2() {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    fileInputRef2.current?.click();
  }

  // Submit and generate ₹100 Gift Card
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Google reviews validation
    if (isGoogle) {
      if (googleClaimed) {
        setSubmitError("You have already claimed a ₹100 Gift Card for Google Reviews. Google Review reward is limited to 1 time per account.");
        notify("Google Review reward already claimed.", "error");
        return;
      }

      if (!screenshot1) {
        setSubmitError("Please upload your Google Review screenshot to generate your ₹100 gift card.");
        notify("Please upload your Google Review screenshot.", "error");
        return;
      }
    } else {
      // Amazon / Flipkart validation
      if (!screenshot1 || !screenshot2) {
        setSubmitError("Both 2 screenshots are compulsory for Amazon/Flipkart reviews. Please upload Screenshot 1 and Screenshot 2.");
        notify("Please upload both 2 required screenshots.", "error");
        return;
      }

      if (!orderReference.trim()) {
        setSubmitError("Platform Order ID is compulsory. Please enter your Order ID.");
        notify("Please enter your Platform Order ID.", "error");
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData();
      formData.append("screenshot1", screenshot1);
      if (!isGoogle && screenshot2) {
        formData.append("screenshot2", screenshot2);
      }
      formData.append("platform", selectedPlatform);
      if (!isGoogle && orderReference.trim()) {
        formData.append("orderReference", orderReference.trim());
      }

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

        if (isGoogle) {
          setGoogleClaimed(true);
          setGoogleCardInfo(data.giftCard);
        }

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

  const amazonOrFlipkartReady = !isGoogle && !!screenshot1 && !!screenshot2;
  const googleReady = isGoogle && !!screenshot1;

  return (
    <main className="min-h-screen bg-ivory text-ink pb-20">
      {/* Auth Modal Popup */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          setShowAuthModal(false);
          checkGoogleStatus();
        }}
      />

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-cream via-cream/50 to-ivory border-b border-line/60 pt-12 pb-14 sm:pb-18">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zari/10 border border-zari/30 text-zari-deep text-xs font-bold uppercase tracking-wider">
              <Gift size={15} className="text-zari" />
              <span>Customer Review Rewards</span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl text-ink tracking-tight font-normal">
              Claim Your <span className="italic text-zari font-serif">₹100 Gift Card</span>
            </h1>

            <p className="text-sm sm:text-base text-taupe leading-relaxed max-w-2xl mx-auto">
              Share your positive review on Amazon, Flipkart, or Google Reviews to earn an instant ₹100 Gift Card redeemable into your wallet as cashback!
            </p>
          </div>
        </Container>
      </section>

      {/* Main Container */}
      <Container className="mt-8 sm:mt-10">
        <div className="max-w-2xl mx-auto">
          {!generatedCard ? (
            /* ================= STEP 1: UPLOAD FORM ================= */
            <div className="bg-white border border-line rounded-3xl p-6 sm:p-10 shadow-soft space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-5">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl text-ink">
                    Submit Review Verification
                  </h2>
                  <p className="text-xs text-taupe mt-0.5">
                    {isGoogle
                      ? "Upload 1 Google Review screenshot to claim your 1-time ₹100 gift card"
                      : "Please upload both compulsory screenshots and your Order ID"}
                  </p>
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

              <form onSubmit={handleSubmit} className="space-y-7">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {PLATFORMS.map((p) => {
                      const active = selectedPlatform === p.id;
                      const isGooglePlatform = p.id === "google";
                      const isGoogleLocked = isGooglePlatform && user && googleClaimed;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlatform(p.id);
                            setSubmitError("");
                          }}
                          className={`relative flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                            active
                              ? `bg-gradient-to-r ${p.color} ${p.border} border-2 shadow-sm font-bold text-ink`
                              : "bg-white border-line hover:border-zari/40 text-taupe hover:text-ink"
                          }`}
                        >
                          <span className="text-xl">{p.icon}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs block font-bold">{p.name}</span>
                            {isGooglePlatform && (
                              <span className="text-[9px] text-taupe font-medium block">
                                {isGoogleLocked ? "✓ Already Claimed" : "1 Time per Account"}
                              </span>
                            )}
                          </div>
                          {isGoogleLocked && (
                            <Lock size={12} className="text-amber-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Google Already Claimed Notice Banner */}
                {isGoogle && user && googleClaimed && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <Lock size={16} className="text-amber-700 shrink-0" />
                      <span>Google Review Reward Already Claimed (1-Time Limit)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      You have already claimed your 1-time ₹100 Gift Card for Google Reviews on this account. Google Review rewards can only be used once. You can still claim gift cards by reviewing your <strong>Amazon</strong> or <strong>Flipkart</strong> orders above!
                    </p>
                    {googleCardInfo?.code && (
                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-amber-700">Your Google Code:</span>
                        <code className="px-2 py-0.5 bg-amber-100/80 font-mono text-xs font-bold text-ink rounded border border-amber-300">
                          {googleCardInfo.code}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. File Upload Section */}
                {isGoogle ? (
                  /* GOOGLE REVIEWS: SINGLE SCREENSHOT UPLOAD */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                        2. Upload Google Review Screenshot *
                      </label>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 uppercase tracking-wide">
                        1 Screenshot Only
                      </span>
                    </div>

                    <input
                      ref={fileInputRef1}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleFileChange1}
                      className="hidden"
                      disabled={googleClaimed}
                    />

                    {!preview1 ? (
                      <div
                        onClick={handleTriggerUpload1}
                        className={`border-2 border-dashed border-zari/40 hover:border-zari bg-cream/20 hover:bg-cream/40 rounded-2xl p-6 text-center transition-all duration-200 group flex flex-col items-center justify-center space-y-2 min-h-[160px] ${
                          googleClaimed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-zari/10 group-hover:bg-zari/20 text-zari flex items-center justify-center transition-colors">
                          <UploadCloud size={24} />
                        </div>
                        <p className="font-bold text-xs text-ink group-hover:text-zari transition-colors">
                          Upload Google Review Screenshot (Compulsory)
                        </p>
                        <span className="text-[10px] text-taupe">Upload 1 clear screenshot of your Google Review (Max 5MB)</span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-ink text-ivory text-[10px] font-bold rounded-lg group-hover:bg-zari transition-colors">
                          <FileImage size={12} /> Choose Image
                        </span>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl border border-line bg-cream/15 p-4 flex items-center gap-4 min-h-[140px]">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-line shrink-0 bg-white shadow-sm">
                          <img
                            src={preview1}
                            alt="Google Review Screenshot Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1 text-left">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase">
                            ✓ Google Review Screenshot Ready
                          </span>
                          <p className="font-bold text-xs text-ink truncate">{screenshot1?.name}</p>
                          <p className="text-[10px] text-taupe">
                            Size: {screenshot1 ? (screenshot1.size / 1024).toFixed(1) + " KB" : ""}
                          </p>
                          <button
                            type="button"
                            onClick={handleRemoveFile1}
                            className="mt-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <X size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {googleReady && !googleClaimed && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>✓ Google Review screenshot uploaded & ready for ₹100 gift card generation!</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* AMAZON / FLIPKART: 2 COMPULSORY SCREENSHOTS */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                        2. Upload 2 Required Screenshots (Compulsory) *
                      </label>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 uppercase tracking-wide">
                        2 Images Required
                      </span>
                    </div>

                    <input
                      ref={fileInputRef1}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleFileChange1}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef2}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleFileChange2}
                      className="hidden"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                      {/* SLOT 1 */}
                      <div className="flex flex-col h-full space-y-2">
                        <div className="min-h-[36px] flex items-center">
                          <span className="text-[11px] font-bold text-taupe uppercase tracking-wider leading-tight">
                            Screenshot 1: Review & 5-Star Rating *
                          </span>
                        </div>
                        {!preview1 ? (
                          <div
                            onClick={handleTriggerUpload1}
                            className="flex-1 border-2 border-dashed border-zari/40 hover:border-zari bg-cream/20 hover:bg-cream/40 rounded-2xl p-5 text-center transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center space-y-2 min-h-[170px]"
                          >
                            <div className="w-11 h-11 rounded-xl bg-zari/10 group-hover:bg-zari/20 text-zari flex items-center justify-center transition-colors">
                              <UploadCloud size={22} />
                            </div>
                            <p className="font-bold text-xs text-ink group-hover:text-zari transition-colors">
                              Upload Screenshot 1
                            </p>
                            <span className="text-[10px] text-taupe">PNG, JPG, WEBP (Max 5MB)</span>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-ink text-ivory text-[10px] font-bold rounded-lg group-hover:bg-zari transition-colors mt-1">
                              <FileImage size={12} /> Choose Image 1
                            </span>
                          </div>
                        ) : (
                          <div className="flex-1 rounded-2xl border border-line bg-cream/15 p-3.5 flex items-center gap-3.5 min-h-[170px]">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-line shrink-0 bg-white shadow-xs flex items-center justify-center">
                              <img
                                src={preview1}
                                alt="Screenshot 1 Preview"
                                className="w-full h-full object-cover block"
                              />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1 text-left">
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wide">
                                  ✓ Screenshot 1 Ready
                                </span>
                              </div>
                              <p className="font-bold text-xs text-ink truncate block" title={screenshot1?.name}>
                                {screenshot1?.name}
                              </p>
                              <p className="text-[10px] text-taupe">
                                Size: {screenshot1 ? (screenshot1.size / 1024).toFixed(1) + " KB" : ""}
                              </p>
                              <div>
                                <button
                                  type="button"
                                  onClick={handleRemoveFile1}
                                  className="mt-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <X size={12} /> Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SLOT 2 */}
                      <div className="flex flex-col h-full space-y-2">
                        <div className="min-h-[36px] flex items-center">
                          <span className="text-[11px] font-bold text-taupe uppercase tracking-wider leading-tight">
                            Screenshot 2: Review Submitted / Order Proof *
                          </span>
                        </div>
                        {!preview2 ? (
                          <div
                            onClick={handleTriggerUpload2}
                            className="flex-1 border-2 border-dashed border-zari/40 hover:border-zari bg-cream/20 hover:bg-cream/40 rounded-2xl p-5 text-center transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center space-y-2 min-h-[170px]"
                          >
                            <div className="w-11 h-11 rounded-xl bg-zari/10 group-hover:bg-zari/20 text-zari flex items-center justify-center transition-colors">
                              <UploadCloud size={22} />
                            </div>
                            <p className="font-bold text-xs text-ink group-hover:text-zari transition-colors">
                              Upload Screenshot 2
                            </p>
                            <span className="text-[10px] text-taupe">PNG, JPG, WEBP (Max 5MB)</span>
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-ink text-ivory text-[10px] font-bold rounded-lg group-hover:bg-zari transition-colors mt-1">
                              <FileImage size={12} /> Choose Image 2
                            </span>
                          </div>
                        ) : (
                          <div className="flex-1 rounded-2xl border border-line bg-cream/15 p-3.5 flex items-center gap-3.5 min-h-[170px]">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-line shrink-0 bg-white shadow-xs flex items-center justify-center">
                              <img
                                src={preview2}
                                alt="Screenshot 2 Preview"
                                className="w-full h-full object-cover block"
                              />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1 text-left">
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wide">
                                  ✓ Screenshot 2 Ready
                                </span>
                              </div>
                              <p className="font-bold text-xs text-ink truncate block" title={screenshot2?.name}>
                                {screenshot2?.name}
                              </p>
                              <p className="text-[10px] text-taupe">
                                Size: {screenshot2 ? (screenshot2.size / 1024).toFixed(1) + " KB" : ""}
                              </p>
                              <div>
                                <button
                                  type="button"
                                  onClick={handleRemoveFile2}
                                  className="mt-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <X size={12} /> Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {amazonOrFlipkartReady && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>✓ Both 2 screenshots uploaded and ready for ₹100 gift card generation!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Compulsory Platform Order ID (Hidden for Google Reviews) */}
                {!isGoogle && (
                  <div>
                    <label className="block text-[10px] font-bold text-taupe uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>
                        3. Platform Order ID <span className="text-red-500 font-extrabold">* (Compulsory)</span>
                      </span>
                      <span className="text-[9px] text-taupe font-normal lowercase">Verified from store registry</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. 402-1234567-8901234"
                        value={orderReference}
                        onChange={(e) => setOrderReference(e.target.value)}
                        className={`w-full px-4 py-3 bg-white border rounded-xl text-xs text-ink placeholder:text-muted/60 focus:outline-none transition-all ${
                          orderVerificationResult?.valid
                            ? "border-emerald-500 ring-1 ring-emerald-500/30"
                            : orderVerificationResult && !orderVerificationResult.valid
                            ? "border-amber-400 ring-1 ring-amber-400/30"
                            : "border-line focus:border-zari focus:ring-1 focus:ring-zari/40"
                        }`}
                      />
                      {verifyingOrderId && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-taupe">
                          <Sparkles className="animate-spin text-zari" size={14} />
                          <span>Verifying...</span>
                        </div>
                      )}
                    </div>

                    {/* Live Order Verification Badges */}
                    {orderVerificationResult && !verifyingOrderId && (
                      <div className="mt-2">
                        {orderVerificationResult.valid ? (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                            <span>{orderVerificationResult.message || "✓ Order ID verified & eligible for ₹100 Gift Card!"}</span>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle size={15} className="text-amber-700 shrink-0" />
                            <span className="leading-tight">{orderVerificationResult.error}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || (isGoogle && googleClaimed)}
                    className={`w-full py-4 px-6 rounded-2xl text-ivory text-sm font-bold uppercase tracking-wider shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                      isGoogle && googleClaimed
                        ? "bg-stone-300 text-stone-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-ink via-ink to-[#1a1612] hover:from-zari hover:via-zari-deep hover:to-[#8C6D2D] hover:shadow-xl cursor-pointer disabled:opacity-50"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Sparkles className="animate-spin" size={18} />
                        Running AI Review & Order ID Verification...
                      </>
                    ) : isGoogle && googleClaimed ? (
                      <>
                        <Lock size={18} />
                        Google Review Reward Already Claimed
                      </>
                    ) : (
                      <>
                        <Gift size={18} />
                        {isGoogle ? "Submit Google Review & Generate ₹100 Code" : "Submit 2 Screenshots & Generate ₹100 Code"}
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
                  ✓ {isGoogle ? "Google Review Verified & Code Generated" : "2 Screenshots Verified & Code Generated"}
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

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-taupe">
                  <Clock size={12} className="text-zari" />
                  <span>Valid for 1 Year (Expires: {generatedCard.expires_at ? new Date(generatedCard.expires_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "365 days from issue"})</span>
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
                    handleRemoveFile1();
                    handleRemoveFile2();
                    setOrderReference("");
                    setOrderVerificationResult(null);
                  }}
                  className="hover:text-ink underline cursor-pointer"
                >
                  Submit another review verification
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
                  <p><strong className="text-ink">1-Year Expiry:</strong> All generated ₹100 gift card codes are valid for <strong className="text-ink font-semibold">1 full year (365 days)</strong> from the date of issue.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-zari-deep">•</span>
                  <p><strong className="text-ink">One-Time Use:</strong> Each code is valid for a single redemption per customer and review.</p>
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
                  <p><strong className="text-ink">Proof Screenshots:</strong> Amazon & Flipkart reviews require 2 screenshots and verified Platform Order ID. Google Reviews require 1 screenshot.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-zari-deep">•</span>
                  <p><strong className="text-ink">Google Review 1-Time Limit:</strong> Google Reviews reward is strictly limited to 1 claim per customer account.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-zari-deep">•</span>
                  <p><strong className="text-ink">Store Moderation:</strong> JAI SRI RAM TEXTILES reserves the right to verify submissions and deactivate fraudulent entries.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
