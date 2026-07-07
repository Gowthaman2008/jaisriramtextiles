import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center py-20">
      <Container className="max-w-[560px] text-center">
        <p className="font-display text-7xl text-zari/30">404</p>
        <h1 className="mt-4 font-display text-3xl text-ink">Page not found</h1>
        <p className="mt-3 text-sm text-taupe">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/shop" variant="gold" size="lg">
            Browse products
          </Button>
          <Button href="/" variant="outline" size="lg">
            Go home
          </Button>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-taupe">
          {[
            ["White Dhoti", "/shop/white-dhoti"],
            ["Towels", "/shop/towels"],
            ["Scarfs", "/shop/scarfs"],
            ["Jute Bags", "/shop/jute-bags"],
            ["Bulk Orders", "/bulk-orders"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-zari-deep hover:underline underline-offset-2 transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
