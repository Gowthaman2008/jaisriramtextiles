import { Container } from "@/components/ui/container";

export default function CartLoading() {
  return (
    <div className="py-10 sm:py-14 min-h-screen">
      <Container>
        <div className="h-8 w-24 rounded bg-line/50 animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 rounded-card border border-line p-4 animate-pulse">
                <div className="w-20 h-20 rounded bg-line/40 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-2/3 rounded bg-line/50" />
                  <div className="h-3 w-1/3 rounded bg-line/30" />
                  <div className="h-4 w-20 rounded bg-line/40" />
                </div>
                <div className="h-5 w-16 rounded bg-line/40" />
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="rounded-card border border-line p-6 space-y-4 h-fit animate-pulse">
            <div className="h-6 w-36 rounded bg-line/50" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 rounded bg-line/40" />
                  <div className="h-4 w-16 rounded bg-line/40" />
                </div>
              ))}
            </div>
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
