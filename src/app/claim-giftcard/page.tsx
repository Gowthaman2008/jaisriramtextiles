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
  Play,
  Video,
  HelpCircle,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Headphones,
  Mail,
  MessageSquare,
  LifeBuoy,
  History,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
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

// Helper to compress large screenshots on the client-side before upload
async function compressImageFile(file: File, maxDimension = 1400, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 400 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    } catch {
      resolve(file);
    }
  });
}

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

  // Tutorial Video Modal & data state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [tutorialVideo, setTutorialVideo] = useState<{
    video_url: string;
    title: string;
    description: string;
    enabled: boolean;
  }>({
    video_url: "",
    title: "How to Review on Amazon, Flipkart & Google for ₹100 Gift Card",
    description: "Follow these simple steps: leave your positive review, take the 2 required screenshots with your Order ID, and claim your instant ₹100 Gift Card!",
    enabled: true,
  });

  // AI Verification Failure Modal state
  const [showAiFailureModal, setShowAiFailureModal] = useState(false);
  const [aiFailureReason, setAiFailureReason] = useState("");

  // Customer Support Modal state
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Full-screen card generation cinematic animation state
  const [isGeneratingAnimation, setIsGeneratingAnimation] = useState(false);
  const [generationStage, setGenerationStage] = useState<1 | 2 | 3>(1);

  // Result state
  const [generatedCard, setGeneratedCard] = useState<GeneratedGiftCard | null>(null);
  const [copied, setCopied] = useState(false);

  // User Gift Card History state
  const [historyCards, setHistoryCards] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copiedHistoryCode, setCopiedHistoryCode] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  function playCelebrationFanfare() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      // Ascending celebratory arpeggio: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);
        gain.gain.setValueAtTime(0, now + idx * 0.11);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.11 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.4);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch {}
  }

  async function fetchGiftCardHistory() {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/giftcards/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryCards(data.giftCards || []);
      }
    } catch (err) {
      console.error("Failed to load gift cards history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleCopyHistoryCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedHistoryCode(code);
      notify("Gift Card Code copied to clipboard!", "success");
      setTimeout(() => setCopiedHistoryCode(null), 2500);
    } catch {
      notify("Failed to copy code.", "error");
    }
  }

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const isGoogle = selectedPlatform === "google";

  // Fetch tutorial video data on mount
  useEffect(() => {
    async function fetchTutorialVideo() {
      try {
        const res = await fetch("/api/giftcards/tutorial-video");
        if (res.ok) {
          const data = await res.json();
          setTutorialVideo(data);
        }
      } catch (err) {
        console.error("Failed to load tutorial video:", err);
      }
    }
    fetchTutorialVideo();
  }, []);

  // Lock background body & html scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = showAiFailureModal || showVideoModal || showSupportModal || showAuthModal;
    if (isAnyModalOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [showAiFailureModal, showVideoModal, showSupportModal, showAuthModal]);

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

  // Check initial user authentication & fetch gift card history
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          checkGoogleStatus();
          fetchGiftCardHistory();
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
        fetchGiftCardHistory();
      } else {
        setGoogleClaimed(false);
        setGoogleCardInfo(null);
        setHistoryCards([]);
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
      // Compress large images on client side for fast and reliable upload
      const [compressed1, compressed2] = await Promise.all([
        compressImageFile(screenshot1),
        screenshot2 ? compressImageFile(screenshot2) : Promise.resolve(null),
      ]);

      const formData = new FormData();
      formData.append("screenshot1", compressed1);
      if (!isGoogle && compressed2) {
        formData.append("screenshot2", compressed2);
      }
      formData.append("platform", selectedPlatform);
      if (!isGoogle && orderReference.trim()) {
        formData.append("orderReference", orderReference.trim());
      }

      const res = await fetch("/api/giftcards/claim", {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(
          res.status === 413
            ? "Uploaded screenshots are too large. Please try smaller files."
            : `Server response error (${res.status}). Please try again in a few moments.`
        );
      }

      if (!res.ok) {
        if (
          data.isAiVerificationFailed ||
          data.error?.toLowerCase().includes("ai verification failed") ||
          data.error?.toLowerCase().includes("rejected by ai")
        ) {
          const reason = data.aiReason || data.error?.replace("AI Verification Failed: ", "") || "The uploaded screenshot was not recognized as an authentic review.";
          setAiFailureReason(reason);
          setShowAiFailureModal(true);
        }
        throw new Error(data.error || "Failed to generate gift card. Please try again.");
      }

      if (data.giftCard) {
        setIsGeneratingAnimation(true);
        setGenerationStage(1);

        setTimeout(() => setGenerationStage(2), 850);
        setTimeout(() => {
          setGenerationStage(3);
          playCelebrationFanfare();
        }, 1750);

        setTimeout(() => {
          setIsGeneratingAnimation(false);
          setGeneratedCard(data.giftCard);

          if (typeof window !== "undefined") {
            window.scrollToTop ? window.scrollToTop("instant") : window.scrollTo(0, 0);
            setTimeout(() => {
              if (window.scrollToTop) window.scrollToTop("instant");
              else window.scrollTo(0, 0);
            }, 60);
          }

          if (isGoogle) {
            setGoogleClaimed(true);
            setGoogleCardInfo(data.giftCard);
          }

          // Refresh gift card history list
          fetchGiftCardHistory();

          // Auto copy code to clipboard
          try {
            navigator.clipboard.writeText(data.giftCard.code);
            setCopied(true);
            notify("🎉 ₹100 Gift Card code generated & automatically copied to clipboard!", "success");
          } catch {
            notify("🎉 ₹100 Gift Card code generated successfully!", "success");
          }
        }, 2650);
      }
    } catch (err: any) {
      const errMsg = err.name === "TypeError" && err.message.includes("fetch")
        ? "Network connection issue or request timed out. Please check your internet connection and try submitting again."
        : err.message || "An error occurred while uploading screenshot.";
      setSubmitError(errMsg);
      notify(errMsg, "error");
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

  function getYouTubeEmbedUrl(url: string): string {
    if (!url) return "";
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (url.includes("watch?v=")) {
      const id = url.split("watch?v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    return url;
  }

  return (
    <main className="min-h-screen bg-ivory text-ink pb-20">
      {/* ================= SIMPLE CLEAN CARD GENERATION LOADER ================= */}
      {isGeneratingAnimation && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-white/95 backdrop-blur-md text-ink text-center select-none animate-fade-in">
          <div className="max-w-sm w-full space-y-6 flex flex-col items-center animate-scale-up">
            {/* Simple Animated Gift Icon */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-100/80 animate-ping opacity-60" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-zari via-amber-400 to-zari-deep text-stone-950 flex items-center justify-center shadow-lg">
                <Gift className="w-8 h-8 animate-pulse text-stone-950" />
              </div>
            </div>

            {/* Clean Status Text */}
            <div className="space-y-1.5">
              <h3 className="font-display text-lg sm:text-xl font-bold text-ink">
                {generationStage === 1 && "Verifying Review..."}
                {generationStage === 2 && "Generating ₹100 Gift Card..."}
                {generationStage === 3 && "Gift Card Ready!"}
              </h3>
              <p className="text-xs text-taupe">
                {generationStage === 1 && "Checking screenshot authenticity"}
                {generationStage === 2 && "Allocating your voucher code"}
                {generationStage === 3 && "Opening your gift card"}
              </p>
            </div>

            {/* Simple Slim Progress Bar */}
            <div className="w-48 space-y-1.5">
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden border border-line">
                <div
                  className="h-full bg-gradient-to-r from-zari-deep via-zari to-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${generationStage === 1 ? 33 : generationStage === 2 ? 66 : 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-taupe font-medium">
                <span>Stage {generationStage} of 3</span>
                <span>{generationStage === 1 ? "33%" : generationStage === 2 ? "66%" : "100%"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Animated AI Verification Failure Modal */}
      {showAiFailureModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setShowAiFailureModal(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl border-2 border-red-200/90 shadow-2xl overflow-hidden animate-scale-up text-ink text-center p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAiFailureModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-taupe hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Pulsing Animated Warning Icon */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-200 animate-ping opacity-50" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                <AlertTriangle size={36} />
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-extrabold uppercase tracking-wider">
                ✕ AI Review Verification Failed
              </span>
              <h3 className="font-display text-xl sm:text-2xl text-ink font-bold">
                Screenshot Rejected by AI
              </h3>
            </div>

            {/* Specific AI Rejection Reason Card */}
            <div className="p-4 sm:p-5 bg-red-50/90 border border-red-200 rounded-2xl text-left space-y-2 text-xs shadow-inner">
              <span className="font-bold text-red-900 flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-red-600 shrink-0" />
                Why was your screenshot rejected?
              </span>
              <p className="text-red-800 leading-relaxed font-medium">
                {aiFailureReason || "The uploaded image does not appear to be a real review screenshot from Amazon, Flipkart, or Google Reviews."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* Button 1: Watch Video */}
              <button
                type="button"
                onClick={() => {
                  setShowAiFailureModal(false);
                  setShowVideoModal(true);
                }}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-zari-deep via-zari to-zari-deep hover:brightness-110 text-ivory text-xs font-bold uppercase tracking-wider rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
              >
                <Play size={14} className="fill-ivory" />
                <span>Watch Video Tutorial (How to Review)</span>
              </button>

              {/* Button 2: Customer Support */}
              <button
                type="button"
                onClick={() => {
                  setShowAiFailureModal(false);
                  setShowSupportModal(true);
                }}
                className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/80 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <Headphones size={14} className="text-emerald-700" />
                <span>Contact Customer Support</span>
              </button>

              {/* Button 3: Dismiss & Re-upload */}
              <button
                type="button"
                onClick={() => setShowAiFailureModal(false)}
                className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-ink text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Upload Correct Screenshots</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered 'How to Review' Video Tutorial Modal (Luxury Light Theme) */}
      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative w-full max-w-md sm:max-w-lg bg-white rounded-3xl border border-line/80 shadow-2xl overflow-hidden animate-scale-up text-ink max-h-[92vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Luxury Light Modal Header */}
            <div className="shrink-0 relative px-5 sm:px-6 py-4 border-b border-line bg-gradient-to-r from-cream/90 via-ivory to-amber-50/60 text-ink overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-zari/15 via-zari/5 to-transparent pointer-events-none" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 sm:w-11 h-10 sm:h-11 rounded-2xl bg-gradient-to-tr from-zari via-amber-400 to-zari-deep text-stone-950 flex items-center justify-center shadow-md font-bold">
                      <Video size={20} className="text-stone-950 fill-stone-950" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base sm:text-lg text-ink font-bold tracking-tight">
                        How to Review &amp; Claim
                      </h3>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zari/15 border border-zari/30 text-zari-deep text-[9px] font-extrabold uppercase tracking-wider">
                        ₹100 Reward
                      </span>
                    </div>
                    <p className="text-[11px] text-taupe mt-0.5 font-medium">
                      Quick Visual Walkthrough for Amazon, Flipkart &amp; Google
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="w-8 h-8 rounded-full bg-cream hover:bg-stone-200 border border-line flex items-center justify-center text-taupe hover:text-ink transition-colors cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Content (Light Theme) */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-stone-50/60 p-4 sm:p-5 space-y-4">
              {/* If real video URL is present */}
              {tutorialVideo.video_url ? (
                <div className="flex justify-center">
                  <div className="w-full max-w-[320px] aspect-[9/16] max-h-[52vh] rounded-3xl overflow-hidden border-2 border-zari/40 bg-black shadow-xl relative">
                    {tutorialVideo.video_url.includes("youtube.com") || tutorialVideo.video_url.includes("youtu.be") ? (
                      <iframe
                        src={getYouTubeEmbedUrl(tutorialVideo.video_url)}
                        title="How to Review Video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0 object-cover"
                      />
                    ) : (
                      <video
                        src={tutorialVideo.video_url}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
              ) : (
                /* Luxury Visual Walkthrough Mockup (Light Theme) */
                <div className="relative mx-auto w-full max-w-sm rounded-3xl border border-line/80 bg-white p-4 sm:p-5 shadow-sm space-y-3.5">
                  {/* Top Header Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-line text-[10px] text-taupe">
                    <span className="font-mono font-bold text-zari-deep">● STEP-BY-STEP GUIDE</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 font-bold text-[9px]">
                        4 Easy Steps
                      </span>
                    </div>
                  </div>

                  {/* Step 1: Open Order */}
                  <div className="flex items-start gap-3 bg-stone-50/80 hover:bg-stone-100/80 p-3 rounded-2xl border border-line/60 transition-all">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
                      1
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <span>Open Your Platform Order</span>
                      </h4>
                      <p className="text-[11px] text-taupe leading-snug">
                        Go to your delivered orders on <strong className="text-ink font-semibold">Amazon</strong> or <strong className="text-ink font-semibold">Flipkart</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Rate 5 Stars */}
                  <div className="flex items-start gap-3 bg-stone-50/80 hover:bg-stone-100/80 p-3 rounded-2xl border border-line/60 transition-all">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
                      2
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <span>Leave a 5-Star Positive Review</span>
                        <div className="flex text-amber-500 text-[10px]">★★★★★</div>
                      </h4>
                      <p className="text-[11px] text-taupe leading-snug">
                        Write your genuine positive feedback with high rating.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Take 2 Screenshots */}
                  <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 via-amber-100/40 to-orange-50/30 p-3 rounded-2xl border border-zari/40 shadow-xs transition-all">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-zari to-amber-400 text-stone-950 flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                      3
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-zari-deep flex items-center gap-1.5">
                        <span>Take Both 2 Screenshots (Compulsory)</span>
                      </h4>
                      <p className="text-[11px] text-stone-700 leading-snug">
                        📸 <strong>Screenshot 1:</strong> Star rating form.<br />
                        📸 <strong>Screenshot 2:</strong> Submitted review confirmation.
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Enter Order ID & Claim ₹100 */}
                  <div className="flex items-start gap-3 bg-stone-50/80 hover:bg-stone-100/80 p-3 rounded-2xl border border-line/60 transition-all">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                      4
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                        <span>Paste Order ID &amp; Get ₹100 Code</span>
                        <span className="text-emerald-800 text-[10px] font-bold bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">INSTANT</span>
                      </h4>
                      <p className="text-[11px] text-taupe leading-snug">
                        Upload screenshots &amp; Platform Order ID above to get your instant ₹100 Gift Card redeemable to wallet!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Supported Platforms Strip (Light Theme) */}
              <div className="bg-white rounded-2xl p-3 border border-line shadow-xs flex items-center justify-around text-center text-xs">
                <div className="flex items-center gap-1.5 text-ink font-medium">
                  <span className="text-base">📦</span>
                  <span className="font-semibold text-[11px]">Amazon</span>
                </div>
                <span className="text-stone-300">•</span>
                <div className="flex items-center gap-1.5 text-ink font-medium">
                  <span className="text-base">🛍️</span>
                  <span className="font-semibold text-[11px]">Flipkart</span>
                </div>
                <span className="text-stone-300">•</span>
                <div className="flex items-center gap-1.5 text-ink font-medium">
                  <span className="text-base">⭐</span>
                  <span className="font-semibold text-[11px]">Google Reviews</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom CTA */}
            <div className="shrink-0 p-4 bg-white border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-center sm:text-left">
                <span className="text-xs font-bold text-ink block">Ready with your screenshots?</span>
                <span className="text-[11px] text-taupe">Upload below to generate your ₹100 gift code instantly.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-zari-deep via-zari to-zari-deep hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <Sparkles size={14} />
                <span>Got It, Start Claiming &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered 'Customer Support' Modal with Luxury Light UI/UX */}
      {showSupportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl border border-line/80 shadow-2xl overflow-hidden animate-scale-up text-ink max-h-[90vh] sm:max-h-[85vh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Light Theme) */}
            <div className="shrink-0 relative px-5 sm:px-6 py-4 sm:py-5 border-b border-line bg-gradient-to-r from-cream/90 via-ivory to-amber-50/60 text-ink">
              {/* Subtle gold decorative flare */}
              <div className="absolute top-0 right-0 w-40 h-full bg-gradient-to-l from-zari/15 to-transparent pointer-events-none" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 sm:w-11 h-10 sm:h-11 rounded-2xl bg-gradient-to-tr from-zari via-amber-400 to-zari-deep text-ink flex items-center justify-center shadow-md font-bold">
                      <Headphones size={20} className="text-stone-950" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base sm:text-lg text-ink font-bold tracking-tight">
                        Customer Support Desk
                      </h3>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wider">
                        ● Online
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-taupe mt-0.5 font-sans font-medium">
                      Official help desk for review rewards &amp; orders
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="w-8 h-8 rounded-full bg-cream hover:bg-stone-200 border border-line flex items-center justify-center text-taupe hover:text-ink transition-colors cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 bg-stone-50/50">
              {/* CHANNEL 1: Official Support Ticket Desk */}
              <div className="group relative rounded-2xl bg-white border border-line hover:border-zari/60 p-4 sm:p-5 shadow-soft transition-all duration-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <LifeBuoy size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-sm sm:text-base font-bold text-ink">
                          Raise a Support Ticket
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase tracking-wider">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-taupe mt-0.5">
                        Direct priority support logged into your account dashboard
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 my-3 text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Avg response &lt; 2 hrs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Real-time resolution</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Instant admin alert</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Track full chat history</span>
                  </div>
                </div>

                <Link
                  href="/account?tab=support"
                  onClick={() => setShowSupportModal(false)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-ink via-stone-900 to-ink hover:from-zari-deep hover:via-zari hover:to-zari-deep text-ivory font-bold text-xs shadow-sm hover:shadow-md transition-all duration-300 group-hover:scale-[1.01]"
                >
                  <span>Open Support Tickets in My Account</span>
                  <ExternalLink size={13} />
                </Link>
              </div>

              {/* CHANNEL 2: Live 24/7 AI Shopping & Claim Assistant */}
              <div className="group relative rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 border border-amber-200/90 text-ink p-4 sm:p-5 shadow-soft hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-900 border border-amber-300/70 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-sm sm:text-base font-bold text-ink">
                          Instant AI Assistant
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-950 font-extrabold text-[9px] uppercase tracking-wider border border-amber-300/60">
                          24/7 Instant
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Ask about review rules, tracking IDs, wallet cashback, &amp; order queries
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Interactive Prompt Chips */}
                <div className="flex flex-wrap gap-1.5 my-3">
                  {["Gift Card Instructions", "Order ID Format", "Wallet Balance"].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setShowSupportModal(false);
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("open-ai-chat"));
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100/60 text-stone-700 border border-stone-200/80 text-[10px] font-medium transition-colors cursor-pointer shadow-xs active:scale-95"
                    >
                      💬 {chip}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSupportModal(false);
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("open-ai-chat"));
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group-hover:scale-[1.01] active:scale-98"
                >
                  <MessageSquare size={14} className="text-stone-950" />
                  <span>Start Live AI Chat (No Waiting)</span>
                </button>
              </div>

              {/* Interactive Quick FAQ Accordion */}
              <div className="rounded-2xl bg-white border border-line p-4 space-y-2.5 shadow-soft">
                <span className="text-[10px] font-bold text-taupe uppercase tracking-wider block">
                  Frequently Asked Questions:
                </span>

                <div className="space-y-2 text-xs">
                  {[
                    {
                      q: "Where do I find my Amazon or Flipkart Order ID?",
                      a: "Open your Amazon or Flipkart app, go to 'Your Orders', select your Jai Sri Ram Textiles purchase, and copy the Order ID shown at the top of the invoice/details.",
                    },
                    {
                      q: "Why was my review screenshot rejected by AI?",
                      a: "Make sure you upload authentic screenshots showing your 5-star rating, review text, or order confirmation from the actual shopping app. Non-review photos are automatically filtered.",
                    },
                    {
                      q: "When and where is my ₹100 Gift Card received?",
                      a: "Instantly upon verification! A 1-year valid ₹100 gift code is displayed on your screen, sent to your email, and can be redeemed straight into your store wallet as cashback.",
                    },
                  ].map((faq, index) => {
                    const isOpen = openFaq === index;
                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-stone-200/70 overflow-hidden bg-stone-50/40 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : index)}
                          className="w-full p-2.5 flex items-center justify-between text-left font-bold text-[11px] text-ink hover:text-zari-deep transition-colors cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <span className="text-taupe ml-2 text-xs font-mono font-bold shrink-0">
                            {isOpen ? "−" : "+"}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 pt-0 text-[11px] text-stone-600 leading-relaxed border-t border-stone-200/50 bg-white">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Support Info Footer */}
              <div className="pt-2 text-center text-[11px] text-taupe space-y-1 border-t border-line/60">
                <p className="font-medium text-ink/80 flex items-center justify-center gap-1">
                  <span>📍 Kumarapalayam, Namakkal, Tamil Nadu - 638183</span>
                </p>
                <p className="text-[10px] text-taupe/80">
                  Support Desk Operating Hours: Monday – Saturday (9:00 AM – 7:00 PM IST)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Hero Header - Only shown before generating card */}
      {!generatedCard && (
        <section className="bg-gradient-to-b from-cream via-cream/50 to-ivory border-b border-line/60 pt-6 pb-12 sm:pb-16">
          <Container>
            <div className="max-w-3xl mx-auto mb-3 text-left">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} /> Back to Home
              </Link>
            </div>
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

              {/* Action Buttons: 'How to Review' & 'Customer Support' */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {tutorialVideo?.enabled !== false && (
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(true)}
                    className="group relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/95 hover:bg-white text-ink border border-zari/40 hover:border-zari shadow-sm hover:shadow-md transition-all duration-300 font-bold text-xs cursor-pointer hover:scale-105"
                  >
                    <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-zari to-zari-deep text-ivory flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                      <Play size={11} className="fill-ivory ml-0.5" />
                    </span>
                    <span className="tracking-wide">How to Review</span>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-zari/15 text-zari-deep">
                      Watch Video
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="group relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/95 hover:bg-white text-ink border border-emerald-300/80 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all duration-300 font-bold text-xs cursor-pointer hover:scale-105"
                >
                  <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                    <Headphones size={12} className="text-white" />
                  </span>
                  <span className="tracking-wide">Customer Support</span>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    Help &amp; Queries
                  </span>
                </button>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Main Container */}
      <Container className={generatedCard ? "pt-10 sm:pt-14 pb-16" : "mt-8 sm:mt-10"}>
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



                {/* 2. File Upload / Actions Section */}
                {isGoogle ? (
                  /* GOOGLE REVIEWS: STEP 2 DIRECT LINK & STEP 3 SCREENSHOT UPLOAD */
                  <div className="space-y-6">
                    {/* STEP 2: Google Map Direct Review Link */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                        <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                          2. Post Your Review on Google Maps *
                        </label>
                        <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 uppercase tracking-wide shadow-xs">
                          Step 2: Direct Link
                        </span>
                      </div>

                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-white to-amber-50/60 border border-amber-300/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-xs text-base font-bold">
                            ⭐
                          </span>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-ink">Haven&apos;t posted your Google Review yet?</p>
                            <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5">Click below to open our Google Maps review page and leave your 5-star review</p>
                          </div>
                        </div>
                        <a
                          href="https://g.page/r/CQDt5_ECdeuOEBI/review"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-stone-950 font-bold text-xs shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                        >
                          <span>Review Here</span>
                          <ExternalLink size={13} className="text-stone-950" />
                        </a>
                      </div>
                    </div>

                    {/* STEP 3: Upload Google Review Screenshot */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                        <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                          3. Upload Google Review Screenshot *
                        </label>
                        <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 uppercase tracking-wide shadow-xs">
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
                  </div>
                ) : (
                  /* AMAZON / FLIPKART: 2 COMPULSORY SCREENSHOTS */
                  <div className="space-y-3">
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                        2. Upload 2 Required Screenshots (Compulsory) *
                      </label>
                      <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 uppercase tracking-wide shadow-xs">
                        2 Screenshots Required
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
                        Generate ₹100 Card
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ================= STEP 2: REAL PHYSICAL LUXURY GIFT CARD ================= */
            <div className="max-w-lg mx-auto space-y-5 animate-scale-up">
              {/* Top Success Pill */}
              <div className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold w-fit mx-auto shadow-xs">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>{isGoogle ? "Google Review Verified" : "Review Verified"} &bull; ₹100 Gift Card Ready</span>
              </div>

              {/* Real Luxury Retail E-Gift Card */}
              <div
                onClick={handleManualCopy}
                title="Click to copy voucher code"
                className="group relative w-full aspect-[1.65/1] rounded-3xl p-5 sm:p-7 text-stone-900 overflow-hidden cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] shadow-[0_22px_45px_-10px_rgba(180,130,40,0.4),0_12px_24px_-6px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.15)] border-2 border-[#e6cb87] ring-1 ring-amber-500/30 bg-gradient-to-br from-[#fff9ea] via-[#f7e2ab] via-45% to-[#cfa344]"
              >
                {/* Traditional Zari Brocade & Silk Pattern Overlay */}
                <div 
                  className="absolute inset-0 opacity-[0.08] pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(#4d3408 1.5px, transparent 1.5px), radial-gradient(#4d3408 1.5px, #f7e2ab 1.5px)`,
                    backgroundSize: "18px 18px",
                    backgroundPosition: "0 0, 9px 9px",
                  }}
                />

                {/* Subtle Decorative Golden Corner Borders */}
                <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-amber-700/30 rounded-tl-lg pointer-events-none" />
                <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-amber-700/30 rounded-tr-lg pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-amber-700/30 rounded-bl-lg pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-amber-700/30 rounded-br-lg pointer-events-none" />

                {/* Diagonal Holographic Light Reflection Beam */}
                <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/35 to-transparent rotate-25 pointer-events-none group-hover:translate-x-12 transition-transform duration-1000 ease-out" />
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-white/40 via-amber-200/20 to-transparent rounded-full blur-xl pointer-events-none" />

                {/* GIFT CARD INNER CONTENT */}
                <div className="relative z-10 h-full flex flex-col justify-between">
                  {/* Top Header: Brand & Big Value */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#ffe79a] via-[#dfb76c] to-[#9b6f1e] p-0.5 shadow-md flex items-center justify-center border border-amber-200 shrink-0">
                        <div className="w-full h-full rounded-[14px] bg-gradient-to-tr from-[#5a3a0a] to-[#2c1d07] flex items-center justify-center text-amber-300">
                          <Gift size={18} className="text-amber-300 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif text-xs sm:text-sm md:text-base font-black tracking-wider text-[#2c1d07] uppercase [text-shadow:_0_1px_0_rgba(255,255,255,0.7)] leading-tight">
                          JAI SRI RAM TEXTILES
                        </h3>
                        <p className="text-[8px] sm:text-[9.5px] tracking-[0.22em] font-extrabold text-[#6d4e1d] uppercase leading-tight">
                          Heritage Handloom Gift Card
                        </p>
                      </div>
                    </div>

                    {/* Value Badge */}
                    <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-gradient-to-b from-[#fff8e7] via-[#f9e7b8] to-[#dfb76c] border border-amber-400/80 shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] text-right shrink-0">
                      <span className="block text-lg sm:text-2xl font-serif font-black text-[#2c1d07] leading-none [text-shadow:_0_1px_0_rgba(255,255,255,0.8)]">
                        ₹100
                      </span>
                      <span className="text-[7.5px] sm:text-[8.5px] uppercase tracking-widest font-black text-[#6d4e1d] block mt-0.5">
                        GIFT VOUCHER
                      </span>
                    </div>
                  </div>

                  {/* Middle Center: Gift Card Voucher Code Box */}
                  <div className="my-auto py-2 sm:py-2.5 px-3 sm:px-4 rounded-2xl bg-white/70 backdrop-blur-xs border border-amber-400/50 shadow-inner text-center space-y-0.5">
                    <p className="text-[7.5px] sm:text-[8.5px] uppercase tracking-[0.25em] font-black text-[#6d4e1d]">
                      GIFT CARD CODE (TAP TO COPY)
                    </p>
                    <p className="font-mono text-base sm:text-xl md:text-2xl font-black tracking-[0.12em] sm:tracking-[0.18em] text-[#1e1405] truncate select-all">
                      {generatedCard.code || "JSRT-100-XXXX-XXXX"}
                    </p>
                  </div>

                  {/* Bottom Footer: Gift Card Details */}
                  <div className="flex items-center justify-between text-[8px] sm:text-[10px] text-[#5c4018] pt-1.5 border-t border-amber-900/15 font-medium">
                    <span className="inline-flex items-center gap-1 font-bold text-[#2c1d07]">
                      <span>🎁</span>
                      <span>{isGoogle ? "Google Review Reward" : "Platform Review Reward"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Valid for 365 Days
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <Link
                  href={`/account?tab=wallet&redeem=${encodeURIComponent(generatedCard.code)}`}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-zari-deep via-zari to-zari-deep hover:brightness-110 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Wallet size={16} />
                  <span>Redeem ₹100 as Cashback to Wallet &rarr;</span>
                </Link>

                <div className="flex items-center justify-center gap-3 text-xs font-medium text-taupe pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedCard(null);
                      handleRemoveFile1();
                      handleRemoveFile2();
                      setOrderReference("");
                      setOrderVerificationResult(null);
                      if (typeof window !== "undefined") {
                        window.scrollToTop ? window.scrollToTop("instant") : window.scrollTo(0, 0);
                      }
                    }}
                    className="hover:text-ink underline cursor-pointer"
                  >
                    Claim another card
                  </button>
                  <span>&bull;</span>
                  <Link href="/shop" className="hover:text-ink underline">
                    Browse Textile Shop
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ================= GIFT CARD HISTORY (Collapsible Accordion — Hidden by default) ================= */}
          {!generatedCard && (
            <div className="mt-10 bg-white border border-line rounded-3xl overflow-hidden shadow-soft transition-all duration-300">
              {/* Clickable Header Banner */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !showHistory;
                  setShowHistory(nextState);
                  if (nextState && user && historyCards.length === 0 && !loadingHistory) {
                    fetchGiftCardHistory();
                  }
                }}
                className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-cream/25 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-cream flex items-center justify-center text-zari-deep border border-zari/20 shadow-xs shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-base sm:text-lg text-ink font-bold">My Gift Cards History</h3>
                      {user && historyCards.length > 0 && (
                        <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cream text-zari-deep border border-zari/30">
                          {historyCards.length} {historyCards.length === 1 ? "Card" : "Cards"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-taupe truncate mt-0.5">
                      {showHistory
                        ? "Click to collapse history"
                        : "Click to view your claimed ₹100 gift cards & vouchers"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold text-zari-deep hidden sm:inline">
                    {showHistory ? "Hide History" : "View History"}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl bg-cream/80 border border-line flex items-center justify-center text-taupe transition-transform duration-300 ${
                      showHistory ? "rotate-180 text-ink bg-amber-100/60 border-amber-300" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {/* Expandable History Content */}
              {showHistory && (
                <div className="p-5 sm:p-7 pt-4 border-t border-line/60 space-y-6 animate-fade-in">
                  {/* Subheader with Refresh Button */}
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-line/50">
                    <p className="text-xs text-taupe">
                      All ₹100 gift cards claimed and generated on your account:
                    </p>

                    {user && (
                      <button
                        onClick={fetchGiftCardHistory}
                        disabled={loadingHistory}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink px-3 py-1.5 rounded-xl border border-line hover:border-zari/50 hover:bg-cream/40 transition-all duration-200 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin text-zari" : ""}`} />
                        <span>{loadingHistory ? "Refreshing..." : "Refresh"}</span>
                      </button>
                    )}
                  </div>

                  {/* Body Content */}
                  {!user ? (
                    <div className="py-8 px-4 text-center rounded-2xl bg-cream/30 border border-dashed border-line space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-cream flex items-center justify-center text-taupe">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-sm mx-auto">
                        <p className="text-sm font-semibold text-ink">Sign in to view your history</p>
                        <p className="text-xs text-taupe">
                          Log in with your phone or email to see all your claimed ₹100 gift cards and active balances.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-cream hover:bg-ink/90 text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-200 cursor-pointer"
                      >
                        Sign In / Register
                      </button>
                    </div>
                  ) : loadingHistory && historyCards.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zari" />
                      <p className="text-xs text-taupe">Loading your gift cards history...</p>
                    </div>
                  ) : historyCards.length === 0 ? (
                    <div className="py-10 px-4 text-center rounded-2xl bg-cream/30 border border-dashed border-line space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-cream flex items-center justify-center text-zari-deep">
                        <Gift className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <p className="text-sm font-semibold text-ink">No gift cards claimed yet</p>
                        <p className="text-xs text-taupe">
                          Submit your positive review for Amazon, Flipkart, or Google Reviews above to generate your first ₹100 gift card!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historyCards.map((card) => {
                        const isRedeemed = card.status === "redeemed" || !!card.redeemed_at;
                        const isExpired = card.status === "expired" || (card.expires_at && new Date(card.expires_at) < new Date());
                        const isActive = !isRedeemed && !isExpired && card.status === "active";

                        const platformBadge = PLATFORMS.find((p) => p.id === card.platform) || {
                          name: card.platform ? card.platform.toUpperCase() : "Review Reward",
                          icon: "🎁",
                        };

                        const createdDateStr = card.created_at
                          ? new Date(card.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—";

                        const expiresDateStr = card.expires_at
                          ? new Date(card.expires_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "1 Year Validity";

                        return (
                          <div
                            key={card.id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                              isActive
                                ? "bg-white hover:bg-cream/10 border-line hover:border-zari/50 shadow-xs"
                                : "bg-cream/20 border-line/70 opacity-90"
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              {/* Left info */}
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cream text-ink border border-line">
                                    <span>{platformBadge.icon}</span> {platformBadge.name}
                                  </span>

                                  {isActive && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      ACTIVE • Available
                                    </span>
                                  )}

                                  {isRedeemed && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                                      <Check className="w-3 h-3 text-neutral-500" />
                                      Redeemed to Wallet
                                    </span>
                                  )}

                                  {isExpired && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                                      <Clock className="w-3 h-3 text-rose-500" />
                                      Expired
                                    </span>
                                  )}

                                  <span className="text-xs font-bold text-zari-deep ml-1">
                                    ₹{((card.amount_paise || 10000) / 100).toFixed(0)} Gift Card
                                  </span>
                                </div>

                                {/* Code container with 1-click copy */}
                                <div className="flex items-center gap-2">
                                  <div className="px-3 py-1.5 rounded-xl bg-cream/70 border border-line font-mono font-black text-sm tracking-wider text-ink selection:bg-zari/20">
                                    {card.code}
                                  </div>
                                  <button
                                    onClick={() => handleCopyHistoryCode(card.code)}
                                    title="Copy Code"
                                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all duration-200 cursor-pointer ${
                                      copiedHistoryCode === card.code
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                        : "bg-white hover:bg-cream/60 text-taupe hover:text-ink border-line"
                                    }`}
                                  >
                                    {copiedHistoryCode === card.code ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Metadata details */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-taupe">
                                  <span>Claimed: <strong className="text-ink font-medium">{createdDateStr}</strong></span>
                                  <span>•</span>
                                  <span>Expires: <strong className="text-ink font-medium">{expiresDateStr}</strong></span>
                                  {card.order_reference && (
                                    <>
                                      <span>•</span>
                                      <span>Order Ref: <strong className="text-ink font-medium font-mono">#{card.order_reference}</strong></span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Right Action */}
                              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                                {isActive ? (
                                  <Link
                                    href={`/account?tab=wallet&redeem=${encodeURIComponent(card.code)}`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-zari-deep to-zari hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                                  >
                                    <Wallet className="w-4 h-4" />
                                    <span>Redeem to Wallet &rarr;</span>
                                  </Link>
                                ) : isRedeemed ? (
                                  <Link
                                    href="/account?tab=wallet"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-cream text-taupe hover:text-ink text-xs font-semibold border border-line transition-all duration-200"
                                  >
                                    <Wallet className="w-3.5 h-3.5 text-taupe" />
                                    <span>View in Wallet</span>
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= TERMS & CONDITIONS (Collapsible Accordion — Hidden by default) ================= */}
          {generatedCard && (
            <div className="mt-8 bg-white border border-line rounded-3xl overflow-hidden shadow-soft transition-all duration-300">
              <button
                type="button"
                onClick={() => setShowTerms(!showTerms)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-cream/20 transition-colors cursor-pointer bg-cream/10"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-5 h-5 text-zari shrink-0" />
                  <h3 className="font-display text-sm sm:text-base text-ink font-bold">
                    Terms & Conditions — ₹100 Gift Card
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-zari-deep hidden sm:inline">
                    {showTerms ? "Hide Terms" : "View Terms"}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg bg-cream/80 border border-line flex items-center justify-center text-taupe transition-transform duration-300 ${
                      showTerms ? "rotate-180 text-ink bg-amber-100/60 border-amber-300" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </button>

              {showTerms && (
                <div className="p-5 sm:p-7 pt-4 border-t border-line/60 animate-fade-in">
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
              )}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
