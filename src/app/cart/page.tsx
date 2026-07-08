"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart, type CartItem } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, Truck, ChevronLeft, Heart, Gift, CheckCircle2, Sparkles } from "lucide-react";
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
                  {/* Luxury Gift Animations & Styles */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes float-gift {
                      0%, 100% { transform: translateY(0) rotate(0deg); }
                      50% { transform: translateY(-6px) rotate(2deg); }
                    }
                    @keyframes pulse-ring {
                      0% { transform: scale(0.92); opacity: 0.9; }
                      50% { transform: scale(1.06); opacity: 0.4; }
                      100% { transform: scale(1.2); opacity: 0; }
                    }
                    @keyframes shimmer-gold-bar {
                      0% { background-position: -200% 0; }
                      100% { background-position: 200% 0; }
                    }
                    .animate-float-gift {
                      animation: float-gift 4s ease-in-out infinite;
                    }
                    .animate-pulse-ring {
                      animation: pulse-ring 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    }
                    .animate-shimmer-gold-bar {
                      background: linear-gradient(90deg, #B08D4C 25%, #F4E9CD 50%, #B08D4C 75%);
                      background-size: 200% 100%;
                      animation: shimmer-gold-bar 2.5s infinite linear;
                    }
                    .gold-shine-soft {
                      box-shadow: 0 4px 20px rgba(176, 141, 76, 0.08);
                    }
                    .gold-shine-luxury {
                      box-shadow: 0 10px 30px rgba(176, 141, 76, 0.18);
                    }
                  `}} />

                  <div className="border-t border-line/60 pt-6">
                    <h2 className="font-display text-xl text-ink mb-4 flex items-center gap-2">
                      <Gift size={20} className="text-[#B08D4C] animate-bounce" />
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
                        className={`rounded-card border p-4 transition-all duration-500 relative overflow-hidden ${
                          isAchieved
                            ? "bg-gradient-to-br from-[#FCF9F2] via-white to-[#F6EDE0] border-[#B08D4C] gold-shine-luxury"
                            : "bg-gradient-to-br from-white via-white to-cream/25 border-line gold-shine-soft"
                        }`}
                      >
                        {!isAchieved ? (
                          /* Locked State (Compact) */
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-1">
                                <span className="inline-block bg-[#FAF6EC] border border-[#E9DBB7] text-[#8C6D2D] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                  Goal Target: {formatINR(targetAmount, true)}
                                </span>
                                <p className="text-sm font-bold text-ink">
                                  Unlock a Free Gift!
                                </p>
                                <p className="text-[11px] text-taupe leading-normal mt-0.5">
                                  Add another <strong className="font-bold text-[#8C6D2D]">{formatINR(remaining, true)}</strong> of products to choose your gift!
                                </p>
                              </div>

                              {/* Floating Gift Box Icon Wrapper (Compact) */}
                              <div className="relative shrink-0 w-9 h-9 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full bg-[#B08D4C]/10 animate-pulse-ring" />
                                <div className="w-7.5 h-7.5 rounded-full bg-gradient-to-br from-[#D9BE85] to-[#B08D4C] text-white flex items-center justify-center animate-float-gift shadow-sm relative z-10">
                                  <Gift size={14} className="stroke-[2]" />
                                </div>
                              </div>
                            </div>
                            
                            {/* Shiny Gold Progress Bar (Compact) */}
                            <div className="space-y-0.5">
                              <div className="w-full bg-cream/80 h-2 rounded-full overflow-hidden border border-line/35 shadow-inner">
                                <div
                                  className="animate-shimmer-gold-bar h-full rounded-full transition-all duration-700 ease-silk shadow-[0_0_6px_rgba(176,141,76,0.35)]"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] font-bold text-taupe/90 tracking-wide font-sans">
                                <span>₹0</span>
                                <span>{progressPercent.toFixed(0)}% Completed</span>
                                <span>{formatINR(targetAmount, true)}</span>
                              </div>
                            </div>

                            {/* Available Gift Badges (Compact) */}
                            <div className="pt-2 border-t border-line/60 flex flex-wrap gap-1.5 items-center">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-taupe flex items-center gap-1 mr-1">
                                <Sparkles size={10} className="text-[#B08D4C]" /> Available Rewards:
                              </span>
                              {campaigns.map((c: any) => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#FAF6EC] border border-[#E9DBB7] text-[#8C6D2D] px-2 py-0.5 rounded-full shadow-xs transition-colors hover:bg-[#F3EAD5]"
                                >
                                  <Gift size={8} />
                                  {c.display_name || c.product?.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Unlocked State (Compact) */
                          <div className="space-y-3.5">
                            {/* Gold Corner Ribbon (Compact) */}
                            <span className="absolute top-0 right-0 bg-gradient-to-r from-[#D9BE85] to-[#B08D4C] text-white text-[8px] font-bold uppercase px-2.5 py-0.5 rounded-bl shadow-xs tracking-wider flex items-center gap-1 animate-pulse">
                              ✨ UNLOCKED ✨
                            </span>

                            <div className="flex items-center justify-between border-b border-[#E5D5B3] pb-2">
                              <div>
                                <p className="text-sm font-bold text-[#8C6D2D] flex items-center gap-1.5">
                                  <CheckCircle2 size={16} className="text-success shrink-0" />
                                  Congratulations! Gift Unlocked
                                </p>
                                <p className="text-[11px] text-taupe mt-0.5">
                                  {selectedGift 
                                    ? "You have claimed your free gift. You can switch to another one if desired." 
                                    : "Select one of the premium rewards below to add it directly to your cart:"}
                                </p>
                              </div>
                            </div>

                            {/* Reward Selection Cards Grid (Compact) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                                    className={`rounded-xl border p-3 flex gap-3 transition-all duration-300 relative ${
                                      isSelected
                                        ? "bg-white border-[#B08D4C] ring-2 ring-[#B08D4C]/20 shadow-sm"
                                        : "bg-cream/10 border-line hover:border-[#B08D4C]/40 hover:bg-cream/20"
                                    }`}
                                  >
                                    {/* Gold sparkle corner badge on option image (Compact) */}
                                    <span className="absolute -top-1 -left-1 bg-gradient-to-br from-[#D9BE85] to-[#B08D4C] text-white p-1 rounded-full shadow z-10 animate-float-gift">
                                      <Sparkles size={7} />
                                    </span>

                                    <div className="relative w-12 h-12 rounded-md overflow-hidden bg-cream border border-line flex-shrink-0">
                                      {img ? (
                                        <Image src={img} alt={c.display_name || c.product?.name || ""} fill className="object-cover" />
                                      ) : (
                                        <ShoppingBag className="w-5 h-5 m-3.5 text-muted" />
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                      <div className="space-y-0.5">
                                        <h3 className="text-[11px] sm:text-xs font-bold text-ink truncate pr-5 leading-tight">
                                          {c.display_name || c.product?.name}
                                        </h3>
                                        {details && (
                                          <p className="text-[9px] text-[#8C6D2D] font-bold">
                                            Variant: {details}
                                          </p>
                                        )}
                                        {productVal && (
                                          <p className="text-[9px] text-taupe/80 line-through">
                                            Worth {productVal}
                                          </p>
                                        )}
                                      </div>

                                      <div className="pt-2 flex justify-start">
                                        <button
                                          type="button"
                                          onClick={() => addFreeGift(c)}
                                          className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-wide transition-all duration-300 flex items-center gap-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                                            isSelected
                                              ? "bg-gradient-to-r from-[#D9BE85] to-[#B08D4C] text-[#553C0C] shadow border-0"
                                              : "border border-[#B08D4C] text-[#8C6D2D] hover:bg-[#B08D4C] hover:text-white bg-white shadow-xs"
                                          }`}
                                        >
                                          {isSelected ? (
                                            <>
                                              <CheckCircle2 size={10} className="stroke-[3]" />
                                              Claimed
                                            </>
                                          ) : (
                                            "Claim Gift"
                                          )}
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
