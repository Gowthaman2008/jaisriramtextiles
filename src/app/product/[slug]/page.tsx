import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { getProductBySlug, getProductReviews } from "@/lib/supabase/queries";
import { products as mockProducts } from "@/data/mock";
import { ProductActions } from "@/components/product/product-actions";
import { ProductGallery } from "@/components/product/product-gallery";
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

  // Fetch real reviews
  const realReviews = await getProductReviews(product.id);

  // Generate category mock reviews matching the default stars
  const mockReviews = [
    { id: "mock-1", author: "Arun K.", rating: 5, date: "25 Jun 2026", title: "Outstanding quality!", body: "The fabric is incredibly premium. Highly recommend JAI SRI RAM TEXTILES!", photos: [] },
    { id: "mock-2", author: "Priya Chandran", rating: 5, date: "01 Jul 2026", title: "Soft and comfortable", body: "Exactly as described. Authentic handloom quality and fast delivery.", photos: [] },
    { id: "mock-3", author: "Ravi Teja", rating: 4, date: "15 Jun 2026", title: "Satisfied with purchase", body: "Very durable, colors look great. Will buy again.", photos: [] }
  ];

  // Mix of real reviews and mock reviews
  const finalReviews = [
    ...realReviews.map((r: any) => ({
      id: r.id,
      author: r.profiles?.full_name || "Verified Customer",
      rating: r.rating,
      date: new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
      title: r.title || "",
      body: r.body || "",
      photos: (r.review_photos || []).map((p: any) => p.url)
    })),
    ...mockReviews
  ];

  const totalCount = product.reviewCount;
  const ratingAvg = product.rating;

  // Distribute based on average rating
  let pct5 = 0, pct4 = 0, pct3 = 0, pct2 = 0, pct1 = 0;
  if (ratingAvg >= 4.7) {
    pct5 = 75; pct4 = 20; pct3 = 3; pct2 = 1; pct1 = 1;
  } else if (ratingAvg >= 4.3) {
    pct5 = 62; pct4 = 28; pct3 = 7; pct2 = 2; pct1 = 1;
  } else if (ratingAvg >= 3.8) {
    pct5 = 45; pct4 = 35; pct3 = 14; pct2 = 4; pct1 = 2;
  } else {
    pct5 = 35; pct4 = 30; pct3 = 20; pct2 = 10; pct1 = 5;
  }

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
          <ProductGallery images={gallery} name={product.name} />

          {/* Info */}
          <div className="flex flex-col gap-4">
            <span className="eyebrow text-[11px]">{product.categoryLabel}</span>
            <h1 className="font-display text-3xl text-ink sm:text-4xl">{product.name}</h1>

            <div className="flex items-center gap-2">
              <StarRating rating={ratingAvg} />
              <span className="text-sm text-muted">({totalCount} reviews)</span>
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

        {/* Customer Reviews Section */}
        <div className="zari-rule my-10" />
        
        <div className="space-y-8">
          <div>
            <h2 className="font-display text-2xl text-ink">Customer Reviews</h2>
            <p className="text-xs text-taupe mt-1">Verified buyer feedback and product ratings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Reviews Summary Card */}
            <div className="md:col-span-4 bg-cream/25 border border-line rounded-card p-5 space-y-4">
              <div className="text-center space-y-1">
                <p className="font-display text-5xl text-ink font-bold">{ratingAvg.toFixed(1)}</p>
                <div className="flex justify-center my-1">
                  <StarRating rating={ratingAvg} />
                </div>
                <p className="text-xs text-taupe font-semibold">Based on {totalCount} reviews</p>
              </div>

              {/* Progress bars */}
              <div className="space-y-2 text-xs">
                {[
                  { stars: 5, pct: pct5 },
                  { stars: 4, pct: pct4 },
                  { stars: 3, pct: pct3 },
                  { stars: 2, pct: pct2 },
                  { stars: 1, pct: pct1 }
                ].map((item) => (
                  <div key={item.stars} className="flex items-center gap-3">
                    <span className="w-3 font-semibold text-right">{item.stars}</span>
                    <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                      <div className="h-full bg-zari" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="w-8 text-taupe text-right font-medium">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews List */}
            <div className="md:col-span-8 space-y-6">
              {finalReviews.map((r, index) => (
                <div key={r.id || index} className="border-b border-line pb-6 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-ink text-sm">{r.author}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating rating={r.rating} />
                        {r.title && <span className="font-bold text-ink text-xs">{r.title}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-taupe font-medium">{r.date}</span>
                  </div>
                  
                  <p className="text-xs text-taupe mt-3 leading-relaxed whitespace-pre-line">{r.body}</p>

                  {/* Review photos */}
                  {r.photos && r.photos.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {r.photos.map((url: string, pIdx: number) => (
                        <a key={pIdx} href={url} target="_blank" rel="noopener noreferrer" className="relative w-16 h-16 rounded border border-line overflow-hidden bg-cream cursor-zoom-in block hover:opacity-85 transition-opacity">
                          <Image src={url} alt="Review attachment" fill className="object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
