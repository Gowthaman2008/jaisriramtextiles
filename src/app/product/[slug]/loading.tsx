import { Container } from "@/components/ui/container";

export default function ProductLoading() {
  return (
    <div className="py-10 sm:py-14">
      <Container>
        {/* Back button skeleton */}
        <div className="h-4 w-24 rounded bg-line/60 animate-pulse mb-6" />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery skeleton */}
          <div className="space-y-3">
            <div className="aspect-[4/5] w-full rounded-card bg-line/50 animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square w-16 rounded bg-line/50 animate-pulse" />
              ))}
            </div>
          </div>

          {/* Product info skeleton */}
          <div className="flex flex-col gap-4 pt-2">
            {/* Category eyebrow */}
            <div className="h-3 w-20 rounded bg-line/50 animate-pulse" />
            {/* Title */}
            <div className="space-y-2">
              <div className="h-8 w-3/4 rounded bg-line/60 animate-pulse" />
              <div className="h-8 w-1/2 rounded bg-line/40 animate-pulse" />
            </div>
            {/* Stars */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-4 h-4 rounded bg-zari/30 animate-pulse" />
                ))}
              </div>
              <div className="h-3 w-24 rounded bg-line/50 animate-pulse" />
            </div>
            {/* Price */}
            <div className="flex items-baseline gap-3 mt-2">
              <div className="h-8 w-28 rounded bg-line/60 animate-pulse" />
              <div className="h-5 w-20 rounded bg-line/40 animate-pulse" />
            </div>
            {/* Cashback */}
            <div className="h-4 w-40 rounded bg-zari/20 animate-pulse" />
            {/* In stock */}
            <div className="h-4 w-16 rounded bg-success/20 animate-pulse" />

            {/* Divider */}
            <div className="h-px w-full bg-line my-2" />

            {/* Size selector placeholder */}
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-line/50 animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-9 w-16 rounded-pill bg-line/40 animate-pulse" />
                ))}
              </div>
            </div>

            {/* Add to cart button */}
            <div className="h-12 w-full rounded-pill bg-ink/15 animate-pulse mt-2" />
            <div className="h-12 w-full rounded-pill bg-line/30 animate-pulse" />

            {/* Return policy */}
            <div className="h-16 w-full rounded bg-cream/50 animate-pulse mt-2" />
          </div>
        </div>

        {/* Reviews section skeleton */}
        <div className="h-px w-full bg-line my-10" />
        <div className="space-y-6">
          <div className="h-7 w-40 rounded bg-line/60 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 rounded-card border border-line p-5 space-y-4">
              <div className="h-16 w-16 rounded bg-line/40 animate-pulse mx-auto" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-2 w-3 rounded bg-line/50" />
                    <div className="flex-1 h-2 rounded-full bg-line/40 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-8 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-b border-line pb-6 space-y-2">
                  <div className="h-4 w-32 rounded bg-line/50 animate-pulse" />
                  <div className="h-3 w-full rounded bg-line/40 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-line/30 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
