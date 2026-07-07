"use client";

import { useState } from "react";
import { useCart } from "@/components/providers/cart-provider";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingBag, Check, Heart } from "lucide-react";
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
    addToCart(product, quantity, matchedVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5 mt-4">
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
                onClick={() => {
                  setSelectedColor(color);
                  setQuantity(1);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-200",
                  selectedColor === color
                    ? "border-zari bg-zari-tint text-zari-deep shadow-soft"
                    : "border-line bg-white text-taupe hover:border-zari hover:text-ink"
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
                onClick={() => {
                  setSelectedSize(size);
                  setQuantity(1);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-200",
                  selectedSize === size
                    ? "border-zari bg-zari-tint text-zari-deep shadow-soft"
                    : "border-line bg-white text-taupe hover:border-zari hover:text-ink"
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
              Variant stock level: <strong className="text-ink">{maxStock} left</strong>
            </span>
          ) : (
            <span className="text-danger font-bold">This variant option is out of stock</span>
          )}
        </p>
      )}

      {/* Quantity & Actions Grid */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mt-2">
        {/* Quantity selector counter */}
        {!isOutOfStock && (
          <div className="flex items-center border border-line rounded-full bg-white h-11 px-2">
            <button
              onClick={() => adjustQuantity(-1)}
              disabled={quantity <= 1}
              className="p-2 text-taupe hover:text-ink disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus size={15} />
            </button>
            <span className="w-8 text-center text-sm font-semibold select-none">
              {quantity}
            </span>
            <button
              onClick={() => adjustQuantity(1)}
              disabled={quantity >= maxStock}
              className="p-2 text-taupe hover:text-ink disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <Plus size={15} />
            </button>
          </div>
        )}

        {/* Add to bag button */}
        <Button
          variant={added ? "primary" : "gold"}
          size="lg"
          disabled={isOutOfStock}
          onClick={handleAddToBag}
          className="w-full sm:w-auto min-w-[200px]"
        >
          {isOutOfStock ? (
            "Out of stock"
          ) : added ? (
            <>
              <Check size={18} />
              Added to bag
            </>
          ) : (
            <>
              <ShoppingBag size={18} />
              Add to bag
            </>
          )}
        </Button>

        {/* Wishlist Toggle Button */}
        <button
          onClick={() => toggleWishlist(product as any)}
          className={cn(
            "h-11 w-11 rounded-full border grid place-items-center transition-all duration-200 cursor-pointer shadow-soft shrink-0",
            wished 
              ? "border-danger bg-danger/5 text-danger" 
              : "border-line bg-white text-taupe hover:border-danger hover:text-danger"
          )}
          title={wished ? "Remove from wishlist" : "Add to wishlist"}
          type="button"
        >
          <Heart size={18} className={wished ? "fill-danger" : ""} />
        </button>
      </div>
    </div>
  );
}
