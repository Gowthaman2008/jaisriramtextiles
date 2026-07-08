"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Loader2, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/utils";

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  price_paise: number;
  product_images: { url: string; sort_order: number }[];
  matchedVariant?: string;
};

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus whenever the overlay opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  // Debounced live search as the user types
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const term = `%${query.trim()}%`;

      // Match by product name, and separately by variant size/color (e.g. "orange"
      // or "32x64"), then merge — a plain .or() can't span the two tables cleanly
      // once product_variants needs an inner join to filter on it.
      const [byName, byVariant] = await Promise.all([
        supabase
          .from("products")
          .select("id, slug, name, price_paise, product_images(url, sort_order)")
          .eq("is_active", true)
          .ilike("name", term)
          .limit(8),
        supabase
          .from("products")
          .select("id, slug, name, price_paise, product_images(url, sort_order), product_variants!inner(size, color)")
          .eq("is_active", true)
          .or(`size.ilike.${term},color.ilike.${term}`, { foreignTable: "product_variants" })
          .limit(8),
      ]);

      const merged = new Map<string, SearchResult>();
      (byName.data || []).forEach((p: any) => merged.set(p.id, p));
      (byVariant.data || []).forEach((p: any) => {
        if (merged.has(p.id)) return;
        const v = p.product_variants?.[0];
        const matchedVariant = v ? [v.size, v.color].filter(Boolean).join(" / ") : undefined;
        merged.set(p.id, { ...p, matchedVariant });
      });

      setResults(Array.from(merged.values()).slice(0, 8));
      setLoading(false);
      setSearched(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-ink/50 backdrop-blur-sm flex items-start justify-center p-4 pt-20 sm:pt-28"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl bg-white rounded-card shadow-lift overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-4 border-b border-line">
              <Search className="w-5 h-5 text-taupe shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dhotis, towels, scarfs, jute bags..."
                className="flex-1 min-w-0 text-sm outline-none placeholder-taupe/60 text-ink bg-transparent"
              />
              {loading && <Loader2 className="w-4 h-4 text-taupe animate-spin shrink-0" />}
              <button
                onClick={onClose}
                aria-label="Close search"
                className="shrink-0 p-1.5 rounded-full text-taupe hover:text-ink hover:bg-cream transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto" data-lenis-prevent>
              {!query.trim() ? (
                <div className="p-10 text-center text-sm text-taupe">
                  Start typing to search our catalog&hellip;
                </div>
              ) : results.length === 0 && searched && !loading ? (
                <div className="p-10 text-center text-sm text-taupe">
                  No products found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="divide-y divide-line/50">
                  {results.map((p) => {
                    const image = [...(p.product_images || [])].sort(
                      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                    )[0]?.url;
                    return (
                      <Link
                        key={p.id}
                        href={`/product/${p.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 p-3.5 hover:bg-cream/50 transition-colors"
                      >
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-cream border border-line shrink-0">
                          {image ? (
                            <Image src={image} alt={p.name} fill sizes="56px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-taupe">
                              <ShoppingBag size={18} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-zari-deep font-semibold">
                              {formatINR(p.price_paise, true)}
                            </p>
                            {p.matchedVariant && (
                              <span className="text-[10px] font-bold text-taupe bg-cream px-1.5 py-0.5 rounded">
                                {p.matchedVariant}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
