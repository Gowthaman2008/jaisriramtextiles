import { Container } from "@/components/ui/container";

export default function AccountLoading() {
  return (
    <div className="py-10 sm:py-14 min-h-screen">
      <Container>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 pb-6 border-b border-line">
            <div className="w-16 h-16 rounded-full bg-line/50 animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-40 rounded bg-line/50 animate-pulse" />
              <div className="h-3 w-56 rounded bg-line/30 animate-pulse" />
            </div>
          </div>

          {/* Tab nav skeleton */}
          <div className="flex gap-2 border-b border-line pb-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-24 rounded-pill bg-line/40 animate-pulse" />
            ))}
          </div>

          {/* Content skeleton rows */}
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-card border border-line p-5 space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 rounded bg-line/50" />
                  <div className="h-5 w-20 rounded-pill bg-line/30" />
                </div>
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded bg-line/40" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-line/40" />
                    <div className="h-3 w-1/2 rounded bg-line/30" />
                    <div className="h-3 w-1/4 rounded bg-line/20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
