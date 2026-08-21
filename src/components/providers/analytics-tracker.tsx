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
    
    // Retrieve or generate visitor ID
    let visitorId = localStorage.getItem("visitor_id");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("visitor_id", visitorId);
    }

    const referrer = document.referrer || "";

    // Track initial page view if path changed
    if (prevPathRef.current !== currentFullPath) {
      prevPathRef.current = currentFullPath;
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: currentFullPath,
          referrer: referrer,
          visitorId: visitorId,
        }),
      }).catch((err) => console.error("Error logging visit:", err));
    }

    // Set up heartbeat timer to run every 30 seconds
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;

      const latestPath = window.location.pathname + window.location.search;
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: latestPath,
          visitorId: visitorId,
          heartbeat: true,
        }),
      }).catch((err) => console.error("Error sending heartbeat:", err));
    }, 30000);

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}

