"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, Truck, Package } from "lucide-react";
import { formatINR } from "@/lib/utils";

// Stages: 0 drives in slowly with exhaust smoke, 1 stopped + parcels hop in through the back door,
// 2 wheel-spin/drift in place with tire smoke, 3 speeds off to the right, 4 reveal order details
type Stage = 0 | 1 | 2 | 3 | 4;

const EXHAUST_PUFFS = [
  { size: 12, lag: 0.15 },
  { size: 9, lag: 0.35 },
  { size: 7, lag: 0.55 },
];

const TIRE_SMOKE = Array.from({ length: 8 }, (_, i) => ({
  dx: (i % 2 === 0 ? -1 : 1) * (20 + (i % 4) * 10),
  dy: 14 + (i % 3) * 6,
  delay: (i % 4) * 0.12,
  size: 10 + (i % 3) * 4,
}));

const SPEED_LINES = [0, 1, 2].map((i) => ({ offsetY: -14 + i * 14, delay: i * 0.05 }));

// Three closed parcels sitting outside the van, each hopping into it one after another
// (further-out parcels start further away so they don't overlap each other on the way in).
const PARCEL_JUMPS = [0, 1, 2].map((i) => ({
  landX: -70 - i * 30,
  rotateDir: i % 2 === 0 ? -14 : 14,
  delay: 0.15 + i * 0.24,
}));

let sharedAudioCtx: any = null;

function getSharedCtx() {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  return sharedAudioCtx;
}

function initAudio() {
  const ctx = getSharedCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch((e: any) => console.error("Error resuming AudioContext:", e));
  }
  // Play a silent oscillator to prime the context immediately
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(0.05);
  } catch (e) {
    // Ignore
  }
}

function playSuccessChime() {
  const ctx = getSharedCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    
    const playNote = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + dur);
    };
    
    const now = ctx.currentTime;
    playNote(523.25, now, 0.35);         // C5
    playNote(659.25, now + 0.1, 0.4);    // E5
    playNote(783.99, now + 0.2, 0.45);   // G5
    playNote(1046.50, now + 0.3, 0.85);  // C6
  } catch (err) {
    console.error("Failed to play success chime sound:", err);
  }
}

function playVanZoomSound() {
  const ctx = getSharedCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    
    const now = ctx.currentTime;
    const duration = 1.6;
    
    const osc = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const mainGain = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + duration);
    
    mod.type = "sawtooth";
    mod.frequency.setValueAtTime(25, now);
    mod.frequency.linearRampToValueAtTime(60, now + duration);
    
    modGain.gain.setValueAtTime(15, now);
    modGain.gain.linearRampToValueAtTime(40, now + duration);
    
    filter.type = "lowpass";
    filter.Q.setValueAtTime(3, now);
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(1000, now + duration);
    
    mainGain.gain.setValueAtTime(0.01, now);
    mainGain.gain.linearRampToValueAtTime(0.18, now + 0.4); 
    mainGain.gain.linearRampToValueAtTime(0.12, now + 0.9); 
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration); 
    
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    
    osc.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(ctx.destination);
    
    osc.start(now);
    mod.start(now);
    osc.stop(now + duration);
    mod.stop(now + duration);
  } catch (err) {
    console.error("Failed to play van zoom sound:", err);
  }
}

function OrderSuccessPageContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_number") || "JSRT-2026-UNKNOWN";
  const cashbackPaise = Number(searchParams.get("cashback") || 0);

  const [stage, setStage] = useState<Stage>(0);

  useEffect(() => {
    if (stage === 2) {
      playVanZoomSound();
    } else if (stage === 4) {
      playSuccessChime();
    }
  }, [stage]);

  useEffect(() => {
    // Prime the audio context immediately on mount using checkout active user gesture token
    initAudio();

    const unlock = () => {
      initAudio();
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });

    const t1 = setTimeout(() => setStage(1), 2000); // finished driving in, stopped at center
    const t2 = setTimeout(() => setStage(2), 3300); // door opened, parcel dropped
    const t3 = setTimeout(() => setStage(3), 4400); // done wheel-spinning
    const t4 = setTimeout(() => setStage(4), 5200); // sped off screen
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Estimated delivery: 4 days from when the order was placed (now)
  const estDeliveryDate = new Date();
  estDeliveryDate.setDate(estDeliveryDate.getDate() + 4);
  const deliveryDateString = estDeliveryDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div 
      onClick={() => {
        if (stage < 4) {
          setStage(4);
        }
      }}
      className={`relative py-16 sm:py-24 bg-ivory min-h-[75vh] flex items-center overflow-hidden ${stage < 4 ? "cursor-pointer select-none" : ""}`}
    >
      {/* Animation overlay: van drives in slowly, stops & unloads a parcel, wheel-spins, then speeds off */}
      {stage < 4 && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          {/* Exhaust smoke trailing behind the van while it drives in */}
          {stage === 0 &&
            EXHAUST_PUFFS.map((p, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-taupe/20"
                style={{ width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2, willChange: "transform" }}
                initial={{ x: "-70vw", y: 6, opacity: 0 }}
                animate={{ x: "0vw", y: -6, opacity: [0, 0.5, 0.5, 0] }}
                transition={{ duration: 2, ease: "easeOut", delay: p.lag }}
              />
            ))}

          {/* The van itself — always facing right (direction of travel) */}
          <motion.div
            initial={{ x: "-70vw", y: 0 }}
            style={{ willChange: "transform" }}
            animate={
              stage === 0
                ? { x: "0vw", y: [0, -6, 0, -6, 0] }
                : stage === 1
                ? { x: "0vw", y: 0 }
                : stage === 2
                ? { x: [0, -3, 3, -3, 3, 0], y: 0, rotate: [0, -1.5, 1.5, -1.5, 1.5, 0] }
                : { x: "70vw", y: [0, -8, 0] } // stage 3: speeds off
            }
            transition={
              stage === 0
                ? { duration: 2, ease: "easeOut" }
                : stage === 1
                ? { duration: 0.3, ease: "easeOut" }
                : stage === 2
                ? { duration: 1.1, ease: "easeInOut", repeat: 1 }
                : { duration: 0.8, ease: "easeIn" }
            }
            className="text-ink -scale-x-100"
          >
            <Truck size={80} strokeWidth={1.6} />
          </motion.div>

          {/* Three closed parcels waiting outside, hopping into the van one by one to be loaded */}
          {stage === 1 &&
            PARCEL_JUMPS.map((p, i) => (
              <motion.div
                key={i}
                className="absolute text-ink"
                style={{ marginTop: 8, willChange: "transform" }}
                initial={{ x: p.landX, y: 32, scale: 1, opacity: 1 }}
                animate={{
                  x: [p.landX, p.landX * 0.55, 0],
                  y: [32, -30, 0],
                  scale: [1, 1, 0],
                  opacity: [1, 1, 0],
                  rotate: [0, p.rotateDir, 0],
                }}
                transition={{ duration: 0.5, delay: p.delay, times: [0, 0.55, 1], ease: "easeIn" }}
              >
                <Package size={22} strokeWidth={2} />
              </motion.div>
            ))}

          {/* Tire smoke burst while the van wheel-spins in place */}
          {stage === 2 &&
            TIRE_SMOKE.map((s, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-taupe/20"
                style={{ width: s.size, height: s.size, marginTop: 40, willChange: "transform" }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 0.7 }}
                animate={{ x: s.dx, y: s.dy, scale: 1, opacity: 0 }}
                transition={{ duration: 0.7, delay: s.delay, ease: "easeOut" }}
              />
            ))}

          {/* Speed lines streaking behind the van as it takes off */}
          {stage === 3 &&
            SPEED_LINES.map((l, i) => (
              <motion.span
                key={i}
                className="absolute h-[3px] rounded-full bg-taupe/40"
                style={{ marginTop: l.offsetY, willChange: "transform" }}
                initial={{ x: "-30vw", width: 0, opacity: 0 }}
                animate={{ x: "-55vw", width: 90, opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.7, ease: "easeOut", delay: l.delay }}
              />
            ))}
        </div>
      )}

      <AnimatePresence>
        {stage === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <Container className="max-w-[580px] text-center">
              {/* Success Icon with Zari theme */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success border-2 border-success/20 mb-8"
              >
                <CheckCircle2 size={42} />
              </motion.div>

              <div className="space-y-4">
                <h1 className="font-display text-3xl sm:text-4xl text-ink">Order Placed Successfully!</h1>
                <p className="text-sm text-taupe max-w-[460px] mx-auto">
                  Your payment was processed successfully. We are now preparing your premium handloom package for dispatch.
                </p>
              </div>

              {/* Order Receipt Details Card */}
              <div className="zari-frame bg-white border border-line p-6 rounded-card my-8 text-left shadow-soft space-y-4">
                <div className="flex justify-between items-center border-b border-line pb-3">
                  <span className="text-xs font-semibold text-taupe uppercase tracking-wider">Order Number</span>
                  <span className="font-mono font-bold text-ink text-sm sm:text-base">{orderNumber}</span>
                </div>
                {cashbackPaise > 0 && (
                  <div className="flex justify-between items-center border-b border-line pb-3">
                    <span className="text-xs font-semibold text-taupe uppercase tracking-wider">Cashback Earned</span>
                    <span className="font-bold text-zari-deep text-sm sm:text-base">
                      +{formatINR(cashbackPaise, true)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-taupe uppercase tracking-wider mt-0.5">Estimated Delivery</span>
                  <div className="text-right">
                    <p className="font-bold text-zari-deep text-sm">{deliveryDateString}</p>
                    <p className="text-[10px] text-muted">Standard Express Surface Shipping (3-5 days)</p>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                <Button href="/account?tab=orders" variant="gold" size="lg" className="w-full sm:w-auto">
                  My Orders
                  <ArrowRight size={18} />
                </Button>
                <Button href="/shop" variant="outline" size="lg" className="w-full sm:w-auto bg-white hover:bg-cream border-line">
                  <ShoppingBag size={18} />
                  Continue Shopping
                </Button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-muted">
                <ShieldCheck size={14} className="text-success" />
                Prepaid transaction completed securely.
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-ivory">
        <div className="animate-spin text-zari w-10 h-10 mb-3" />
        <p className="font-display text-lg text-ink">Loading success page...</p>
      </div>
    }>
      <OrderSuccessPageContent />
    </Suspense>
  );
}
