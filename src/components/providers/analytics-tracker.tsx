"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string>("");

  useEffect(() => {
    // Exclude admin pages and api requests from tracking
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return;
    }

    const currentFullPath = window.location.pathname + window.location.search;
    if (prevPathRef.current === currentFullPath) return;
    prevPathRef.current = currentFullPath;

    // Retrieve or generate visitor ID
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("visitor_id", visitorId);
    }

    const referrer = document.referrer || "";

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: currentFullPath,
        referrer: referrer,
        visitorId: visitorId,
      }),
    }).catch((err) => console.error("Error logging visit:", err));
  }, [pathname]);

  return null;
}
