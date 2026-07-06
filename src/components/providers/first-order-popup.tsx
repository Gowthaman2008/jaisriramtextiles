"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMMERCE } from "@/lib/constants";

const SEEN_KEY = "jsrt_first_order_popup_seen";
const COUPON = "WELCOME10";

/**
 * Shows once, 15s after landing, ONLY for users who have never ordered.
 *
 * Phase 1 uses a localStorage guard so it never annoys returning visitors.
 * Phase 2: replace `eligible` with a check against the signed-in user's
 * order history (0 completed orders) via Supabase — see README "First-order offer".
 */
export function FirstOrderPopup({ eligible = true }: { eligible?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SEEN_KEY)) return;

    const t = setTimeout(() => setOpen(true), 15_000);
    return () => clearTimeout(t);
  }, [eligible]);

  function dismiss() {
    setOpen(false);
    localStorage.setItem(SEEN_KEY, "1");
  }

  async function copy() {
    await navigator.clipboard.writeText(COUPON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label="Close offer"
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-title"
            className="zari-frame relative w-full max-w-md overflow-hidden rounded-card bg-ivory p-8 text-center shadow-lift"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-taupe transition hover:bg-cream hover:text-ink"
            >
              <X size={18} />
            </button>

            <p className="eyebrow justify-center">A gift for your first order</p>
            <p className="mt-4 font-display text-6xl text-zari-deep">
              {COMMERCE.firstOrderCouponPercent}% OFF
            </p>
            <h3 id="offer-title" className="mt-2 text-xl text-ink">
              Woven just for you
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-taupe">
              Use this code at the order summary step and save on your very first
              purchase from JAI SRI RAM TEXTILES.
            </p>

            <button
              onClick={copy}
              className="mx-auto mt-6 flex items-center gap-3 rounded-pill border border-dashed border-zari bg-zari-tint px-6 py-3 font-mono text-lg font-bold tracking-widest text-zari-deep transition hover:bg-zari/10"
            >
              {COUPON}
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>

            <Button variant="gold" size="md" href="/shop" className="mt-6 w-full">
              Start shopping
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
