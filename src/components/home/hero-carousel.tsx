"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Search,
  Camera,
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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (dbSlides) {
      setSlides(formatDbSlides(dbSlides));
    }
  }, [dbSlides, formatDbSlides]);

  const go = useCallback(
    (next: number, direction: number) => {
      setState([(next + slides.length) % slides.length, direction]);
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
      setState(([i]) => [(i + 1) % slides.length, 1]);
    }, AUTO_MS);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduce, slides.length, index, isVideo]);

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
        className="relative bg-gradient-to-b from-cream/40 via-cream/10 to-transparent pt-2 pb-6 sm:py-4 overflow-hidden"
      >
        <Container className="px-3 sm:px-6 max-w-7xl">
          {/* ========================================================================= */}
          {/* AMAZON-STYLE SEARCH BAR + LOCATION HEADER (Matches Screenshot Style) */}
          {/* ========================================================================= */}
          <div className="mb-3.5 space-y-2">
            {/* Search Pill Input Bar */}
            <div
              onClick={() => setSearchOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSearchOpen(true)}
              className="group relative flex items-center justify-between w-full h-12 sm:h-14 px-4 bg-white rounded-2xl sm:rounded-full border border-ink/10 shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:border-zari/60 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              {/* Left Search Icon + Placeholder */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Search className="w-5 h-5 text-ink/75 shrink-0 group-hover:text-zari-deep transition-colors" />
                <div className="truncate text-sm sm:text-base text-ink/70 font-normal">
                  <span className="hidden sm:inline">Search dhotis, cotton towels, scarfs or ask a question...</span>
                  <span className="sm:hidden">Search or ask a question...</span>
                </div>
              </div>

              {/* Right Action Icons (Amazon Style: Camera/AI Lens, Mic, Scan) */}
              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 text-ink/70 pl-2 border-l border-line/40">
                <button
                  type="button"
                  aria-label="Visual AI Search"
                  title="Search with image or camera"
                  className="p-1 hover:text-zari-deep transition-colors relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchOpen(true);
                  }}
                >
                  <div className="relative">
                    <Camera className="w-5 h-5" />
                    <Sparkles className="w-2.5 h-2.5 text-zari absolute -top-1 -right-1" />
                  </div>
                </button>
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
                  <Mic className="w-5 h-5" />
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
                  <ScanLine className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Amazon-style Location / Quick Delivery Strip */}
            <div className="flex items-center justify-between px-2 text-xs text-taupe font-medium">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-zari-deep shrink-0" />
                <span className="truncate">
                  Deliver to <strong className="text-ink font-semibold">India</strong> — All Pincodes Supported
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-[11px] font-bold text-zari-deep uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Authentic</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* AMAZON-STYLE HERO SLIDE CARD CAROUSEL (Rounded Card Shape with Peek) */}
          {/* ========================================================================= */}
          <div
            className="relative flex items-center justify-center"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Main Rounded Hero Card */}
            <div className="relative w-full h-[520px] sm:h-[560px] md:h-[600px] rounded-3xl sm:rounded-[32px] overflow-hidden border border-ink/10 shadow-lift bg-cream/30">
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
                  {isVideo ? (
                    <video
                      key={slide.image}
                      src={slide.image}
                      autoPlay
                      muted={isMuted}
                      playsInline
                      preload="auto"
                      onEnded={() => go(index + 1, 1)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                      className="object-cover"
                    />
                  )}

                  {/* Luxury Scrim Gradient: Keeps card bright, readable, and premium */}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent sm:bg-gradient-to-r sm:from-ivory/95 sm:via-ivory/70 sm:to-transparent" />
                  <div className="absolute inset-0 bg-weave opacity-25 mix-blend-multiply" />
                </motion.div>
              </AnimatePresence>

              {/* Card Content Overlay */}
              <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-10 md:p-12">
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
                      <h1 className="mt-4 font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white sm:text-ink leading-[1.08] drop-shadow-sm">
                        {slide.title}
                      </h1>

                      {/* Subtitle / Description */}
                      <p className="mt-3.5 max-w-md text-sm sm:text-base md:text-lg leading-relaxed text-white/90 sm:text-taupe font-medium">
                        {slide.subtitle}
                      </p>

                      {/* CTA Button */}
                      <div className="mt-6 flex items-center gap-3">
                        <Button
                          variant="gold"
                          size="lg"
                          href={slide.cta.href}
                          className="rounded-full shadow-md hover:shadow-lg transition-transform active:scale-95"
                        >
                          {slide.cta.label}
                          <ArrowRight size={18} />
                        </Button>

                        {isVideo && (
                          <button
                            onClick={() => setIsMuted((prev) => !prev)}
                            aria-label={isMuted ? "Unmute video" : "Mute video"}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-white/30 sm:border-ink/15 bg-black/40 sm:bg-ivory/80 text-white sm:text-ink backdrop-blur text-xs font-semibold hover:border-zari transition shadow-sm"
                          >
                            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Bottom Amazon-style Offer Strip on the Card */}
                <div className="pt-4">
                  <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 sm:bg-white text-ink text-xs sm:text-sm font-semibold shadow-md border border-line/60 backdrop-blur max-w-full truncate">
                    <div className="grid place-items-center w-6 h-6 rounded-full bg-zari/15 text-zari-deep shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">
                      {slide.highlightOffer || "10% Instant Discount on First Order • Code: WELCOME10"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Next/Prev Arrow Controls */}
              <div className="hidden sm:flex items-center justify-between absolute inset-x-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <button
                  aria-label="Previous Slide"
                  onClick={() => go(index - 1, -1)}
                  className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-line/50 bg-white/90 text-ink shadow-md backdrop-blur hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  aria-label="Next Slide"
                  onClick={() => go(index + 1, 1)}
                  className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-line/50 bg-white/90 text-ink shadow-md backdrop-blur hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Amazon-Style Adjacent Card Peek (Visual accent on larger screens) */}
            <div
              onClick={() => go(index + 1, 1)}
              className="hidden xl:block absolute -right-24 top-1/2 -translate-y-1/2 w-20 h-[520px] rounded-l-3xl overflow-hidden border-l border-y border-ink/10 shadow-lift opacity-40 hover:opacity-75 transition-all duration-300 cursor-pointer"
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

          {/* Amazon Progress Pill Indicator Bar */}
          <div className="mt-4 flex items-center justify-center gap-2" role="tablist" aria-label="Choose slide">
            {slides.map((s, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={s.eyebrow || `Slide ${i + 1}`}
                onClick={() => go(i, i > index ? 1 : -1)}
                className={cn(
                  "h-2 rounded-full transition-all duration-500 ease-silk cursor-pointer",
                  i === index ? "w-8 bg-zari-deep shadow-sm" : "w-2 bg-ink/20 hover:bg-ink/40"
                )}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* Global Interactive Search Overlay */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
