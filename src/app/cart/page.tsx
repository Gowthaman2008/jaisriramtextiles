"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/providers/cart-provider";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, Truck, ChevronLeft } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { computeShipping } from "@/lib/constants";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, cartSubtotalPaise } = useCart();

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center py-20 bg-ivory">
        <Container className="max-w-[560px] text-center">
          {/* Back Button */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-6 transition-colors inline-flex cursor-pointer"
          >
            <ChevronLeft size={16} /> Back to Home
          </Link>
          <span className="inline-grid h-16 w-16 place-items-center rounded-full bg-cream text-taupe mx-auto border border-line">
            <ShoppingBag size={28} />
          </span>
          <h1 className="mt-6 font-display text-3xl text-ink">Your cart is empty</h1>
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
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="font-semibold text-ink text-sm sm:text-base truncate hover:underline">
                        <Link href={`/product/${item.slug}`}>{item.name}</Link>
                      </h2>
                      
                      {/* Selected variant details */}
                      {item.variant && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
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

                    <p className="font-display text-sm sm:text-base text-ink flex-shrink-0 font-semibold">
                      {formatINR(item.pricePaise * item.quantity, true)}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    {/* Quantity Selector */}
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

                    {/* Delete Item */}
                    <button
                      onClick={() => removeFromCart(item.id, item.variant?.sku || null)}
                      className="text-muted hover:text-danger p-1.5 rounded-full hover:bg-danger/5 transition-colors"
                      aria-label="Delete item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
}
