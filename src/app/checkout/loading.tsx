import { Container } from "@/components/ui/container";

export default function CheckoutLoading() {
  return (
    <div className="py-10 sm:py-14 min-h-screen">
      <Container>
        <div className="h-8 w-28 rounded bg-line/50 animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Form skeleton */}
          <div className="lg:col-span-3 space-y-6">
            {[1, 2].map((section) => (
              <div key={section} className="rounded-card border border-line p-6 space-y-4 animate-pulse">
                <div className="h-5 w-32 rounded bg-line/50" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((f) => (
                    <div key={f} className="space-y-1.5">
                      <div className="h-3 w-20 rounded bg-line/40" />
                      <div className="h-10 w-full rounded bg-line/30" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary skeleton */}
          <div className="lg:col-span-2 rounded-card border border-line p-6 space-y-4 h-fit animate-pulse">
            <div className="h-6 w-36 rounded bg-line/50" />
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-14 h-14 rounded bg-line/40" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-line/40" />
                  <div className="h-3 w-1/3 rounded bg-line/30" />
                </div>
                <div className="h-4 w-14 rounded bg-line/40" />
              </div>
            ))}
            <div className="h-px bg-line" />
            <div className="flex justify-between">
              <div className="h-5 w-16 rounded bg-line/50" />
              <div className="h-5 w-20 rounded bg-line/50" />
            </div>
            <div className="h-12 w-full rounded-pill bg-ink/15" />
          </div>
        </div>
      </Container>
    </div>
  );
}
