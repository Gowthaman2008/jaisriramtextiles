import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCard } from "@/components/home/product-card";
import { CATEGORIES } from "@/lib/constants";
import {
  getCategoryBySlug,
  getOnSaleProducts,
  getProductsByCategoryId,
} from "@/lib/supabase/queries";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const isSale = slug === "sale";
  const category = isSale ? null : await getCategoryBySlug(slug);
  
  if (!isSale && !category) return {};

  const title = category?.name ?? (isSale ? "Live On Sale" : "Collection");
  return {
    title,
    description: category?.tagline ?? `Shop ${title} from JAI SRI RAM TEXTILES.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  
  const isSale = slug === "sale";
  const category = isSale ? null : await getCategoryBySlug(slug);

  if (!isSale && !category) {
    notFound();
  }

  const products = isSale
    ? await getOnSaleProducts()
    : category
      ? await getProductsByCategoryId(category.id)
      : [];

  const title = category?.name ?? (isSale ? "Live On Sale" : "Collection");
  const tagline =
    category?.tagline ??
    (isSale ? "Our best prices, while stock lasts." : `Handloom ${title.toLowerCase()}, made to last.`);

  return (
    <div className="py-14 sm:py-20">
      <Container>
        <SectionHeading eyebrow="Shop" title={title} intro={tagline} />

        {products.length > 0 ? (
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="mt-16 rounded-card border border-dashed border-line bg-cream/60 py-20 text-center">
            <p className="font-display text-xl text-ink">New arrivals coming soon</p>
            <p className="mt-2 text-sm text-taupe">
              We&apos;re adding {title.toLowerCase()} to the shop — check back shortly.
            </p>
          </div>
        )}
      </Container>
    </div>
  );
}
