import Link from "next/link";
import { Mail, MapPin, Instagram, Facebook, Youtube } from "lucide-react";
import { Container } from "@/components/ui/container";
import { BUSINESS } from "@/lib/constants";

const cols = [
  {
    title: "Shop",
    links: [
      ["White Dhoti", "/shop/white-dhoti"],
      ["Colour Dhoti", "/shop/colour-dhoti"],
      ["Towels", "/shop/towels"],
      ["Scarfs", "/shop/scarfs"],
      ["Jute Bags", "/shop/jute-bags"],
      ["Live On Sale", "/shop/sale"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About Us", "/about"],
      ["Manufacturing", "/manufacturing"],
      ["Bulk Orders", "/bulk-orders"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Policies",
    links: [
      ["Privacy Policy", "/policies/privacy"],
      ["Terms & Conditions", "/policies/terms"],
      ["Shipping Policy", "/policies/shipping"],
      ["Refund Policy", "/policies/refund"],
    ],
  },
];

export function Footer() {
  const { address } = BUSINESS;
  return (
    <footer className="mt-24 border-t border-line bg-cream">
      <div className="zari-rule" />
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand + newsletter */}
          <div className="lg:col-span-2">
            <p className="font-display text-2xl text-ink">JAI SRI RAM TEXTILES</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-taupe">
              Traditional Indian textile manufacturers — handloom dhotis, towels,
              scarfs and jute bags, woven with care in Tamil Nadu.
            </p>

            <form className="mt-6 flex max-w-sm items-center gap-2">
              <label htmlFor="footer-news" className="sr-only">
                Email address
              </label>
              <input
                id="footer-news"
                type="email"
                placeholder="Your email"
                className="h-11 flex-1 rounded-pill border border-line bg-ivory px-4 text-sm outline-none focus:border-zari"
              />
              <button
                type="submit"
                className="h-11 rounded-pill bg-ink px-5 text-sm font-semibold text-ivory transition hover:bg-zari-deep"
              >
                Subscribe
              </button>
            </form>

            <div className="mt-6 flex gap-3">
              {[Instagram, Facebook, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social media"
                  className="grid h-10 w-10 place-items-center rounded-full border border-line text-taupe transition hover:border-zari hover:text-zari-deep"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-taupe transition-colors hover:text-ink"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact block — email + address only, no phone */}
        <div className="mt-12 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
          <a
            href={`mailto:${BUSINESS.email}`}
            className="flex items-center gap-3 text-sm text-taupe transition hover:text-ink"
          >
            <Mail size={16} className="text-zari" />
            {BUSINESS.email}
          </a>
          <p className="flex items-start gap-3 text-sm text-taupe">
            <MapPin size={16} className="mt-0.5 shrink-0 text-zari" />
            <span>
              {address.line1}, {address.city}, {address.district}, {address.state} –{" "}
              {address.pincode}
            </span>
          </p>
        </div>
      </Container>

      <div className="border-t border-line py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} JAI SRI RAM TEXTILES. All rights reserved.
      </div>
    </footer>
  );
}
