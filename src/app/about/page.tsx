import type { Metadata } from "next";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about JAI SRI RAM TEXTILES — a traditional handloom manufacturer in Komarapalayam, Tamil Nadu.",
};

export default function AboutPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[720px]">
        <span className="eyebrow">Our story</span>
        <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
          Woven with generations of craft
        </h1>
        <div className="zari-rule mt-6 mb-8" />

        <div className="space-y-6 text-base leading-relaxed text-taupe">
          <p>
            JAI SRI RAM TEXTILES is a traditional textile manufacturer based in{" "}
            <strong className="text-ink">Komarapalayam, Tamil Nadu</strong> — one of India's
            oldest handloom weaving centres. For generations, our family has produced pure
            cotton dhotis, towels, scarfs and jute bags on heritage looms, combining
            time-tested techniques with rigorous quality standards.
          </p>
          <p>
            Every piece we make begins as raw combed cotton and passes through the hands of
            skilled weavers before it reaches you. Our signature zari borders — the gold
            thread woven along the edge of each veshti — are made from real metallic yarn,
            not printed. The weight, drape and finish you feel is the result of decisions
            made at the loom, not in a factory.
          </p>
          <p>
            We supply temples, hotels, retailers and individual buyers across India. Whether
            you need a single piece for a family occasion or a thousand pieces for an
            institution, the same care goes into every metre we weave.
          </p>
          
          <div className="zari-rule my-8" />

          <div className="bg-cream/30 border border-line rounded-card p-6 mt-8 space-y-6">
            <h2 className="font-display text-2xl text-ink">Official Contact & Address</h2>
            <div className="grid gap-6 sm:grid-cols-2 text-sm text-taupe leading-relaxed">
              <div className="space-y-2">
                <p className="font-bold text-ink uppercase tracking-wider text-xs">Mill & Registered Office</p>
                <p>
                  <strong className="text-ink">JAI SRI RAM TEXTILES</strong><br />
                  5/136/5, Shasti Smart City, Kallankattuvalasu,<br />
                  Kumarapalayam, Namakkal District,<br />
                  Tamil Nadu, India – 638183
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-ink uppercase tracking-wider text-xs">General & Trade Enquiries</p>
                  <a
                    href="mailto:jaisriramtextiles@gmail.com"
                    className="text-zari-deep font-semibold underline underline-offset-2 hover:text-zari"
                  >
                    jaisriramtextiles@gmail.com
                  </a>
                </div>
                <div>
                  <p className="font-bold text-ink uppercase tracking-wider text-xs">Support Hours</p>
                  <p>Monday to Saturday: 9:00 AM — 6:00 PM (IST)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
