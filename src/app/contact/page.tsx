import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with JAI SRI RAM TEXTILES.",
};

export default function ContactPage() {
  const { address } = BUSINESS;
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[720px]">
        <span className="eyebrow">Get in touch</span>
        <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">Contact us</h1>
        <div className="zari-rule mt-6 mb-10" />

        <div className="grid gap-6 sm:grid-cols-2">
          <a
            href={`mailto:${BUSINESS.email}`}
            className="zari-frame flex items-start gap-4 rounded-card bg-cream p-6 transition hover:shadow-soft"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zari/10 text-zari-deep">
              <Mail size={18} />
            </span>
            <div>
              <p className="font-semibold text-ink">Email</p>
              <p className="mt-1 text-sm text-taupe">{BUSINESS.email}</p>
              <p className="mt-2 text-xs text-muted">We reply within 1–2 business days</p>
            </div>
          </a>

          <div className="zari-frame flex items-start gap-4 rounded-card bg-cream p-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zari/10 text-zari-deep">
              <MapPin size={18} />
            </span>
            <div>
              <p className="font-semibold text-ink">Mill address</p>
              <p className="mt-1 text-sm text-taupe leading-relaxed">
                {address.line1}<br />
                {address.city}, {address.district}<br />
                {address.state} – {address.pincode}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-10 text-sm text-taupe">
          For bulk or wholesale enquiries, please use our dedicated{" "}
          <a href="/bulk-orders" className="text-zari-deep underline underline-offset-2 hover:text-zari">
            bulk orders form
          </a>{" "}
          so we can respond with the right pricing and lead times.
        </p>
      </Container>
    </div>
  );
}
