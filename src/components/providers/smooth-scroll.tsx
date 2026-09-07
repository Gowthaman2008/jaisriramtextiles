"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/** Silk-smooth inertial scrolling; automatically scrolls to top on route change. */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Prevent browser from restoring old scroll positions on navigation
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // When route (pathname) changes, ALWAYS scroll immediately to the very top of the page
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reset scroll immediately
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as any });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Secondary micro-task check in case layout shifts or async components render
    const timer = setTimeout(() => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      }
      window.scrollTo(0, 0);
    }, 20);

    return () => clearTimeout(timer);
  }, [pathname]);

  return <>{children}</>;
}

