"use client";

import { useState } from "react";
import { useCart } from "@/components/providers/cart-provider";
import { useAuth } from "@/components/providers/auth-modal-provider";
import { Plus, Minus, ShoppingBag, Check, Heart, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/components/providers/wishlist-provider";

type ProductActionsProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    pricePaise: number;
    cashbackPaise: number;
    image: string;
    inStock: boolean;
    stock: number;
    variants?: {
      id: string;
      size: string | null;
      color: string | null;
      sku: string | null;
      stock: number;
    }[];
  };
};

export function ProductActions({ product }: ProductActionsProps) {
  const { addToCart } = useCart();
  const { toggleWishlist, isWished } = useWishlist();
  const { user, requireAuth } = useAuth();
  const wished = isWished(product.id);
  const variants = product.variants || [];

  // Extract unique colors and sizes from variants
  const colors = Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[];

  // Selection states
  const [selectedColor, setSelectedColor] = useState<string>(colors[0] || "");
  const [selectedSize, setSelectedSize] = useState<string>(sizes[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Find currently matched variant
  const matchedVariant = variants.find((v) => {
    const colorMatch = !selectedColor || v.color === selectedColor;
    const sizeMatch = !selectedSize || v.size === selectedSize;
    return colorMatch && sizeMatch;
  }) || null;

  // Determine actual stock and stock status
  const maxStock = matchedVariant ? matchedVariant.stock : product.stock;
  const isOutOfStock = product.inStock === false || maxStock <= 0;

  function adjustQuantity(amount: number) {
    setQuantity((prev) => {
      const next = prev + amount;
      if (next < 1) return 1;
      if (next > maxStock) return maxStock;
      return next;
    });
  }

  function handleAddToBag() {
    if (isOutOfStock) return;
    if (!user) {
      requireAuth({
        title: "Sign In to Add to Cart",
        subtitle: `Please sign in or create an account to add ${product.name} to your cart.`,
        nextUrl: `/product/${product.slug}`,
        onSuccess: () => {
          addToCart(product, quantity, matchedVariant);
          setAdded(true);
          setTimeout(() => setAdded(false), 2200);
        },
      });
      return;
    }
    addToCart(product, quantity, matchedVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  function handleWishlistToggle() {
    if (!user) {
      requireAuth({
        title: "Sign In for Wishlist",
        subtitle: `Please sign in to save ${product.name} to your wishlist.`,
        onSuccess: () => {
          toggleWishlist(product as any);
        },
      });
      return;
    }
    toggleWishlist(product as any);
  }

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Colors Selection badges */}
      {colors.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-taupe uppercase tracking-wider">
            Color: <span className="text-ink font-bold">{selectedColor}</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  setSelectedColor(color);
                  setQuantity(1);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-200 cursor-pointer active:scale-95",
                  selectedColor === color
                    ? "border-zari bg-amber-50/90 text-zari-deep font-bold shadow-xs ring-1 ring-zari/50"
                    : "border-line bg-white text-taupe hover:border-zari/70 hover:text-ink hover:bg-cream/40"
                )}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sizes Selection badges */}
      {sizes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-taupe uppercase tracking-wider">
            Size: <span className="text-ink font-bold">{selectedSize}</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSelectedSize(size);
                  setQuantity(1);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-200 cursor-pointer active:scale-95",
                  selectedSize === size
                    ? "border-zari bg-amber-50/90 text-zari-deep font-bold shadow-xs ring-1 ring-zari/50"
                    : "border-line bg-white text-taupe hover:border-zari/70 hover:text-ink hover:bg-cream/40"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock warning */}
      {matchedVariant && (
        <p className="text-xs text-taupe">
          {maxStock > 0 ? (
            <span>
              Variant stock level: <strong className="text-ink font-semibold">{maxStock} left</strong>
            </span>
          ) : (
            <span className="text-danger font-bold">This variant option is out of stock</span>
          )}
        </p>
      )}

      {/* Quantity & Actions Grid */}
      <div className="flex flex-col gap-2.5 mt-1">
        <div className="flex flex-row gap-2.5 sm:gap-3 items-stretch">
          {/* Quantity selector counter */}
          {!isOutOfStock && (
            <div className="flex items-center border border-line/90 rounded-full bg-white h-[52px] px-1.5 shrink-0 shadow-xs hover:border-zari/40 transition-colors">
              <button
                type="button"
                onClick={() => adjustQuantity(-1)}
                disabled={quantity <= 1}
                className="w-9 h-9 rounded-full flex items-center justify-center text-taupe hover:text-ink hover:bg-cream/70 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus size={14} className="stroke-[2.5]" />
              </button>
              <span className="w-7 text-center text-sm font-bold text-ink select-none tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => adjustQuantity(1)}
                disabled={quantity >= maxStock}
                className="w-9 h-9 rounded-full flex items-center justify-center text-taupe hover:text-ink hover:bg-cream/70 active:scale-90 transition-all disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus size={14} className="stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Add to bag button - Luxury High-Impact CTA */}
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToBag}
            className={cn(
              "group relative flex-1 h-[52px] rounded-full px-6 flex items-center justify-center gap-2.5 font-sans font-bold text-xs sm:text-sm tracking-wider uppercase overflow-hidden transition-all duration-300 ease-silk cursor-pointer active:scale-[0.98]",
              isOutOfStock
                ? "bg-cream/80 text-taupe/60 border border-line cursor-not-allowed shadow-none"
                : added
                ? "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-700 text-white shadow-[0_4px_18px_-2px_rgba(16,185,129,0.45)] border border-emerald-400/40"
                : "bg-gradient-to-r from-[#9A7B38] via-[#B89248] to-[#88692E] text-white shadow-[0_4px_18px_-2px_rgba(176,141,76,0.45)] hover:shadow-[0_8px_25px_-2px_rgba(176,141,76,0.6)] hover:brightness-105 border border-amber-300/30"
            )}
          >
            {/* Shimmer Light Reflection on Hover */}
            {!isOutOfStock && !added && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-silk group-hover:translate-x-full"
              />
            )}

            {isOutOfStock ? (
              <span className="relative z-10 text-taupe font-semibold normal-case">Out of stock</span>
            ) : added ? (
              <span className="relative z-10 inline-flex items-center gap-2 animate-fade-in font-bold text-white tracking-wide">
                <Check size={18} className="stroke-[2.5] animate-bounce" />
                Added to Bag!
              </span>
            ) : (
              <span className="relative z-10 inline-flex items-center gap-2.5 font-bold tracking-wider">
                <ShoppingBag size={18} className="stroke-[2.2] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
                Add to Bag
              </span>
            )}
          </button>

          {/* Wishlist Toggle Button */}
          <button
            onClick={handleWishlistToggle}
            className={cn(
              "h-[52px] w-[52px] rounded-full border grid place-items-center transition-all duration-200 cursor-pointer shadow-xs shrink-0 active:scale-95 group",
              wished
                ? "border-danger/60 bg-danger/10 text-danger shadow-soft"
                : "border-line/90 bg-white text-taupe hover:border-danger/60 hover:text-danger hover:bg-danger/5 hover:shadow-soft"
            )}
            title={wished ? "Remove from wishlist" : "Add to wishlist"}
            type="button"
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              size={19}
              className={cn(
                "transition-transform duration-200 group-hover:scale-110",
                wished ? "fill-danger stroke-danger scale-105" : "stroke-[2]"
              )}
            />
          </button>
        </div>

        {/* Value / Trust Micro-Badge Row under the CTA */}
        <div className="flex items-center justify-between px-2 pt-0.5 text-[11px] text-taupe/80 font-medium">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={12} className="text-zari shrink-0" />
            100% Genuine
          </span>
          <span className="text-line">•</span>
          <span className="inline-flex items-center gap-1">
            <Truck size={12} className="text-zari shrink-0" />
            Safe Delivery
          </span>
          <span className="text-line">•</span>
          <span className="inline-flex items-center gap-1">
            <Sparkles size={12} className="text-zari shrink-0" />
            Handloom Quality
          </span>
        </div>
      </div>
    </div>
  );
}
