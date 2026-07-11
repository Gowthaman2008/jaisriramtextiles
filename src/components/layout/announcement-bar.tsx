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
        
        // Fetch shipping settings for dynamic banner text
        const shippingRes = await fetch("/api/shipping-settings").then((r) => r.json()).catch(() => null);
        const dynamicThreshold = shippingRes && typeof shippingRes.free_shipping_threshold_paise === "number"
          ? shippingRes.free_shipping_threshold_paise / 100
          : 699;

        const updatedDefaults = [
          `Free shipping on orders above ₹${dynamicThreshold}`,
          "Earn cashback on every order — credited after delivery",
          "Bulk & wholesale enquiries welcome",
        ];

        // Load standard CMS announcements and active free product campaigns in parallel
        const [cmsRes, campaignsRes] = await Promise.all([
          supabase
            .from("banners")
            .select("content")
            .eq("placement", "announcement")
            .eq("is_active", true)
            .maybeSingle(),
          fetch("/api/campaigns").then((r) => r.json()).catch(() => [])
        ]);

        let finalMessages: string[] = [];

        // 1. Add standard CMS messages
        if (cmsRes.data && cmsRes.data.content && Array.isArray((cmsRes.data.content as any).messages)) {
          const list = (cmsRes.data.content as any).messages.filter((msg: any) => typeof msg === "string" && msg.trim() !== "");
          finalMessages = [...list];
        } else {
          finalMessages = [...updatedDefaults];
        }

        // 2. Add auto-generated active campaign messages
        if (Array.isArray(campaignsRes)) {
          campaignsRes.forEach((c: any) => {
            if (c.enable_announcement) {
              if (c.custom_announcement_message && c.custom_announcement_message.trim() !== "") {
                finalMessages.push(c.custom_announcement_message.trim());
              } else {
                const threshold = c.target_amount_paise / 100;
                const details = c.display_name || c.product?.name || "";
                finalMessages.push(`🎁 Get a FREE ${details} on orders above ₹${threshold}! Offer valid this week only.`);
              }
            }
          });
        }

        if (finalMessages.length > 0) {
          setMessages(finalMessages);
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
      <div className="flex min-h-[2.25rem] py-1.5 px-4 items-center justify-center overflow-hidden text-center text-[10.5px] sm:text-xs tracking-wide leading-normal">
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {messages[i]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
