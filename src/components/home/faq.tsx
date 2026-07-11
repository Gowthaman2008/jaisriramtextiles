"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const [shippingThreshold, setShippingThreshold] = useState(699);
  const [shippingCharge, setShippingCharge] = useState(99);

  useEffect(() => {
    fetch("/api/shipping-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (typeof data.free_shipping_threshold_paise === "number") {
            setShippingThreshold(data.free_shipping_threshold_paise / 100);
          }
          if (typeof data.shipping_charge_paise === "number") {
            setShippingCharge(data.shipping_charge_paise / 100);
          }
        }
      })
      .catch((err) => console.error("Failed to load shipping settings:", err));
  }, []);

  const faqs = [
    { q: "How long does delivery take?", a: "Orders are delivered within 4–7 business days across India. You'll receive a tracking ID as soon as your order ships." },
    { q: "What are the shipping charges?", a: `Shipping is a flat ₹${shippingCharge}. Orders above ₹${shippingThreshold} qualify for free shipping automatically at checkout.` },
    { q: "How does cashback work?", a: "Eligible products earn wallet cashback, credited after your order is delivered. You can redeem up to 20% of a future order's value from your wallet." },
    { q: "When can I use a coupon?", a: "Coupons — including your first-order 10% welcome code — are applied at the order summary step of checkout." },
    { q: "Can I order in bulk or wholesale?", a: "Yes. We supply temples, hotels, retailers and businesses. Visit our Bulk Orders page and send an enquiry with your requirements." },
    { q: "Who can leave a review?", a: "Reviews (including photo reviews) can be submitted by verified purchasers after their order has been delivered." },
  ];

  return (
    <section className="bg-cream py-20 sm:py-24">
      <Container className="max-w-3xl">
        <SectionHeading align="center" eyebrow="Good to know" title="Frequently asked questions" />
        <div className="mt-12 divide-y divide-line rounded-card border border-line bg-ivory">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-lg text-ink">{f.q}</span>
                  <Plus
                    size={20}
                    className={cn(
                      "shrink-0 text-zari transition-transform duration-300",
                      isOpen && "rotate-45"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-taupe">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
