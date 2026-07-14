"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { ProductCard } from "./product-card";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const tabs = [
  { key: "all", label: "All" },
  { key: "featured", label: "Featured" },
  { key: "bestseller", label: "Best Sellers" },
  { key: "new", label: "New Arrivals" },
  { key: "trending", label: "Trending" },
] as const;

function mixProductsByCategory(items: Product[]): Product[] {
  const groups: Record<string, Product[]> = {};
  items.forEach(p => {
    const cat = p.category || "uncategorized";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });

  const categoriesList = Object.keys(groups).sort();
  const mixed: Product[] = [];
  let index = 0;
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    for (const cat of categoriesList) {
      if (index < groups[cat].length) {
        mixed.push(groups[cat][index]);
        hasMore = true;
      }
    }
    index++;
  }

  return mixed;
}

export function FeaturedProducts({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");

  const list =
    tab === "all"
      ? mixProductsByCategory(products)
      : tab === "featured"
      ? products.filter((p) => p.isFeatured)
      : products.filter((p) => p.badges?.includes(tab as never));

  const displayed = list.slice(0, 12);

  return (
    <section className="bg-cream py-20 sm:py-24">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Handpicked for you"
            title="Our finest, front and centre"
          />
          {products.length > 0 && (
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
          )}
        </div>

        {products.length === 0 ? (
          <div className="mt-12 rounded-card border border-dashed border-line bg-ivory/60 py-20 text-center">
            <p className="font-display text-xl text-ink">Products coming soon</p>
            <p className="mt-2 text-sm text-taupe">
              Our collection is being prepared — check back shortly.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
            >
              {displayed.length === 0 ? (
                <div className="col-span-2 md:col-span-3 lg:col-span-4 rounded-card border border-dashed border-line bg-ivory/60 py-16 text-center w-full">
                  <p className="font-display text-lg text-ink">More products coming soon</p>
                  <p className="mt-1 text-xs text-taupe">
                    We are adding products to this collection — check back shortly.
                  </p>
                </div>
              ) : (
                displayed.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="mt-12 text-center">
          <Button variant="gold" size="lg" href="/shop">
            View all products
          </Button>
        </div>
      </Container>
    </section>
  );
}
