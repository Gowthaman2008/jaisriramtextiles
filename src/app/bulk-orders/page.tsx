import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { BulkEnquiryCards } from "@/components/bulk-enquiry-cards";
import { getAllProducts } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Bulk Orders & Wholesale",
  description:
    "Wholesale dhotis, towels, scarfs and jute bags for temples, hotels, retailers and corporate gifting from JAI SRI RAM TEXTILES. Call, WhatsApp or email us directly for bulk pricing.",
};

const wholesalePerks = [
  "Direct-from-manufacturer pricing — no middleman markup",
  "Wholesale rates that improve as your order quantity grows",
  "Custom quantities for temples, hotels, retailers, corporates & weddings",
  "Bulk packing, GST invoicing, and pan-India delivery",
  "Flexible payment options for repeat & long-term buyers",
  "Consistent quality across every piece in a large order",
];

export default async function BulkOrdersPage() {
  const products = await getAllProducts();

  return (
    <div className="py-8 sm:py-14">
      <Container className="max-w-[860px]">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-taupe hover:text-ink transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} /> Back to Home
          </Link>
        </div>

        <SectionHeading
          eyebrow="Wholesale"
          title="Bulk orders and wholesale enquiries"
          intro="Temples, hotels, retailers, corporates and wedding parties — reach out to us directly for wholesale pricing and lead times. No forms, no waiting — just call, WhatsApp or email."
        />

        {/* Contact cards with click tracking */}
        <BulkEnquiryCards />

        {/* Product Showcase */}
        {products.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl text-ink">Our products available for bulk orders</h2>
            <p className="mt-2 text-sm text-taupe">
              Browse our range below — contact us with the product name, quantity and any customisation for a wholesale quote.
            </p>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
              {products.filter((p) => p.category !== "jute-bags" && p.categoryLabel?.toLowerCase() !== "jute bags").map((product) => {
                const sizes = product.variants
                  ?.map((v) => v.size)
                  .filter((s): s is string => !!s)
                  .filter((s, i, arr) => arr.indexOf(s) === i);

                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group rounded-card border border-line bg-white overflow-hidden shadow-soft hover:shadow-lift transition-shadow"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square bg-cream overflow-hidden">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 280px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-taupe text-xs">
                          No image
                        </div>
                      )}
                      {product.categoryLabel && (
                        <span className="absolute top-2 left-2 bg-ink/80 text-ivory text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded">
                          {product.categoryLabel}
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3 sm:p-4 space-y-1.5">
                      <h3 className="text-sm font-bold text-ink leading-snug line-clamp-2 group-hover:text-zari-deep transition-colors">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-taupe leading-relaxed line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {sizes && sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {sizes.map((size) => (
                            <span
                              key={size}
                              className="inline-block text-[10px] font-semibold text-taupe bg-cream border border-line rounded px-1.5 py-0.5"
                            >
                              {size}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Wholesale / bulk discount details */}
        <div className="mt-16 rounded-card border border-line bg-cream/50 p-6 sm:p-8">
          <h2 className="font-display text-2xl text-ink">Bulk discounts & wholesale rates</h2>
          <p className="mt-3 text-taupe leading-relaxed">
            We offer special wholesale rates on bulk purchases — the larger your order, the
            better your per-piece price. Whether it&apos;s a temple stocking up on prasadam-time
            towels, a hotel outfitting its staff, a retailer replenishing stock, or a family
            ordering return gifts for a wedding, we tailor pricing to your exact quantity and
            requirement.
          </p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {wholesalePerks.map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-sm text-ink">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-zari-deep" />
                <span>{perk}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-taupe leading-relaxed">
            Wholesale rates depend on the product, quantity and any customisation you need —
            call or WhatsApp us with your requirement and we&apos;ll get back with a custom quote,
            usually within a day.
          </p>
        </div>

        {/* About the shop */}
        <div className="mt-12">
          <h2 className="font-display text-2xl text-ink">About Jai Sri Ram Textiles</h2>
          <p className="mt-3 text-taupe leading-relaxed">
            Jai Sri Ram Textiles is a traditional handloom textile manufacturer based in
            Komarapalayam, Tamil Nadu — one of India&apos;s leading textile-weaving hubs. For
            generations, we have woven premium cotton dhotis, veshtis, temple towels,
            angavastrams, scarfs and jute bags using time-honoured handloom techniques passed
            down through skilled local artisans. Every piece is crafted with care, blending
            traditional craftsmanship with consistent quality control — trusted by temples,
            retailers, hoteliers and families across Tamil Nadu and beyond.
          </p>
          <p className="mt-3 text-taupe leading-relaxed">
            Because we manufacture in-house rather than resell, we&apos;re able to offer genuine
            wholesale pricing on large orders — with full control over fabric, weave quality
            and turnaround time.
          </p>
        </div>

        {/* Explore Products CTA */}
        <div className="mt-14 text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-pill bg-zari px-8 py-3 text-base font-semibold text-ivory transition-colors hover:bg-zari-deep"
          >
            Explore Products <ArrowRight size={18} />
          </Link>
        </div>
      </Container>
    </div>
  );
}
