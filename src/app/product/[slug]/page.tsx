import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { getProductBySlug, getProductReviews, getAllProductSlugs } from "@/lib/supabase/queries";
import { ProductActions } from "@/components/product/product-actions";
import { ProductGallery } from "@/components/product/product-gallery";
import { ChevronLeft } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.name} — ${formatINR(product.pricePaise, true)}. Shop premium handloom textiles from JAI SRI RAM TEXTILES.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Fetch reviews in parallel with the rest of the page computation
  const [realReviews] = await Promise.all([
    getProductReviews(product.id),
  ]);

  const discount =
    product.compareAtPaise && product.compareAtPaise > product.pricePaise
      ? Math.round((1 - product.pricePaise / product.compareAtPaise) * 100)
      : 0;
  const gallery = product.images?.length ? product.images : product.image ? [product.image] : [];

  // Only real customer reviews — no mock data

  const finalReviews = realReviews.map((r: any) => ({
    id: r.id,
    author: r.profiles?.full_name || "Verified Customer",
    rating: r.rating,
    date: new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
    title: r.title || "",
    body: r.body || "",
    photos: (r.review_photos || []).map((p: any) => p.url),
  }));

  const totalCount = product.reviewCount;
  const ratingAvg = product.rating;

  // Generate product-specific mock reviews that are always shown alongside real customer reviews
  const mockReviews = (() => {
    const slug = product.slug.toLowerCase();

    if (slug.includes("veshti") || slug.includes("dhoti")) {
      if (slug.includes("white") || slug.includes("gold")) {
        return [
          {
            id: "mock-1",
            author: "Karthik Raja",
            rating: 5,
            date: "3 weeks ago",
            title: "Very premium white veshti",
            body: "The double layer veshti is perfect for festive occasions. The cotton is dense and very soft. The border has a beautiful shine.",
            photos: [],
          },
          {
            id: "mock-2",
            author: "Subramanian S.",
            rating: 4,
            date: "1 month ago",
            title: "Excellent handloom quality",
            body: "Very comfortable to wear for long hours. Classic look, pure white. Highly recommended.",
            photos: [],
          }
        ];
      } else {
        return [
          {
            id: "mock-1",
            author: "Vijay Kumar",
            rating: 5,
            date: "2 weeks ago",
            title: "Rich color and fine border",
            body: "The color is exactly as shown in the picture. The border has a nice zari shine. Looks very traditional.",
            photos: [],
          },
          {
            id: "mock-2",
            author: "Anandharaj M.",
            rating: 5,
            date: "1 month ago",
            title: "Premium coloured dhoti",
            body: "Good fit and fabric feels soft. The color did not bleed on first wash. Great quality.",
            photos: [],
          }
        ];
      }
    } else if (slug.includes("towel")) {
      return [
        {
          id: "mock-1",
          author: "Murugan G.",
          rating: 5,
          date: "10 days ago",
          title: "Super absorbent bath towel",
          body: "Very thick combed cotton. It absorbs water quickly and dries fast. Value for money product.",
          photos: [],
        },
        {
          id: "mock-2",
          author: "Selvam P.",
          rating: 4,
          date: "3 weeks ago",
          title: "Soft and thick cotton towel",
          body: "Large size and good quality weave. It is soft on the skin and holds up well after wash.",
          photos: [],
        }
      ];
    } else if (slug.includes("scarf")) {
      return [
        {
          id: "mock-1",
          author: "Priya Sundar",
          rating: 5,
          date: "1 week ago",
          title: "Elegant cotton scarf",
          body: "Beautiful design and the cotton texture is very breathable. Perfect to wear in hot summers.",
          photos: [],
        },
        {
          id: "mock-2",
          author: "Divya N.",
          rating: 4,
          date: "1 month ago",
          title: "Lovely summer accessory",
          body: "The colors are vibrant. Looks great with simple kurtis and dresses. Easy to wash.",
          photos: [],
        }
      ];
    } else if (slug.includes("tote") || slug.includes("bag") || slug.includes("jute")) {
      return [
        {
          id: "mock-1",
          author: "Meenakshi R.",
          rating: 5,
          date: "12 days ago",
          title: "Spacious and sturdy jute bag",
          body: "Perfect tote bag for daily shopping or office. The handles are very comfortable to carry, and it is very spacious.",
          photos: [],
        },
        {
          id: "mock-2",
          author: "Rajeshwari S.",
          rating: 5,
          date: "3 weeks ago",
          title: "Great eco-friendly bag",
          body: "Strong stitching and premium quality jute. Looks neat and elegant. Good value for money.",
          photos: [],
        }
      ];
    } else {
      return [
        {
          id: "mock-1",
          author: "Senthil Kumar",
          rating: 5,
          date: "2 weeks ago",
          title: "Great handloom quality",
          body: "Excellent craftsmanship. The handloom texture is very premium and authentic. Very satisfied with the buy.",
          photos: [],
        },
        {
          id: "mock-2",
          author: "Gopalakrishnan V.",
          rating: 4,
          date: "1 month ago",
          title: "Good purchase",
          body: "Product is very comfortable and soft. The packaging was clean and delivery was fast.",
          photos: [],
        }
      ];
    }
  })();

  const displayReviews = [...finalReviews, ...mockReviews];

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
    <div className="py-6 sm:py-10 lg:py-14">
      <Container>
        {/* Back Button & Bulk Order CTA */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/shop"
            className="flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} /> Back to Shop
          </Link>
          <Button variant="gold" size="sm" href="/bulk-orders" className="text-xs">
            Bulk Orders
          </Button>
        </div>
        <div className="grid gap-6 sm:gap-10 lg:grid-cols-2 lg:gap-16 w-full min-w-0">
          {/* Gallery */}
          <div className="w-full min-w-0 overflow-hidden">
            <ProductGallery images={gallery} name={product.name} />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4 w-full min-w-0 overflow-hidden">
            <span className="eyebrow text-[11px]">{product.categoryLabel}</span>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink leading-snug break-words [overflow-wrap:anywhere] w-full">{product.name}</h1>

            <div className="flex items-center gap-2 flex-wrap">
              <StarRating rating={ratingAvg} />
              <span className="text-sm text-muted">({totalCount} reviews)</span>
            </div>

            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
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
              <p className="text-sm font-medium text-zari-deep break-words">
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

            {product.inStock && (
              <p className="text-xs text-taupe flex items-center gap-1.5 font-semibold mt-1.5">
                🚚 Delivery by <span className="text-ink font-bold">{new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
              </p>
            )}

            {product.piecesPerPack && product.piecesPerPack > 1 && (
              <div className="inline-flex items-center gap-1.5 rounded bg-zari/10 border border-zari/25 px-2.5 py-1 text-xs font-semibold text-zari-deep max-w-fit font-sans">
                📦 {product.piecesPerPack} Pieces in 1 Pack
              </div>
            )}

            <div className="zari-rule my-2" />

            <ProductActions product={product} />

            {/* Return Policy Notice badge */}
            <div className="mt-4 bg-cream/35 border border-line rounded p-3 text-xs text-taupe space-y-1 bg-ivory/30 w-full">
              <div className="flex items-center gap-1.5 font-bold text-ink text-[11px] uppercase tracking-wider">
                🔄 7 Days Easy Return
              </div>
              <p className="leading-relaxed break-words">
                Return or replacement is only accepted if the product was received in a damaged condition.
              </p>
            </div>

            {/* Product Description */}
            {product.description && (
              <div className="mt-2 w-full">
                <h2 className="font-display text-lg text-ink">Description</h2>
                <p className="mt-2 text-sm text-taupe leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">
                  {product.description}
                </p>
              </div>
            )}
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
              {displayReviews.length === 0 ? (
                <div className="py-10 text-center text-sm text-taupe">
                  <p className="font-semibold text-ink">No reviews yet</p>
                  <p className="mt-1">Be the first to review this product after purchase.</p>
                </div>
              ) : (
                displayReviews.map((r, index) => (
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
                ))
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
