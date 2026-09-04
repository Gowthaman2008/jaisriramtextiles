"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { placeholderImage } from "@/lib/cloudinary-image";

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
};

const img = (id: string) => placeholderImage(id, 2000);

const defaultSlides: Slide[] = [
  {
    eyebrow: "Since a generation of weavers",
    title: "The art of the woven thread",
    subtitle:
      "JAI SRI RAM TEXTILES crafts dhotis, towels, scarfs and jute bags on traditional looms in Komarapalayam, Tamil Nadu.",
    cta: { label: "Our story", href: "/about" },
    image: img("white-dhoti"),
  },
  {
    eyebrow: "Premium manufacturing",
    title: "Woven with precision, finished by hand",
    subtitle:
      "Combed cotton, true zari borders and rigorous quality checks on every metre we make.",
    cta: { label: "See our craft", href: "/manufacturing" },
    image: img("gold-border-veshti"),
  },
  {
    eyebrow: "Limited-time offers",
    title: "Festive savings on our finest",
    subtitle: "Selected dhotis and towels now on sale — while stocks last.",
    cta: { label: "Shop the offers", href: "/shop/sale" },
    image: img("colour-dhoti"),
  },
  {
    eyebrow: "New arrivals",
    title: "Fresh off the loom",
    subtitle: "The latest additions to our collection, ready to ship across India.",
    cta: { label: "Browse new arrivals", href: "/shop?sort=newest" },
    image: img("scarfs"),
  },
  {
    eyebrow: "Best sellers",
    title: "Loved across Tamil Nadu",
    subtitle: "The pieces our customers return for, again and again.",
    cta: { label: "Shop best sellers", href: "/shop?sort=popularity" },
    image: img("towels"),
  },
  {
    eyebrow: "Festival collections",
    title: "Dressed for every celebration",
    subtitle: "Traditional whites and rich colour dhotis for temple days and festivities.",
    cta: { label: "Explore collections", href: "/shop/colour-dhoti" },
    image: img("white-dhoti"),
  },
  {
    eyebrow: "Bulk & wholesale",
    title: "Supplying temples, hotels & retailers",
    subtitle: "Custom manufacturing and wholesale pricing for institutions and businesses.",
    cta: { label: "Enquire about bulk orders", href: "/bulk-orders" },
    image: img("jute-bags"),
  },
  {
    eyebrow: "A gift for you",
    title: "10% off your first order",
    subtitle: "New here? Your welcome discount is waiting at checkout.",
    cta: { label: "Start shopping", href: "/shop" },
    image: img("gold-border-veshti"),
  },
];

const AUTO_MS = 5000;

export function HeroCarousel({ dbSlides }: { dbSlides?: any[] }) {
  const formatDbSlides = useCallback((raw?: any[]): Slide[] => {
    if (!raw || raw.length === 0) return defaultSlides;
    return raw.map((item: any) => ({
      eyebrow: item.eyebrow || "",
      title: item.title,
      subtitle: item.subtitle || "",
      cta: { label: item.cta_label || "Shop Now", href: item.cta_href || "/shop" },
      image: item.image_url || img("white-dhoti"),
    }));
  }, []);

  const [slides, setSlides] = useState<Slide[]>(() => formatDbSlides(dbSlides));
  const reduce = useReducedMotion();
  const [[index, dir], setState] = useState<[number, number]>([0, 1]);
  const [isMuted, setIsMuted] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (dbSlides) {
      setSlides(formatDbSlides(dbSlides));
    }
  }, [dbSlides, formatDbSlides]);

  const go = useCallback((next: number, direction: number) => {
    setState([(next + slides.length) % slides.length, direction]);
  }, [slides.length]);

  useEffect(() => {
    if (reduce) return;
    timer.current = setInterval(() => setState(([i]) => [(i + 1) % slides.length, 1]), AUTO_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduce, slides.length]);

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

    const minSwipeDistance = 50;

    if (Math.abs(xDistance) > Math.abs(yDistance) && Math.abs(xDistance) > minSwipeDistance) {
      if (xDistance > 0) {
        // Swipe left -> next slide
        go(index + 1, 1);
      } else {
        // Swipe right -> prev slide
        go(index - 1, -1);
      }
    }
  };

  const slide = slides[index];
  const isVideo = isVideoMediaUrl(slide?.image);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured highlights"
      className="relative overflow-hidden bg-cream"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative h-[86vh] min-h-[560px] max-h-[820px]">
        {/* Background image or video with smooth transitions */}
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            className="absolute inset-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.3 : 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {isVideo ? (
              <video
                key={slide.image}
                src={slide.image}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={slide.image}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            )}
            {/* Ivory scrim keeps the light, luxurious feel and text legible */}
            <div className="absolute inset-0 bg-gradient-to-r from-ivory/55 via-ivory/25 to-transparent" />
            <div className="absolute inset-0 bg-weave opacity-40 mix-blend-multiply" />
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <Container className="relative flex h-full items-center">
          <div className="max-w-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="eyebrow flex items-center gap-3">
                  <span className="h-px w-8 bg-zari" aria-hidden />
                  {slide.eyebrow}
                </span>
                <h1 className="mt-5 font-display text-4xl leading-[1.05] text-ink sm:text-5xl md:text-6xl">
                  {slide.title}
                </h1>
                <p className="mt-5 max-w-md text-base leading-relaxed text-taupe sm:text-lg">
                  {slide.subtitle}
                </p>
                <div className="mt-8">
                  <Button variant="gold" size="lg" href={slide.cta.href}>
                    {slide.cta.label}
                    <ArrowRight size={18} />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Container>

        {/* Controls Overlay: Arrows, Sound Toggle, Progress Dots */}
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10">
          <Container className="pointer-events-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex gap-2">
                <ArrowBtn label="Previous slide" onClick={() => go(index - 1, -1)}>
                  <ChevronLeft size={18} />
                </ArrowBtn>
                <ArrowBtn label="Next slide" onClick={() => go(index + 1, 1)}>
                  <ChevronRight size={18} />
                </ArrowBtn>
              </div>

              {isVideo && (
                <button
                  onClick={() => setIsMuted((prev) => !prev)}
                  aria-label={isMuted ? "Unmute video sound" : "Mute video sound"}
                  title={isMuted ? "Unmute sound" : "Mute sound"}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-ink/15 bg-ivory/80 text-ink backdrop-blur text-xs font-semibold hover:border-zari hover:text-zari-deep transition shadow-sm"
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  <span className="hidden md:inline">{isMuted ? "Unmute" : "Mute"}</span>
                </button>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.eyebrow || `Slide ${i + 1}`}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  className={cn(
                    "h-1.5 rounded-full bg-ink/25 transition-all duration-500 ease-silk",
                    i === index ? "w-8 bg-zari" : "w-1.5 hover:bg-ink/40"
                  )}
                />
              ))}
            </div>
          </Container>
        </div>
      </div>
    </section>
  );
}

function ArrowBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-ivory/80 text-ink backdrop-blur transition hover:border-zari hover:text-zari-deep"
    >
      {children}
    </button>
  );
}
