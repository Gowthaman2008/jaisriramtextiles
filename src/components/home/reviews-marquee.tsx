"use client";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { StarRating } from "@/components/ui/star-rating";
import { reviews } from "@/data/mock";

export function ReviewsMarquee() {
  const loop = [...reviews, ...reviews]; // duplicate for a seamless marquee
  return (
    <section className="overflow-hidden py-20 sm:py-24">
      <Container>
        <SectionHeading
          align="center"
          eyebrow="Loved by customers"
          title="Woven trust, one order at a time"
        />
      </Container>

      <div
        className="group relative mt-12 flex gap-5"
        style={{ maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}
      >
        <div className="flex shrink-0 animate-marquee gap-5 group-hover:[animation-play-state:paused]">
          {loop.map((r, i) => (
            <figure
              key={i}
              className="zari-frame w-[340px] shrink-0 rounded-card bg-cream p-6"
            >
              <StarRating rating={r.rating} size={16} />
              <blockquote className="mt-4 text-sm leading-relaxed text-ink">
                &ldquo;{r.text}&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">
                  {r.author} · <span className="text-taupe">{r.location}</span>
                </span>
                <span className="text-zari-deep">{r.product}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
