"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Lenis from "lenis";

// Declare global scrollToTop helper on Window interface
declare global {
  interface Window {
    scrollToTop?: (behavior?: "instant" | "smooth") => void;
    __lenis?: Lenis | null;
  }
}

function UniversalScrollWatcher({ lenisRef }: { lenisRef: React.MutableRefObject<Lenis | null> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams ? searchParams.toString() : "";

  const performScrollTop = (behavior: "instant" | "smooth" = "instant") => {
    if (typeof window === "undefined") return;

    if (lenisRef.current) {
      try {
        lenisRef.current.scrollTo(0, { immediate: behavior === "instant" });
      } catch {
        // ignore
      }
    }

    try {
      window.scrollTo({ top: 0, left: 0, behavior: behavior as any });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    } catch {
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    // Multi-stage scroll reset to combat async hydration & layout shifts
    performScrollTop("instant");

    const t1 = setTimeout(() => performScrollTop("instant"), 30);
    const t2 = setTimeout(() => performScrollTop("instant"), 120);
    const t3 = setTimeout(() => performScrollTop("instant"), 280);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, searchParamsString]);

  return null;
}

/** Silk-smooth inertial scrolling; automatically scrolls to top on route and query changes. */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Prevent browser from restoring old scroll positions on navigation
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const scrollToTopFn = (behavior: "instant" | "smooth" = "instant") => {
      if (typeof window === "undefined") return;
      if (lenisRef.current) {
        try {
          lenisRef.current.scrollTo(0, { immediate: behavior === "instant" });
        } catch {}
      }
      try {
        window.scrollTo({ top: 0, left: 0, behavior: behavior as any });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      } catch {
        window.scrollTo(0, 0);
      }
    };

    window.scrollToTop = scrollToTopFn;

    const handleCustomScrollTop = (e: any) => {
      scrollToTopFn(e.detail?.behavior || "instant");
    };

    window.addEventListener("scroll-to-top", handleCustomScrollTop);

    // Global link click handler: immediately reset scroll when navigating to internal links
    const handleGlobalLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;

      // Only handle internal navigation links, skip hash anchors on the same page
      if (href.startsWith("/") && !href.startsWith("/#") && !target.target && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        scrollToTopFn("instant");
      }
    };

    document.addEventListener("click", handleGlobalLinkClick, { capture: true });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => {
        window.removeEventListener("scroll-to-top", handleCustomScrollTop);
        document.removeEventListener("click", handleGlobalLinkClick, { capture: true });
        delete window.scrollToTop;
      };
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenisRef.current = lenis;
    window.__lenis = lenis;

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
      window.__lenis = null;
      window.removeEventListener("scroll-to-top", handleCustomScrollTop);
      document.removeEventListener("click", handleGlobalLinkClick, { capture: true });
      delete window.scrollToTop;
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <UniversalScrollWatcher lenisRef={lenisRef} />
      </Suspense>
      {children}
    </>
  );
}
