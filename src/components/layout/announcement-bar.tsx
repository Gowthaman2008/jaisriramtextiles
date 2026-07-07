"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const defaultMessages = [
  "Free shipping on orders above ₹699",
  "Earn cashback on every order — credited after delivery",
  "Bulk & wholesale enquiries welcome",
];

export function AnnouncementBar() {
  const [messages, setMessages] = useState<string[]>(defaultMessages);
  const [i, setI] = useState(0);

  useEffect(() => {
    async function loadBanner() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("banners")
          .select("content")
          .eq("placement", "announcement")
          .eq("is_active", true)
          .maybeSingle();

        if (data && data.content && Array.isArray((data.content as any).messages)) {
          const list = (data.content as any).messages.filter((msg: any) => typeof msg === "string" && msg.trim() !== "");
          if (list.length > 0) {
            setMessages(list);
          }
        }
      } catch (err) {
        console.error("Error loading banners", err);
      }
    }
    loadBanner();
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const t = setInterval(() => setI((v) => (v + 1) % messages.length), 4000);
    return () => clearInterval(t);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="bg-ink text-ivory">
      <div className="flex h-9 items-center justify-center overflow-hidden text-center text-xs tracking-wide">
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {messages[i]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
