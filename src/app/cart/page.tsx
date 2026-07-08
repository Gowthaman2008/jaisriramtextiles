"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart, type CartItem } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, Truck, ChevronLeft, Heart, Gift, CheckCircle2 } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { computeShipping } from "@/lib/constants";
import type { Product } from "@/lib/types";

function cartItemToProduct(item: CartItem): Product {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: "",
    categoryLabel: "",
    pricePaise: item.pricePaise,
    compareAtPaise: null,
    cashbackPaise: item.cashbackPaise,
    rating: 0,
    reviewCount: 0,
    image: item.image,
    inStock: true,
    stock: item.variant?.stock ?? 99,
    variants: item.variant ? [item.variant] : undefined,
  };
}

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, addFreeGift, cartSubtotalPaise } = useCart();
  const { toggleWishlist, isWished } = useWishlist();
  const [confirmDelete, setConfirmDelete] = useState<CartItem | null>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveCampaigns(data);
        }
      })
      .catch((e) => console.error("Error fetching campaigns:", e));
  }, []);

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center py-20 bg-ivory">
        <Container className="max-w-[560px] text-center">
          {/* Back Button */}
          <div className="mb-8 flex justify-center">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} /> Back to Home
            </Link>
          </div>
          <div className="flex justify-center mb-6">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-cream text-taupe border border-line">
              <ShoppingBag size={28} />
            </span>
          </div>
          <h1 className="font-display text-3xl text-ink">Your cart is empty</h1>
          <p className="mt-3 text-sm text-taupe">
            Browse our catalog and add premium handloom items to your bag.
          </p>
          <div className="mt-8">
            <Button href="/shop" variant="gold" size="lg">
              Browse products
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  const { shippingPaise, qualifiesFree, remainingForFreePaise } = computeShipping(cartSubtotalPaise);
  const grandTotalPaise = cartSubtotalPaise + shippingPaise;

  // Free shipping progress percentage
  const shippingThreshold = 69900; // ₹699
  const progressPercent = Math.min((cartSubtotalPaise / shippingThreshold) * 100, 100);

  return (
    <div className="py-12 sm:py-16 bg-ivory min-h-[75vh]">
      <Container>
        {/* Back Button */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-6 transition-colors inline-flex cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h1 className="font-display text-3xl text-ink mb-8">Shopping Bag</h1>

        <div className="grid gap-10 lg:grid-cols-12 items-start">
          {/* Left: Items list */}
          <div className="lg:col-span-8 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id + (item.variant?.sku || "")}
                className="zari-frame bg-white rounded-card p-4 sm:p-5 flex gap-4 sm:gap-6 shadow-soft items-center border border-line"
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 border border-line rounded-md overflow-hidden bg-cream flex-shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  ) : (
                    <ShoppingBag className="w-8 h-8 m-8 text-muted" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-ink text-sm sm:text-base line-clamp-2 hover:underline">
                        <Link href={`/product/${item.slug}`}>{item.name}</Link>
                      </h2>
                      
                      {/* Selected variant details */}
                      {item.variant && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {item.variant.size && (
                            <span className="text-[10px] font-bold bg-zari-tint text-zari-deep px-1.5 py-0.5 rounded">
                              Size: {item.variant.size}
                            </span>
                          )}
                          {item.variant.color && (
                            <span className="text-[10px] font-bold bg-cream text-taupe px-1.5 py-0.5 rounded">
                              Color: {item.variant.color}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="font-display text-sm sm:text-base text-ink flex-shrink-0 font-bold mt-1 sm:mt-0 whitespace-nowrap">
                      {item.isFreeGift ? (
                        <span className="text-success font-bold font-sans">FREE</span>
                      ) : (
                        formatINR(item.pricePaise * item.quantity, true)
                      )}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    {/* Quantity Selector or Free Gift Badge */}
                    {item.isFreeGift ? (
                      <div className="flex items-center gap-1.5 bg-zari-tint text-zari-deep px-3 py-1.5 rounded-full text-xs font-bold font-sans">
                        <Gift size={14} className="animate-bounce" />
                        <span>Free Gift • Qty: 1</span>
                      </div>
                    ) : (
                      <div className="flex items-center border border-line rounded-full bg-ivory h-9 px-1.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.variant?.sku || null, item.quantity - 1)}
                          className="p-1.5 text-taupe hover:text-ink"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.variant?.sku || null, item.quantity + 1)}
                          className="p-1.5 text-taupe hover:text-ink"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    )}

                    {/* Delete Item */}
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="text-muted hover:text-danger p-1.5 rounded-full hover:bg-danger/5 transition-colors"
                      aria-label="Delete item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Free Gift Target Campaigns */}
            {(() => {
              const campaignsByTarget = activeCampaigns.reduce((acc: any, c: any) => {
                const target = c.target_amount_paise;
                if (!acc[target]) acc[target] = [];
                acc[target].push(c);
                return acc;
              }, {});

              const sortedTargets = Object.keys(campaignsByTarget)
                .map(Number)
                .sort((a, b) => a - b);

              if (sortedTargets.length === 0) return null;

              return (
                <div className="mt-8 space-y-6">
                  <div className="border-t border-line/60 pt-6">
                    <h2 className="font-display text-xl text-ink mb-4 flex items-center gap-2">
                      <Gift size={20} className="text-zari animate-pulse" />
                      Claim Your Free Gift
                    </h2>
                  </div>
                  {sortedTargets.map((targetAmount) => {
                    const campaigns = campaignsByTarget[targetAmount];
                    const isAchieved = cartSubtotalPaise >= targetAmount;
                    const selectedGift = cart.find(
                      (item) => item.isFreeGift && item.targetAmountPaise === targetAmount
                    );

                    const progressPercent = Math.min((cartSubtotalPaise / targetAmount) * 100, 100);
                    const remaining = targetAmount - cartSubtotalPaise;

                    return (
                      <div
                        key={targetAmount}
                        className={`rounded-card border p-5 transition-all duration-300 ${
                          isAchieved
                            ? "bg-zari-tint/10 border-zari/30 shadow-soft"
                            : "bg-white border-line shadow-soft"
                        }`}
                      >
                        {!isAchieved ? (
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-ink">
                                  Unlock a Free Gift at{" "}
                                  <strong className="text-zari-deep">{formatINR(targetAmount, true)}</strong>
                                </p>
                                <p className="text-xs text-taupe">
                                  Add another <strong className="font-bold text-ink">{formatINR(remaining, true)}</strong> of products to choose your gift!
                                </p>
                              </div>
                              <span className="p-2 rounded-full bg-cream text-muted">
                                <Gift size={16} />
                              </span>
                            </div>
                            
                            <div className="w-full bg-cream h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-zari h-full transition-all duration-500 ease-silk"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>

                            <div className="pt-1 flex flex-wrap gap-2 items-center">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-taupe">Available Gifts:</span>
                              {campaigns.map((c: any) => (
                                <span
                                  key={c.id}
                                  className="text-[10px] font-bold bg-cream text-taupe px-2 py-0.5 rounded border border-line"
                                >
                                  {c.product?.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-zari/10 pb-3">
                              <div>
                                <p className="text-sm font-bold text-zari-deep flex items-center gap-1.5">
                                  <CheckCircle2 size={16} className="text-success" />
                                  Gift Unlocked! (Order above {formatINR(targetAmount, true)})
                                </p>
                                <p className="text-xs text-taupe mt-0.5">
                                  {selectedGift 
                                    ? "You have claimed your free gift. You can switch to another one if desired." 
                                    : "Please select one of the free products below to add it to your cart:"}
                                </p>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-success/10 border border-success/20 text-success text-[10px] font-bold uppercase tracking-wider">
                                Qualified
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                              {campaigns.map((c: any) => {
                                const isSelected = selectedGift && selectedGift.campaignId === c.id;
                                const productVal = c.product?.price_paise ? formatINR(c.product.price_paise, true) : "";
                                const img = c.product?.product_images?.[0]?.url || c.product?.image;

                                let details = "";
                                if (c.variant) {
                                  const parts = [c.variant.size, c.variant.color].filter(Boolean);
                                  if (parts.length > 0) details = parts.join(" / ");
                                }

                                return (
                                  <div
                                    key={c.id}
                                    className={`rounded-xl border p-3 flex gap-3 transition-all duration-300 ${
                                      isSelected
                                        ? "bg-white border-zari ring-1 ring-zari shadow-soft"
                                        : "bg-cream/20 border-line hover:border-taupe"
                                    }`}
                                  >
                                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-cream border border-line flex-shrink-0">
                                      {img ? (
                                        <Image src={img} alt={c.product?.name || ""} fill className="object-cover" />
                                      ) : (
                                        <ShoppingBag className="w-6 h-6 m-4 text-muted" />
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                      <div className="space-y-0.5">
                                        <h3 className="text-xs font-bold text-ink truncate">
                                          {c.product?.name}
                                        </h3>
                                        {details && (
                                          <p className="text-[10px] text-taupe font-medium">
                                            Variant: {details}
                                          </p>
                                        )}
                                        {productVal && (
                                          <p className="text-[10px] text-muted line-through">
                                            Worth {productVal}
                                          </p>
                                        )}
                                      </div>

                                      <div className="pt-2 flex justify-start">
                                        <button
                                          type="button"
                                          onClick={() => addFreeGift(c)}
                                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                            isSelected
                                              ? "bg-zari text-ink shadow-xs"
                                              : "border border-line hover:border-zari hover:text-zari-deep text-taupe bg-white"
                                          }`}
                                        >
                                          {isSelected ? "✓ Selected" : "Claim Gift"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Right: Summary panel */}
          <div className="lg:col-span-4 space-y-6">
            {/* Free shipping progress card */}
            <div className="bg-white border border-line rounded-card p-5 shadow-soft space-y-3">
              <div className="flex items-center gap-2.5 text-sm text-ink">
                <Truck className="w-5 h-5 text-zari" />
                {qualifiesFree ? (
                  <span className="font-semibold text-success">You qualify for free shipping!</span>
                ) : (
                  <span>
                    Add <strong className="font-bold">{formatINR(remainingForFreePaise, true)}</strong> more for free shipping
                  </span>
                )}
              </div>
              <div className="w-full bg-cream h-2 rounded-full overflow-hidden">
                <div
                  className="bg-zari h-full transition-all duration-500 ease-silk"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Price breakdown card */}
            <div className="bg-white border border-line rounded-card p-6 shadow-soft space-y-4">
              <h3 className="font-display text-lg border-b border-line pb-2">Order Summary</h3>

              <div className="space-y-2.5 text-sm text-taupe">
                <div className="flex justify-between">
                  <span>Bag Subtotal:</span>
                  <span className="text-ink font-medium">{formatINR(cartSubtotalPaise, true)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard Shipping Charge:</span>
                  <span className="text-ink font-medium">
                    {shippingPaise === 0 ? "FREE" : formatINR(shippingPaise, true)}
                  </span>
                </div>
                
                <div className="border-t border-line pt-3 flex justify-between font-display text-lg text-ink font-bold">
                  <span>Grand Total:</span>
                  <span className="text-zari-deep">{formatINR(grandTotalPaise, true)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2">
                <Button href="/checkout" variant="gold" size="lg" className="w-full justify-center">
                  Proceed to Checkout
                  <ArrowRight size={18} />
                </Button>
              </div>

              <p className="text-[10px] text-center text-muted">
                Applicable taxes, custom coupon codes, and cashback wallet credits will be calculated on the next checkout step.
              </p>
            </div>
          </div>
        </div>
      </Container>

      {/* Remove item confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-card shadow-lift max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-danger/10 text-danger flex-shrink-0">
                <Trash2 size={18} />
              </span>
              <h3 className="font-display text-lg text-ink">Remove item?</h3>
            </div>
            <p className="text-sm text-taupe mb-5">
              Remove <strong className="text-ink">{confirmDelete.name}</strong> from your bag, or move it to your wishlist to save it for later.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const product = cartItemToProduct(confirmDelete);
                  if (!isWished(product.id)) toggleWishlist(product);
                  removeFromCart(confirmDelete.id, confirmDelete.variant?.sku || null);
                  setConfirmDelete(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-pill bg-ink text-ivory py-2.5 text-sm font-semibold hover:bg-zari-deep transition-colors cursor-pointer"
              >
                <Heart size={15} /> Move to Wishlist
              </button>
              <button
                onClick={() => {
                  removeFromCart(confirmDelete.id, confirmDelete.variant?.sku || null);
                  setConfirmDelete(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-pill border border-line text-danger py-2.5 text-sm font-semibold hover:bg-danger/5 transition-colors cursor-pointer"
              >
                <Trash2 size={15} /> Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="w-full text-center text-xs text-taupe hover:text-ink font-semibold py-1.5 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
