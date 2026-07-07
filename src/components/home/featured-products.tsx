"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { ProductCard } from "./product-card";
import { products } from "@/data/mock";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "featured", label: "Featured" },
  { key: "bestseller", label: "Best Sellers" },
  { key: "new", label: "New Arrivals" },
  { key: "trending", label: "Trending" },
] as const;

export function FeaturedProducts() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("featured");

  const list =
    tab === "featured"
      ? products
      : products.filter((p) => p.badges?.includes(tab as never));

  return (
    <section className="bg-cream py-20 sm:py-24">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Handpicked for you"
            title="Our finest, front and centre"
          />
          <div className="scrollbar-none flex w-full gap-1 overflow-x-auto rounded-pill border border-line bg-ivory p-1 md:w-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors",
                  tab === t.key ? "text-ivory" : "text-taupe hover:text-ink"
                )}
              >
                {tab === t.key && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-pill bg-ink"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
          >
            {(list.length ? list : products).slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 text-center">
          <Button variant="outline" size="lg" href="/shop">
            View all products
          </Button>
        </div>
      </Container>
    </section>
  );
}
