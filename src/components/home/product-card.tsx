"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { formatINR, cn } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { useCart } from "@/components/providers/cart-provider";

const badgeStyles: Record<string, string> = {
  new: "bg-ink text-ivory",
  bestseller: "bg-zari text-ivory",
  trending: "bg-success text-ivory",
  sale: "bg-danger text-ivory",
};

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [loaded, setLoaded] = useState(false);
  const { toggleWishlist, isWished } = useWishlist();
  const { addToCart } = useCart();
  const wished = isWished(product.id);

  const discount =
    product.compareAtPaise && product.compareAtPaise > product.pricePaise
      ? Math.round((1 - product.pricePaise / product.compareAtPaise) * 100)
      : 0;

  const handleQuickAdd = () => {
    const variant = product.variants && product.variants.length > 0
      ? (product.variants.find(v => v.stock > 0) || product.variants[0])
      : null;
    addToCart(product, 1, variant);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: (index % 4) * 0.04 }}
      className="group relative flex flex-col"
    >
      <Link href={`/product/${product.slug}`} className="relative block">
        <div className="zari-frame relative aspect-[4/5] overflow-hidden rounded-card bg-cream">
          {!loaded && <div className="skeleton absolute inset-0 rounded-card" />}
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onLoad={() => setLoaded(true)}
            className={cn(
              "object-cover transition-all duration-700 ease-silk group-hover:scale-[1.05]",
              loaded ? "opacity-100" : "opacity-0"
            )}
          />

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {discount > 0 && (
              <span className="rounded-pill bg-danger px-2.5 py-1 text-[11px] font-bold text-ivory">
                −{discount}%
              </span>
            )}
            {product.badges?.filter((b) => b !== "sale").map((b) => (
              <span
                key={b}
                className={cn(
                  "rounded-pill px-2.5 py-1 text-[11px] font-semibold capitalize",
                  badgeStyles[b]
                )}
              >
                {b}
              </span>
            ))}
          </div>

          {/* Quick add — slides up on hover */}
          <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition-all duration-300 ease-silk group-hover:translate-y-0 group-hover:opacity-100">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuickAdd();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-pill bg-ink/90 py-2.5 text-sm font-semibold text-ivory backdrop-blur transition hover:bg-ink cursor-pointer"
            >
              <ShoppingBag size={15} /> Quick add
            </button>
          </div>
        </div>
      </Link>

      {/* Wishlist */}
      <button
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wished}
        onClick={() => toggleWishlist(product)}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ivory/85 text-ink backdrop-blur transition hover:text-danger"
      >
        <Heart size={16} className={cn(wished && "fill-danger text-danger")} />
      </button>

      {/* Meta */}
      <div className="mt-4 flex flex-col gap-1.5">
        <span className="eyebrow text-[10px]">{product.categoryLabel}</span>
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-1 font-display text-[17px] leading-tight text-ink transition-colors hover:text-zari-deep"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-2">
          <StarRating rating={product.rating} />
          <span className="text-xs text-muted">({product.reviewCount})</span>
        </div>
        {product.showSize && (
          <div className="text-[11px] text-taupe font-semibold tracking-wide mt-0.5">
            Sizes: {Array.from(new Set(product.variants?.map(v => v.size).filter(Boolean) || [])).join(", ") || "Standard"}
          </div>
        )}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold text-ink">{formatINR(product.pricePaise, true)}</span>
          {product.compareAtPaise && (
            <span className="text-sm text-muted line-through">
              {formatINR(product.compareAtPaise, true)}
            </span>
          )}
        </div>
        {product.cashbackPaise > 0 && (
          <span className="mt-0.5 text-xs font-medium text-zari-deep">
            Earn {formatINR(product.cashbackPaise, true)} cashback
          </span>
        )}
      </div>
    </motion.article>
  );
}
