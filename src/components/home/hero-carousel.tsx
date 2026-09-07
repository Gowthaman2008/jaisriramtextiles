"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Volume2,
  VolumeX,
  Search,
  Mic,
  ScanLine,
  MapPin,
  Sparkles,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { placeholderImage } from "@/lib/cloudinary-image";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { AddressSelectorModal, Address } from "@/components/home/address-selector-modal";
import { createClient } from "@/lib/supabase/client";

export function isVideoMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  const cleanUrl = url.split("?")[0].toLowerCase();
  return (
    cleanUrl.includes("/video/upload/") ||
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".ogg") ||
    cleanUrl.endsWith(".m4v") ||
    cleanUrl.endsWith(".mkv")
  );
}

type Slide = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  image: string;
  highlightOffer?: string;
};

const img = (id: string) => placeholderImage(id, 2000);

const defaultSlides: Slide[] = [
  {
    eyebrow: "Since a generation of weavers",
    title: "The art of the woven thread",
    subtitle:
      "JAI SRI RAM TEXTILES crafts dhotis, towels, scarfs and jute bags on traditional looms in Komarapalayam.",
    cta: { label: "Shop Collection", href: "/shop" },
    image: img("white-dhoti"),
    highlightOffer: "10% Instant Discount on First Order • Code: WELCOME10",
  },
  {
    eyebrow: "Premium Manufacturing",
    title: "Woven with precision, finished by hand",
    subtitle:
      "Combed cotton, true zari borders and rigorous quality checks on every metre we make.",
    cta: { label: "See Our Craft", href: "/manufacturing" },
    image: img("gold-border-veshti"),
    highlightOffer: "Pure Cotton Guarantee • 100% Quality Inspected",
  },
  {
    eyebrow: "Limited-Time Festive Offers",
    title: "Festive savings on our finest",
    subtitle: "Selected traditional dhotis and towels now on exclusive sale — while stocks last.",
    cta: { label: "Shop The Offers", href: "/shop/sale" },
    image: img("colour-dhoti"),
    highlightOffer: "Special Festive Prices • Free Shipping Available",
  },
  {
    eyebrow: "New Arrivals Off The Loom",
    title: "Fresh off the loom",
    subtitle: "The latest additions to our collection, ready to ship across all India pin codes.",
    cta: { label: "Browse New Arrivals", href: "/shop?sort=newest" },
    image: img("scarfs"),
    highlightOffer: "Express Dispatch within 24 Hours",
  },
  {
    eyebrow: "All-Time Best Sellers",
    title: "Loved across Tamil Nadu",
    subtitle: "The authentic pieces our customers return for, year after year.",
    cta: { label: "Shop Best Sellers", href: "/shop?sort=popularity" },
    image: img("towels"),
    highlightOffer: "Top Rated ⭐ 4.9/5 by 5,000+ Customers",
  },
  {
    eyebrow: "Bulk & Wholesale Orders",
    title: "Supplying temples, hotels & retailers",
    subtitle: "Custom manufacturing and wholesale pricing for institutions and businesses.",
    cta: { label: "Enquire Wholesale", href: "/bulk-orders" },
    image: img("jute-bags"),
    highlightOffer: "Factory Direct Pricing • Custom Zari & Label Weaving",
  },
];

const AUTO_MS = 5000;

// Dedicated Video Player with robust autoplay, looping and resume
function SlideVideo({
  src,
  isActive,
  isMuted,
  className,
}: {
  src: string;
  isActive: boolean;
  isMuted: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.currentTime = 0;
      el.muted = isMuted;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy fallback: ensure muted and retry
          el.muted = true;
          el.play().catch(() => {});
        });
      }
    } else {
      el.pause();
      el.muted = true; // Hard mute when inactive
    }
  }, [isActive, isMuted]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay={isActive}
      muted={isMuted}
      playsInline
      loop
      preload="auto"
      className={className}
    />
  );
}

