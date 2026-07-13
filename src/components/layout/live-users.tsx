"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";

export function LiveUsersFloating() {
  const [count, setCount] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function fetchLiveUsers() {
      try {
        const res = await fetch("/api/analytics/live-users");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count);
          setVisible(true);
        }
      } catch (err) {
        console.error("Failed to fetch live active users:", err);
      }
    }

    // Fetch immediately
    fetchLiveUsers();

    // Poll every 15 seconds
    const interval = setInterval(fetchLiveUsers, 15000);

    return () => clearInterval(interval);
  }, []);

  if (!visible || count === null) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed left-6 bottom-6 z-40 hidden md:flex items-center gap-2 bg-cream/90 backdrop-blur-md border border-zari/20 rounded-full px-3.5 py-1.5 shadow-soft hover:shadow-md transition-all select-none group cursor-default"
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        
        {/* Label and Count */}
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink uppercase tracking-wider">
          <Users className="w-3.5 h-3.5 text-zari-deep group-hover:scale-110 transition-transform" />
          <span>{count} Shoppers Online</span>
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
