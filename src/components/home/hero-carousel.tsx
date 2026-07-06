"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Slide = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: { label: string; href: string };
  image: string;
};

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2000&q=80`;

const slides: Slide[] = [
  {
    eyebrow: "Since a generation of weavers",
    title: "The art of the woven thread",
    subtitle:
      "JAI SRI RAM TEXTILES crafts dhotis, towels, scarfs and jute bags on traditional looms in Komarapalayam, Tamil Nadu.",
    cta: { label: "Our story", href: "/about" },
    image: img("photo-1610030469983-98e550d6193c"),
  },
  {
    eyebrow: "Premium manufacturing",
    title: "Woven with precision, finished by hand",
    subtitle:
      "Combed cotton, true zari borders and rigorous quality checks on every metre we make.",
    cta: { label: "See our craft", href: "/manufacturing" },
    image: img("photo-1594938328870-9623159c8c99"),
  },
  {
    eyebrow: "Limited-time offers",
    title: "Festive savings on our finest",
    subtitle: "Selected dhotis and towels now on sale — while stocks last.",
    cta: { label: "Shop the offers", href: "/shop/sale" },
    image: img("photo-1583391733956-6c78276477e2"),
  },
  {
    eyebrow: "New arrivals",
    title: "Fresh off the loom",
    subtitle: "The latest additions to our collection, ready to ship across India.",
    cta: { label: "Browse new arrivals", href: "/shop?sort=newest" },
    image: img("photo-1601924994987-69e26d50dc26"),
  },
  {
    eyebrow: "Best sellers",
    title: "Loved across Tamil Nadu",
    subtitle: "The pieces our customers return for, again and again.",
    cta: { label: "Shop best sellers", href: "/shop?sort=popularity" },
    image: img("photo-1620916566398-39f1143ab7be"),
  },
  {
    eyebrow: "Festival collections",
    title: "Dressed for every celebration",
    subtitle: "Traditional whites and rich colour dhotis for temple days and festivities.",
    cta: { label: "Explore collections", href: "/shop/colour-dhoti" },
    image: img("photo-1610030469983-98e550d6193c"),
  },
  {
    eyebrow: "Bulk & wholesale",
    title: "Supplying temples, hotels & retailers",
    subtitle: "Custom manufacturing and wholesale pricing for institutions and businesses.",
    cta: { label: "Enquire about bulk orders", href: "/bulk-orders" },
    image: img("photo-1597484662317-9bd7bdda2907"),
  },
  {
    eyebrow: "A gift for you",
    title: "10% off your first order",
    subtitle: "New here? Your welcome discount is waiting at checkout.",
    cta: { label: "Start shopping", href: "/shop" },
    image: img("photo-1594938328870-9623159c8c99"),
  },
];

const AUTO_MS = 6000;

export function HeroCarousel() {
  const reduce = useReducedMotion();
  const [[index, dir], setState] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((next: number, direction: number) => {
    setState([(next + slides.length) % slides.length, direction]);
  }, []);

  useEffect(() => {
    if (paused || reduce) return;
    timer.current = setInterval(() => setState(([i]) => [(i + 1) % slides.length, 1]), AUTO_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, reduce]);

  const slide = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured highlights"
      className="relative overflow-hidden bg-cream"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[86vh] min-h-[560px] max-h-[820px]">
        {/* Background image with slow parallax drift */}
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
            <Image
              src={slide.image}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
            />
            {/* Ivory scrim keeps the light, luxurious feel and text legible */}
            <div className="absolute inset-0 bg-gradient-to-r from-ivory/95 via-ivory/70 to-ivory/20" />
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

        {/* Arrows */}
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10">
          <Container className="pointer-events-auto flex items-center justify-between">
            <div className="flex gap-2">
              <ArrowBtn label="Previous slide" onClick={() => go(index - 1, -1)}>
                <ChevronLeft size={18} />
              </ArrowBtn>
              <ArrowBtn label="Next slide" onClick={() => go(index + 1, 1)}>
                <ChevronRight size={18} />
              </ArrowBtn>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.eyebrow}
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
