import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCard } from "@/components/home/product-card";
import { getAllProducts } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Shop All",
  description: "Browse the full JAI SRI RAM TEXTILES collection.",
};

export default async function ShopPage() {
  const products = await getAllProducts();

  return (
    <div className="py-14 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Shop"
          title="All products"
          intro="Every handloom piece we make, in one place."
        />

        {products.length > 0 ? (
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="mt-16 rounded-card border border-dashed border-line bg-cream/60 py-20 text-center">
            <p className="font-display text-xl text-ink">The shop is warming up</p>
            <p className="mt-2 text-sm text-taupe">
              Products are being added — check back shortly.
            </p>
          </div>
        )}
      </Container>
    </div>
  );
}
