import type { Metadata } from "next";
import { Phone, MessageCircle, Mail, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Bulk Orders & Wholesale",
  description:
    "Wholesale dhotis, towels, scarfs and jute bags for temples, hotels, retailers and corporate gifting from JAI SRI RAM TEXTILES. Call, WhatsApp or email us directly for bulk pricing.",
};

const contacts = [
  {
    icon: Phone,
    label: "Call Us",
    value: "+91 86083 86872",
    sub: "Mon–Sat, 9:00 AM – 7:00 PM",
    href: "tel:+918608386872",
    cta: "Call Now",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+91 86083 86872",
    sub: "Fastest way to share your requirement",
    href: "https://wa.me/918608386872?text=" + encodeURIComponent("Hi, I'm interested in placing a bulk/wholesale order with Jai Sri Ram Textiles. Please share pricing details."),
    cta: "Chat on WhatsApp",
  },
  {
    icon: Mail,
    label: "Email",
    value: "jaisriramtextilekpm@gmail.com",
    sub: "Share your quantity & we'll quote within a day",
    href: "mailto:jaisriramtextilekpm@gmail.com?subject=" + encodeURIComponent("Bulk Order Enquiry") + "&body=" + encodeURIComponent("Hi, I'm interested in placing a bulk/wholesale order. Here are my requirements:\n\nProduct(s):\nApprox. quantity:\nOrganisation:\n"),
    cta: "Send Email",
  },
];

const wholesalePerks = [
  "Direct-from-manufacturer pricing — no middleman markup",
  "Wholesale rates that improve as your order quantity grows",
  "Custom quantities for temples, hotels, retailers, corporates & weddings",
  "Bulk packing, GST invoicing, and pan-India delivery",
  "Flexible payment options for repeat & long-term buyers",
  "Consistent quality across every piece in a large order",
];

export default function BulkOrdersPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[860px]">
        <SectionHeading
          eyebrow="Wholesale"
          title="Bulk orders and wholesale enquiries"
          intro="Temples, hotels, retailers, corporates and wedding parties — reach out to us directly for wholesale pricing and lead times. No forms, no waiting — just call, WhatsApp or email."
        />

        {/* Contact cards */}
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {contacts.map((c) => (
            <div
              key={c.label}
              className="flex flex-col items-start gap-3 rounded-card border border-line bg-white p-6 shadow-soft"
            >
              <span className="inline-grid h-11 w-11 place-items-center rounded-full bg-zari-tint text-zari-deep">
                <c.icon size={20} />
              </span>
              <div className="w-full min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-taupe">{c.label}</p>
                <p className="mt-1 break-all font-sans text-base font-bold text-ink">{c.value}</p>
                <p className="mt-1 text-xs text-taupe">{c.sub}</p>
              </div>
              <a
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-pill bg-zari px-4 text-sm font-semibold text-ivory transition-colors hover:bg-zari-deep"
              >
                {c.cta}
              </a>
            </div>
          ))}
        </div>

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
      </Container>
    </div>
  );
}
