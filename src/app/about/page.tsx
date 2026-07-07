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
          <p>
            Our mill is located at{" "}
            <strong className="text-ink">
              136/5, Kallangattuvalasu, Komarapalayam, Namakkal District, Tamil Nadu — 638183
            </strong>
            . We welcome trade enquiries by email at{" "}
            <a
              href="mailto:jaisriramtextiles@gmail.com"
              className="text-zari-deep underline underline-offset-2 hover:text-zari"
            >
              jaisriramtextiles@gmail.com
            </a>
            .
          </p>
        </div>
      </Container>
    </div>
  );
}
