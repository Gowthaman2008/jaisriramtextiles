import type { Metadata } from "next";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Our Manufacturing",
  description:
    "How JAI SRI RAM TEXTILES makes its handloom dhotis, towels, scarfs and jute bags in Komarapalayam.",
};

const steps = [
  {
    n: "01",
    title: "Raw cotton selection",
    body: "We source combed cotton yarn from certified mills — finer combing means softer fabric and a cleaner weave with fewer loose fibres.",
  },
  {
    n: "02",
    title: "Dyeing & sizing",
    body: "Yarn is dyed in small batches for colour dhotis and scarfs, then starched (sized) to hold tension on the loom without breaking.",
  },
  {
    n: "03",
    title: "Warping & beaming",
    body: "Thousands of warp threads are wound onto the loom beam in exact order — a single dhoti uses over 1,200 warp ends per metre width.",
  },
  {
    n: "04",
    title: "Handloom weaving",
    body: "Our weavers operate traditional pit looms and frame looms. The zari (gold metallic thread) border is woven in simultaneously — never stitched on after.",
  },
  {
    n: "05",
    title: "Finishing & inspection",
    body: "Each piece is washed, sun-dried, pressed and inspected for defects. Towels are also subjected to absorbency and shrinkage tests.",
  },
  {
    n: "06",
    title: "Packing & dispatch",
    body: "Finished goods are folded on traditional blocks, tagged and packed. Direct-to-customer orders ship within 24–48 hours of order confirmation.",
  },
];

export default function ManufacturingPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[800px]">
        <span className="eyebrow">How we make it</span>
        <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
          From loom to doorstep
        </h1>
        <div className="zari-rule mt-6 mb-10" />

        <p className="text-base leading-relaxed text-taupe mb-12">
          Every piece from JAI SRI RAM TEXTILES passes through six stages of handcraft
          before it leaves our mill in Komarapalayam. Here is what happens between raw
          cotton and your order.
        </p>

        <ol className="space-y-8">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-6">
              <span className="font-display text-3xl text-zari/40 leading-none w-10 shrink-0">
                {s.n}
              </span>
              <div>
                <h2 className="font-display text-xl text-ink">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-taupe">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </div>
  );
}