export function HeroCarousel({ dbSlides }: { dbSlides?: any[] }) {
  const formatDbSlides = useCallback((raw?: any[]): Slide[] => {
    if (!raw || raw.length === 0) return defaultSlides;
    return raw.map((item: any) => ({
      eyebrow: item.eyebrow || "Featured Highlight",
      title: item.title,
      subtitle: item.subtitle || "",
      cta: { label: item.cta_label || "Shop Now", href: item.cta_href || "/shop" },
      image: item.image_url || img("white-dhoti"),
      highlightOffer: item.highlight_offer || "10% Instant Discount on First Order",
    }));
  }, []);

  const [slides, setSlides] = useState<Slide[]>(() => formatDbSlides(dbSlides));
  const reduce = useReducedMotion();
  const [[index, dir], setState] = useState<[number, number]>([0, 1]);
  const [isMuted, setIsMuted] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [userAddress, setUserAddress] = useState<Address | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const isMobileInteracting = useRef(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch logged in user's saved default delivery address
  useEffect(() => {
    async function loadSavedAddress() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsLoggedIn(true);
          const { data: addrs } = await supabase
            .from("addresses")
            .select("*")
            .eq("user_id", user.id)
            .order("is_default", { ascending: false });

          if (addrs && addrs.length > 0) {
            const defaultAddr = addrs.find((a: Address) => a.is_default) || addrs[0];
            setUserAddress(defaultAddr);
          }
        }
      } catch (err) {
        console.error("Failed to load header address:", err);
      }
    }
    loadSavedAddress();
  }, []);

  useEffect(() => {
    if (dbSlides) {
      setSlides(formatDbSlides(dbSlides));
    }
  }, [dbSlides, formatDbSlides]);

  const go = useCallback(
    (next: number, direction: number) => {
      const targetIndex = (next + slides.length) % slides.length;
      setState([targetIndex, direction]);

      // Sync mobile horizontal scroll track
      if (mobileScrollRef.current) {
        const container = mobileScrollRef.current;
        const targetCard = container.children[targetIndex] as HTMLElement;
        if (targetCard) {
          const leftOffset = targetCard.offsetLeft - 16;
          container.scrollTo({
            left: Math.max(0, leftOffset),
            behavior: "smooth",
          });
        }
      }
    },
    [slides.length]
  );

  const slide = slides[index];
  const nextSlide = slides[(index + 1) % slides.length];
  const isVideo = isVideoMediaUrl(slide?.image);

  // Auto-advance timer: active for photo slides
  useEffect(() => {
    if (reduce) return;
    if (isVideo) {
      if (timer.current) clearInterval(timer.current);
      return;
    }

    timer.current = setInterval(() => {
      if (!isMobileInteracting.current) {
        go(index + 1, 1);
      }
    }, AUTO_MS);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduce, slides.length, index, isVideo, go]);

  // Handle Mobile Scroll Event to sync active index indicator
  const handleMobileScroll = () => {
    if (!mobileScrollRef.current) return;
    const container = mobileScrollRef.current;
    const cardWidth = container.firstElementChild?.clientWidth || 280;
    const gap = 12;
    const newIndex = Math.round(container.scrollLeft / (cardWidth + gap));
    if (newIndex >= 0 && newIndex < slides.length && newIndex !== index) {
      setState([newIndex, newIndex > index ? 1 : -1]);
    }
  };

  // Touch handlers for Desktop hero slide swiping
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;
    const xDistance = touchStartX.current - touchEndX.current;
    const yDistance = touchStartY.current - touchEndY.current;

    const minSwipeDistance = 45;

    if (Math.abs(xDistance) > Math.abs(yDistance) && Math.abs(xDistance) > minSwipeDistance) {
      if (xDistance > 0) {
        go(index + 1, 1);
      } else {
        go(index - 1, -1);
      }
    }
  };

  return (
    <>
      <section
        aria-roledescription="carousel"
        aria-label="Featured highlights"
        className="relative bg-gradient-to-b from-cream/40 via-cream/10 to-transparent pt-1 pb-2 sm:pb-4 overflow-hidden"
      >
        <div className="w-full max-w-7xl mx-auto">
          {/* ========================================================================= */}
          {/* AMAZON-STYLE SEARCH BAR + LOCATION HEADER (Matches Screenshot Style) */}
          {/* ========================================================================= */}
          <div className="px-4 sm:px-6 mb-3 space-y-2">
            {/* Search Pill Input Bar */}
            <div
              onClick={() => setSearchOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSearchOpen(true)}
              className="group relative flex items-center justify-between w-full h-11 sm:h-14 px-3.5 sm:px-4 bg-white rounded-2xl sm:rounded-full border border-ink/10 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:border-zari/60 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              {/* Left Search Icon + Placeholder */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-ink/75 shrink-0 group-hover:text-zari-deep transition-colors" />
                <div className="truncate text-xs sm:text-base text-ink/70 font-normal">
                  <span className="hidden sm:inline">Search dhotis, cotton towels, scarfs or ask a question...</span>
                  <span className="sm:hidden">Search or ask a question...</span>
                </div>
              </div>

              {/* Right Action Icons (Voice / Scan) */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-ink/70 pl-2 border-l border-line/40">
                <button
                  type="button"
                  aria-label="Voice Search"
                  title="Voice search"
                  className="p-1 hover:text-zari-deep transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchOpen(true);
                  }}
                >
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Barcode / QR Scan"
                  title="Scan product code"
                  className="p-1 hover:text-zari-deep transition-colors hidden xs:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchOpen(true);
                  }}
                >
                  <ScanLine className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Amazon-style Location / Quick Delivery Strip */}
            <div className="flex items-center justify-between px-1 text-[11px] sm:text-xs text-taupe font-medium">
              <button
                type="button"
                onClick={() => setAddressModalOpen(true)}
                className="flex items-center gap-1.5 truncate text-left hover:text-ink transition group cursor-pointer focus:outline-none max-w-[70%]"
                title="Click to view or edit delivery address"
              >
                <MapPin className="w-3.5 h-3.5 text-zari-deep shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate">
                  {userAddress ? (
                    <>
                      Deliver to <strong className="text-ink font-semibold underline decoration-dotted decoration-zari/60 underline-offset-2">{userAddress.recipient || "You"}</strong>
                      {" "}&bull; {userAddress.city} {userAddress.pincode}
                    </>
                  ) : isLoggedIn ? (
                    <>
                      Deliver to <strong className="text-ink font-semibold underline decoration-dotted decoration-zari/60 underline-offset-2">Select Location</strong> — Add or choose address
                    </>
                  ) : (
                    <>
                      Deliver to <strong className="text-ink font-semibold underline decoration-dotted decoration-zari/60 underline-offset-2">India</strong> — Select to view delivery address
                    </>
                  )}
                </span>
                <ChevronDown className="w-3 h-3 text-taupe shrink-0 group-hover:text-zari-deep transition-colors" />
              </button>
              <div className="flex items-center gap-1 shrink-0 text-[10px] sm:text-[11px] font-bold text-zari-deep uppercase tracking-wider pl-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Authentic</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 1. MOBILE VIEW: EXACT AMAZON PORTRAIT CARD CAROUSEL (72vw width, 410px height) */}
          {/* ========================================================================= */}
          <div className="block md:hidden">
            <div
              ref={mobileScrollRef}
              onScroll={handleMobileScroll}
              onTouchStart={() => {
                isMobileInteracting.current = true;
              }}
              onTouchEnd={() => {
                setTimeout(() => {
                  isMobileInteracting.current = false;
                }, 3000);
              }}
              style={{
                scrollPaddingLeft: "16px",
                scrollPaddingRight: "16px",
              }}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 pt-0.5 px-4 scroll-pl-4 scroll-pr-4 scroll-smooth"
            >
              {slides.map((s, idx) => {
                const sIsVideo = isVideoMediaUrl(s.image);
                const isActive = idx === index;

                return (
                  <Link
                    key={idx}
                    href={s.cta.href}
                    onClick={(e) => {
                      if (!isActive) {
                        e.preventDefault();
                        go(idx, idx > index ? 1 : -1);
                      }
                    }}
                    className={cn(
                      "w-[72vw] max-w-[290px] shrink-0 snap-start h-[410px] sm:h-[440px] rounded-2xl overflow-hidden border border-ink/10 shadow-md relative bg-stone-900 transition-all duration-300 block cursor-pointer select-none",
                      isActive ? "ring-1.5 ring-zari/40 shadow-lg" : "opacity-85"
                    )}
                  >
                    {/* Slide Background Media */}
                    <div className="absolute inset-0">
                      {sIsVideo && isActive && !isDesktop ? (
                        <SlideVideo
                          src={s.image}
                          isActive={isActive}
                          isMuted={isMuted}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={s.image}
                          alt={s.title}
                          fill
                          priority={idx === 0}
                          sizes="75vw"
                          className="object-cover"
                        />
                      )}

                      {/* Gradient Scrim: Clear at the top so image/video shows cleanly, smooth gradient at bottom for text */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 via-55% to-transparent" />
                      <div className="absolute inset-0 bg-weave opacity-15 mix-blend-multiply" />
                    </div>

                    {/* Card Content Overlay: Top Utilities + Bottom Text Content */}
                    <div className="relative z-10 flex flex-col justify-between h-full p-3.5 sm:p-4 text-white">
                      {/* Top Bar: Subtle Eyebrow Pill + Sound Toggle */}
                      <div className="flex items-center justify-between gap-2">
                        {s.eyebrow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 text-zari-soft text-[9px] font-bold tracking-wider uppercase backdrop-blur-md border border-zari/30 shadow-xs">
                            <Sparkles className="w-2.5 h-2.5 text-zari-soft" />
                            {s.eyebrow}
                          </span>
                        ) : <div />}

                        {sIsVideo && isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsMuted((prev) => !prev);
                            }}
                            aria-label={isMuted ? "Unmute video" : "Mute video"}
                            className="p-1.5 rounded-full border border-white/30 bg-black/60 text-white backdrop-blur text-[11px] font-semibold hover:border-zari transition shadow-sm cursor-pointer ml-auto"
                          >
                            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          </button>
                        )}
                      </div>

                      {/* Bottom Section: All Text (Title + Subtitle) perfectly fitted at the bottom */}
                      <div className="space-y-1">
                        {/* Title */}
                        <h2 className="font-display text-base sm:text-lg font-bold text-white leading-tight drop-shadow-md">
                          {s.title}
                        </h2>

                        {/* Subtitle */}
                        <p className="text-[11px] sm:text-xs text-white/85 leading-snug line-clamp-2 font-medium">
                          {s.subtitle}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. LAPTOP/DESKTOP VIEW: POLISHED HERO SLIDE VIEW (PRESERVED) */}
          {/* ========================================================================= */}
          <div className="hidden md:block px-6">
            <div
              className="relative flex items-center justify-center"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Main Rounded Hero Card */}
              <Link
                href={slide.cta.href}
                className="relative block w-full h-[520px] lg:h-[580px] rounded-[32px] overflow-hidden border border-ink/10 shadow-lift bg-cream/30 cursor-pointer group"
              >
                {/* Background Media with AnimatePresence */}
                <AnimatePresence initial={false} custom={dir}>
                  <motion.div
                    key={index}
                    custom={dir}
                    className="absolute inset-0"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0.3 : 0.8, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {isVideo && isDesktop ? (
                      <SlideVideo
                        key={slide.image}
                        src={slide.image}
                        isActive={true}
                        isMuted={isMuted}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={slide.image}
                        alt={slide.title}
                        fill
                        priority={index === 0}
                        sizes="(max-width: 1200px) 90vw, 1200px"
                        className="object-cover group-hover:scale-102 transition-transform duration-700 ease-out"
                      />
                    )}

                    {/* Luxury Scrim Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-ivory/95 via-ivory/70 to-transparent" />
                    <div className="absolute inset-0 bg-weave opacity-25 mix-blend-multiply" />
                  </motion.div>
                </AnimatePresence>

                {/* Card Content Overlay */}
                <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-12">
                  {/* Upper Content: Eyebrow + Title + Subtitle */}
                  <div className="max-w-xl">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {/* Eyebrow Pill */}
                        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zari/20 text-zari-deep text-xs font-bold tracking-wider uppercase backdrop-blur-md border border-zari/30">
                          <Sparkles className="w-3.5 h-3.5" />
                          {slide.eyebrow}
                        </span>

                        {/* Main Title */}
                        <h1 className="mt-4 font-display text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-ink leading-[1.08] drop-shadow-sm">
                          {slide.title}
                        </h1>

                        {/* Subtitle / Description */}
                        <p className="mt-3.5 max-w-md text-base lg:text-lg leading-relaxed text-taupe font-medium">
                          {slide.subtitle}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Video Mute Toggle */}
                  {isVideo && (
                    <div className="flex items-center gap-3 pl-14">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsMuted((prev) => !prev);
                        }}
                        aria-label={isMuted ? "Unmute video" : "Mute video"}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-ink/15 bg-ivory/80 text-ink backdrop-blur text-xs font-semibold hover:border-zari transition shadow-sm cursor-pointer z-20"
                      >
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        <span>{isMuted ? "Unmute" : "Mute"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </Link>

              {/* Desktop Next/Prev Arrow Controls - Positioned in the 2 bottom corners */}
              <div className="flex items-center justify-between absolute inset-x-6 bottom-6 z-20 pointer-events-none">
                <button
                  type="button"
                  aria-label="Previous Slide"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    go(index - 1, -1);
                  }}
                  className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-line/60 bg-white/90 text-ink shadow-md backdrop-blur hover:bg-white hover:border-zari hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Next Slide"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    go(index + 1, 1);
                  }}
                  className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-line/60 bg-white/90 text-ink shadow-md backdrop-blur hover:bg-white hover:border-zari hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Amazon-Style Adjacent Card Peek (Visual accent on larger screens) */}
              <div
                onClick={() => go(index + 1, 1)}
                className="hidden xl:block absolute -right-24 top-1/2 -translate-y-1/2 w-20 h-[500px] rounded-l-3xl overflow-hidden border-l border-y border-ink/10 shadow-lift opacity-40 hover:opacity-75 transition-all duration-300 cursor-pointer"
              >
                <div className="relative w-full h-full">
                  <Image
                    src={nextSlide.image}
                    alt={nextSlide.title}
                    fill
                    sizes="100px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]" />
                </div>
              </div>
            </div>
          </div>

          {/* Amazon Progress Pill Indicator Bar */}
          <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 sm:gap-2" role="tablist" aria-label="Choose slide">
            {slides.map((s, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={s.eyebrow || `Slide ${i + 1}`}
                onClick={() => go(i, i > index ? 1 : -1)}
                className={cn(
                  "h-1.5 sm:h-2 rounded-full transition-all duration-500 ease-silk cursor-pointer",
                  i === index ? "w-6 sm:w-8 bg-zari-deep shadow-sm" : "w-1.5 sm:w-2 bg-ink/20 hover:bg-ink/40"
                )}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Global Interactive Search Overlay */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Interactive Delivery Address Selector & Editor Modal */}
      <AddressSelectorModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onAddressSelect={(addr) => setUserAddress(addr)}
      />
    </>
  );
}
