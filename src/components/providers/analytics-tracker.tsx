"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string>("");
  const supabase = createClient();

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

    const sendTrack = async (heartbeat = false) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: heartbeat ? (window.location.pathname + window.location.search) : currentFullPath,
            referrer: referrer,
            visitorId: visitorId,
            userId: userId,
            heartbeat: heartbeat,
          }),
        });
      } catch (err) {
        // Silently catch tracking errors
      }
    };

    // Track initial page view if path changed
    if (prevPathRef.current !== currentFullPath) {
      prevPathRef.current = currentFullPath;
      sendTrack(false);
    }

    // Set up heartbeat timer to run every 30 seconds
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      sendTrack(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}

