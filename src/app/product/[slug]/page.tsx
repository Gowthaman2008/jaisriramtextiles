import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { getProductBySlug } from "@/lib/supabase/queries";
import { products as mockProducts } from "@/data/mock";
import { ProductActions } from "@/components/product/product-actions";
import { ChevronLeft } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

async function findProduct(slug: string) {
  const dbProduct = await getProductBySlug(slug);
  if (dbProduct) return dbProduct;
  // Fall back to mock data when DB is empty (dev / empty catalogue)
  return mockProducts.find((p) => p.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await findProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.name} — ${formatINR(product.pricePaise, true)}. Shop premium handloom textiles from JAI SRI RAM TEXTILES.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await findProduct(slug);
  if (!product) notFound();

  const discount =
    product.compareAtPaise && product.compareAtPaise > product.pricePaise
      ? Math.round((1 - product.pricePaise / product.compareAtPaise) * 100)
      : 0;
  const gallery = product.images?.length ? product.images : product.image ? [product.image] : [];

  return (
    <div className="py-10 sm:py-14">
      <Container>
        {/* Back Button */}
        <Link
          href="/shop"
          className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink mb-6 transition-colors inline-flex cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Shop
        </Link>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <div className="zari-frame aspect-square overflow-hidden rounded-card bg-cream">
            {gallery[0] ? (
              <Image
                src={gallery[0]}
                alt={product.name}
                width={900}
                height={900}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm text-muted">
                No image yet
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4">
            <span className="eyebrow text-[11px]">{product.categoryLabel}</span>
            <h1 className="font-display text-3xl text-ink sm:text-4xl">{product.name}</h1>

            <div className="flex items-center gap-2">
              <StarRating rating={product.rating} />
              <span className="text-sm text-muted">({product.reviewCount} reviews)</span>
            </div>

            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-2xl text-ink">
                {formatINR(product.pricePaise, true)}
              </span>
              {product.compareAtPaise && (
                <span className="text-base text-muted line-through">
                  {formatINR(product.compareAtPaise, true)}
                </span>
              )}
              {discount > 0 && (
                <span className="rounded-pill bg-danger px-2.5 py-1 text-[11px] font-bold text-ivory">
                  −{discount}%
                </span>
              )}
            </div>

            {product.cashbackPaise > 0 && (
              <p className="text-sm font-medium text-zari-deep">
                Earn {formatINR(product.cashbackPaise, true)} cashback after delivery
              </p>
            )}

            <p className="text-sm font-medium">
              {product.inStock ? (
                <span className="text-success">In stock</span>
              ) : (
                <span className="text-danger">Out of stock</span>
              )}
            </p>

            <div className="zari-rule my-2" />

            <ProductActions product={product} />

            {/* Return Policy Notice badge */}
            <div className="mt-4 bg-cream/35 border border-line rounded p-3 text-xs text-taupe space-y-1 bg-ivory/30">
              <div className="flex items-center gap-1.5 font-bold text-ink text-[11px] uppercase tracking-wider">
                🔄 7 Days Easy Return
              </div>
              <p className="leading-relaxed">
                Return or replacement is only accepted if the product was received in a damaged condition.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
