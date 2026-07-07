import type { Metadata } from "next";
import { Heart, ChevronLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <div className="py-12 bg-ivory min-h-[60vh]">
      <Container className="max-w-[560px]">
        {/* Back Button */}
        <Link
          href="/account"
          className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-6 transition-colors inline-flex cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div className="text-center mt-8">
          <span className="inline-grid h-16 w-16 place-items-center rounded-full bg-cream text-taupe mx-auto border border-line">
            <Heart size={28} />
          </span>
          <h1 className="mt-6 font-display text-3xl text-ink">Your wishlist</h1>
          <p className="mt-3 text-sm text-taupe">
            Saved items and wishlists are coming very soon. For now, browse the shop.
          </p>
          <div className="mt-8">
            <Button href="/shop" variant="gold" size="lg">
              Browse products
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
