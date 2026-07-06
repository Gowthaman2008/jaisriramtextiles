import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Building2, Hotel, Landmark, Sparkles } from "lucide-react";

const chips = [
  { icon: Landmark, label: "Temple supplies" },
  { icon: Hotel, label: "Hotel supplies" },
  { icon: Building2, label: "Retailer & corporate" },
  { icon: Sparkles, label: "Wedding orders" },
];

export function BulkOrderBanner() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <Reveal className="grid overflow-hidden rounded-card border border-line bg-ivory shadow-soft lg:grid-cols-2">
          <div className="relative min-h-[300px]">
            <Image
              src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80"
              alt="Bulk textile manufacturing"
              fill
              sizes="(max-width:1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent lg:bg-gradient-to-r" />
          </div>
          <div className="p-8 sm:p-12">
            <span className="eyebrow">Bulk &amp; wholesale</span>
            <h2 className="mt-4 font-display text-3xl leading-tight text-ink sm:text-4xl">
              Manufacturing at scale, made simple
            </h2>
            <p className="mt-4 text-taupe">
              We supply institutions, retailers and businesses with custom manufacturing
              and wholesale pricing. Tell us what you need and we&apos;ll prepare a quote.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1.5 rounded-pill bg-cream px-3 py-1.5 text-xs font-medium text-ink">
                  <c.icon size={13} className="text-zari" /> {c.label}
                </span>
              ))}
            </div>
            <div className="mt-8">
              <Button variant="primary" size="lg" href="/bulk-orders">
                Enquire about bulk orders
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
