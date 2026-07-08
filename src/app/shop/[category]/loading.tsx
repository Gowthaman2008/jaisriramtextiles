import { Container } from "@/components/ui/container";

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/5] w-full rounded-card bg-line/50 animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-line/40 animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-line/50 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-line/40 animate-pulse" />
        <div className="h-3 w-24 rounded bg-line/30 animate-pulse" />
      </div>
    </div>
  );
}

export default function CategoryLoading() {
  return (
    <div className="py-14 sm:py-20">
      <Container>
        {/* Heading skeleton */}
        <div className="space-y-3 mb-12">
          <div className="h-3 w-16 rounded bg-zari/30 animate-pulse" />
          <div className="h-10 w-40 rounded bg-line/50 animate-pulse" />
          <div className="h-4 w-72 rounded bg-line/30 animate-pulse" />
        </div>

        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </Container>
    </div>
  );
}
