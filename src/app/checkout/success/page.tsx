"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, Truck, Package } from "lucide-react";
import { formatINR } from "@/lib/utils";

/* ---------- GPU-only CSS keyframes injected once ---------- */
const VAN_CSS = `
@keyframes vanDriveIn  { from { transform: translateX(-110vw); } to { transform: translateX(0); } }
@keyframes vanIdle     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
@keyframes vanShake    { 0%,100%{transform:translateX(0) rotate(0deg)} 25%{transform:translateX(-4px) rotate(-1.5deg)} 75%{transform:translateX(4px) rotate(1.5deg)} }
@keyframes vanDriveOut { from { transform: translateX(0); } to { transform: translateX(130vw); } }
@keyframes smokePuff   { 0%{opacity:0;transform:translate(0,0) scale(.4)} 30%{opacity:.4} 100%{opacity:0;transform:translate(var(--sx),var(--sy)) scale(1.6)} }
@keyframes parcelHop   { 0%{opacity:1;transform:translate(var(--px),28px) scale(1) rotate(0deg)} 55%{opacity:1;transform:translate(calc(var(--px)*.5),-28px) scale(1) rotate(var(--pr))} 100%{opacity:0;transform:translate(0,0) scale(0) rotate(0deg)} }
@keyframes tirePuff    { 0%{opacity:.7;transform:translate(0,0) scale(0)} 100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(1)} }
@keyframes speedLine   { 0%{opacity:0;transform:translateX(0) scaleX(0)} 40%{opacity:.55} 100%{opacity:0;transform:translateX(-22vw) scaleX(1)} }
`;
function injectVanCSS() {
  if (typeof document === "undefined" || document.getElementById("van-css")) return;
  const s = document.createElement("style"); s.id = "van-css"; s.textContent = VAN_CSS;
  document.head.appendChild(s);
}

// Stages: 0 drives in, 1 stopped, 2 wheel-spin, 3 speeds off, 4 reveal order details
type Stage = 0 | 1 | 2 | 3 | 4;

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
    injectVanCSS();
    initAudio();
    const unlock = () => initAudio();
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });

    const t1 = setTimeout(() => setStage(1), 2000);
    const t2 = setTimeout(() => { setStage(2); playVanZoomSound(); }, 3300);
    const t3 = setTimeout(() => setStage(3), 4400);
    const t4 = setTimeout(() => { setStage(4); playSuccessChime(); }, 5200);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
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
      {/* ── Pure-CSS van animation – all transforms run on GPU compositor ── */}
      {stage < 4 && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">

          {/* Exhaust smoke – stage 0 */}
          {stage === 0 && [
            { size: 12, delay: "0s",   sx: "-40px", sy: "-20px" },
            { size: 9,  delay: "0.2s", sx: "-55px", sy: "-25px" },
            { size: 7,  delay: "0.4s", sx: "-70px", sy: "-18px" },
          ].map((p, i) => (
            <span key={i} className="absolute rounded-full bg-taupe/25" style={{
              width: p.size, height: p.size,
              left: "calc(50% - 60px)", top: "calc(50% - 10px)",
              "--sx": p.sx, "--sy": p.sy,
              animation: `smokePuff 1.2s ease-out ${p.delay} infinite`,
              willChange: "transform, opacity",
            } as React.CSSProperties} />
          ))}

          {/* Van – animation driven by CSS keyframe per stage */}
          <span className="absolute text-ink" style={{
            left: "50%", top: "calc(50% - 40px)",
            willChange: "transform",
            animation:
              stage === 0 ? "vanDriveIn 2s cubic-bezier(0.22,1,0.36,1) forwards" :
              stage === 1 ? "vanIdle 0.8s ease-in-out infinite" :
              stage === 2 ? "vanShake 0.2s ease-in-out 6" :
              "vanDriveOut 0.75s cubic-bezier(0.55,0,1,0.45) forwards",
          }}>
            <Truck size={80} strokeWidth={1.6} />
          </span>

          {/* Parcels – stage 1 */}
          {stage === 1 && [
            { delay: "0.15s", px: "-70px", pr: "-14deg" },
            { delay: "0.39s", px: "-100px", pr: "14deg" },
            { delay: "0.63s", px: "-130px", pr: "-14deg" },
          ].map((p, i) => (
            <span key={i} className="absolute text-ink" style={{
              left: "50%", top: "50%",
              "--px": p.px, "--pr": p.pr,
              animation: `parcelHop 0.55s ease-in ${p.delay} forwards`,
              willChange: "transform, opacity",
            } as React.CSSProperties}>
              <Package size={22} strokeWidth={2.5} />
            </span>
          ))}

          {/* Tire smoke – stage 2 */}
          {stage === 2 && Array.from({ length: 6 }, (_, i) => ({
            size: 10 + (i % 3) * 3,
            tx: `${(i % 2 === 0 ? -1 : 1) * (16 + (i % 3) * 10)}px`,
            ty: `${10 + (i % 3) * 6}px`,
            delay: `${i * 0.09}s`,
          })).map((s, i) => (
            <span key={i} className="absolute rounded-full bg-taupe/20" style={{
              width: s.size, height: s.size,
              left: "calc(50% + 10px)", top: "calc(50% + 28px)",
              "--tx": s.tx, "--ty": s.ty,
              animation: `tirePuff 0.6s ease-out ${s.delay} forwards`,
              willChange: "transform, opacity",
            } as React.CSSProperties} />
          ))}

          {/* Speed lines – stage 3 */}
          {stage === 3 && [
            { top: "calc(50% - 16px)", delay: "0s"   },
            { top: "calc(50%)",        delay: "0.05s" },
            { top: "calc(50% + 16px)", delay: "0.1s"  },
          ].map((l, i) => (
            <span key={i} className="absolute bg-taupe/35 rounded-full" style={{
              height: 3, width: 80,
              left: "calc(50% - 80px)", top: l.top,
              transformOrigin: "right center",
              animation: `speedLine 0.65s ease-out ${l.delay} forwards`,
              willChange: "transform, opacity",
            }} />
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
