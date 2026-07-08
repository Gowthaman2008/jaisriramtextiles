import { Container } from "@/components/ui/container";

export default function SearchLoading() {
  return (
    <div className="py-10 sm:py-14 min-h-screen">
      <Container>
        <div className="h-8 w-32 rounded bg-line/50 animate-pulse mb-8" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[4/5] w-full rounded-card bg-line/50 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-line/40 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-line/50 animate-pulse" />
                <div className="h-3 w-24 rounded bg-line/30 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
