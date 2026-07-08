"use client";

import { Heart, ChevronLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/home/product-card";
import { useWishlist } from "@/components/providers/wishlist-provider";
import Link from "next/link";

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  return (
    <div className="py-12 bg-ivory min-h-[70vh]">
      <Container>
        {/* Back Button */}
        <Link
          href="/account"
          className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-6 transition-colors inline-flex cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8 border-b border-line pb-4">
          <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-cream text-zari border border-line">
            <Heart size={20} className="fill-current text-zari-deep" />
          </span>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-ink">My Wishlist</h1>
            <p className="text-xs text-taupe mt-0.5">
              {wishlist.length} saved {wishlist.length === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-16 max-w-[480px] mx-auto">
            <span className="inline-grid h-16 w-16 place-items-center rounded-full bg-cream text-taupe mx-auto border border-line mb-4">
              <Heart size={28} />
            </span>
            <h2 className="font-display text-2xl text-ink">Your wishlist is empty</h2>
            <p className="mt-3 text-sm text-taupe">
              Browse our collections and tap the heart icon on any product to save it here.
            </p>
            <div className="mt-8">
              <Button href="/shop" variant="gold" size="lg">
                Browse products
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {wishlist.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
