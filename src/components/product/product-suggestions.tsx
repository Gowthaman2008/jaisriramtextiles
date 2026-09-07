"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ShoppingBag, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/utils";
import type { Product } from "@/lib/types";

type ProductSuggestionsProps = {
  currentProductId?: string;
  title?: string;
};

export function ProductSuggestions({
  currentProductId,
  title = "You May Also Like",
}: ProductSuggestionsProps) {
  const [productsPool, setProductsPool] = useState<Product[]>([]);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  function shuffleAndPick(pool: Product[]): Product[] {
    if (!pool || pool.length === 0) return [];
    const filtered = currentProductId ? pool.filter((p) => p.id !== currentProductId) : pool;
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 12);
  }

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  const handleReshuffle = () => {
    if (productsPool.length > 0) {
      setSuggestedProducts(shuffleAndPick(productsPool));
    }
  };

  useEffect(() => {
    async function loadSuggestions() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id, slug, name, description, price_paise, compare_at_paise, cashback_paise, stock,
            is_on_sale, rating_avg, rating_count, show_size, is_featured, is_bestseller, is_new, is_trending, pieces_per_pack,
            categories(slug, name),
            product_images(url, alt, sort_order),
            product_variants(id, size, color, sku, stock)
          `)
          .eq("is_active", true)
          .limit(50);

        if (data && data.length > 0) {
          const mapped: Product[] = data.map((row: any) => {
            const images = (row.product_images || [])
              .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((img: any) => img.url);

            const variants = (row.product_variants || []).map((v: any) => ({
              id: v.id,
              size: v.size || "",
              color: v.color || "",
              sku: v.sku || "",
              stock: v.stock || 0,
            }));

            const category = (row.categories as any)?.slug || "dhotis";
            const categoryLabel = (row.categories as any)?.name || "Handloom";

            return {
              id: row.id,
              slug: row.slug,
              name: row.name,
              description: row.description || "",
              category,
              categoryLabel,
              pricePaise: row.price_paise,
              compareAtPaise: row.compare_at_paise,
              cashbackPaise: row.cashback_paise || 0,
              rating: row.rating_avg || 4.5,
              reviewCount: row.rating_count || 12,
              image: images[0] || "",
              images,
              inStock: (row.stock ?? 0) > 0,
              stock: row.stock ?? 0,
              variants,
              showSize: row.show_size || false,
              isFeatured: row.is_featured || false,
              isBestseller: row.is_bestseller || false,
              isNewArrival: row.is_new || false,
              isTrending: row.is_trending || false,
              piecesPerPack: row.pieces_per_pack || 1,
            };
          });

          setProductsPool(mapped);
          setSuggestedProducts(shuffleAndPick(mapped));
        }
      } catch (err) {
        console.error("Failed to load suggested products:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSuggestions();
  }, [currentProductId]);

  return (
    <section className="bg-white border border-line rounded-card p-4 sm:p-5 shadow-soft space-y-3">
      {/* Header with Title and Scroll / Reshuffle Controls */}
      <div className="flex items-center justify-between pb-2.5 border-b border-line/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-zari via-amber-400 to-zari-deep text-stone-950 flex items-center justify-center shadow-xs">
            <Sparkles size={14} className="text-stone-950" />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg text-ink font-bold leading-tight">
              {title}
            </h3>
            <p className="text-[10.5px] text-taupe hidden sm:block">
              Curated mixed styles recommended for your wardrobe
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleReshuffle}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-taupe hover:text-ink px-2 py-1 rounded-lg hover:bg-cream/60 transition-colors cursor-pointer"
            title="Show different recommendations"
          >
            <RefreshCw size={12} className="text-zari" />
            <span className="hidden xs:inline">Shuffle</span>
          </button>
          <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-line/60">
            <button
              type="button"
              onClick={handleScrollLeft}
              className="w-7 h-7 rounded-lg border border-line hover:border-zari/60 bg-cream/30 hover:bg-cream flex items-center justify-center text-taupe hover:text-ink transition-colors cursor-pointer active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              className="w-7 h-7 rounded-lg border border-line hover:border-zari/60 bg-cream/30 hover:bg-cream flex items-center justify-center text-taupe hover:text-ink transition-colors cursor-pointer active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Sidely (Horizontally) Scrollable Row of Mini Product Cards */}
      {loading && suggestedProducts.length === 0 ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-taupe">
          <RefreshCw size={16} className="animate-spin text-zari" />
          <span className="text-[11px]">Loading suggestions...</span>
        </div>
      ) : suggestedProducts.length === 0 ? (
        <div className="py-4 text-center text-xs text-taupe">
          <p>Explore our wide collection of traditional handlooms.</p>
          <Link href="/shop" className="mt-1 inline-block text-xs font-bold text-zari underline">
            Browse Textile Shop &rarr;
          </Link>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none overscroll-x-contain"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {suggestedProducts.map((p) => {
            const discount =
              p.compareAtPaise && p.compareAtPaise > p.pricePaise
                ? Math.round((1 - p.pricePaise / p.compareAtPaise) * 100)
                : 0;

            return (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="group w-[110px] sm:w-[130px] shrink-0 snap-start bg-cream/15 hover:bg-cream/40 border border-line hover:border-zari/70 rounded-xl p-1.5 transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between block"
              >
                {/* Mini Product Thumbnail */}
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-stone-100 border border-line/40">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-cream/40 text-taupe text-[9px]">
                      No image
                    </div>
                  )}

                  {/* Mini Discount Badge */}
                  {discount > 0 && (
                    <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-red-600 text-white text-[8px] font-extrabold tracking-tight shadow-2xs">
                      -{discount}%
                    </span>
                  )}
                </div>

                {/* Mini Details */}
                <div className="pt-1.5 space-y-0.5">
                  <p className="text-[8px] uppercase tracking-wider text-taupe font-bold truncate">
                    {p.categoryLabel || p.category}
                  </p>
                  <h4
                    className="text-[11px] font-bold text-ink leading-tight truncate group-hover:text-zari transition-colors"
                    title={p.name}
                  >
                    {p.name}
                  </h4>

                  {/* Compact Price */}
                  <div className="flex items-baseline gap-1 pt-0.5">
                    <span className="text-[11.5px] font-black text-ink">
                      {formatINR(p.pricePaise, true)}
                    </span>
                    {p.compareAtPaise && p.compareAtPaise > p.pricePaise && (
                      <span className="text-[9px] text-taupe/80 line-through">
                        {formatINR(p.compareAtPaise, true)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
