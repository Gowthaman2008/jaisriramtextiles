import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <div className="flex min-h-[60vh] items-center py-20">
      <Container className="max-w-[560px] text-center">
        <span className="inline-grid h-16 w-16 place-items-center rounded-full bg-cream text-taupe mx-auto">
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
      </Container>
    </div>
  );
}
