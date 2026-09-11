"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-modal-provider";
import type { Product } from "@/lib/types";

interface BulkProductGridProps {
  products: Product[];
}

export function BulkProductGrid({ products }: BulkProductGridProps) {
  const { user, requireAuth } = useAuth();

  const handleProductClick = (e: React.MouseEvent, product: Product) => {
    if (!user) {
      e.preventDefault();
      requireAuth({
        title: "Sign In to View Product",
        subtitle: `Please sign in or create an account to view ${product.name} and explore wholesale details.`,
        nextUrl: `/product/${product.slug}`,
        onSuccess: () => {
          window.location.href = `/product/${product.slug}`;
        },
      });
    }
  };

  const filteredProducts = products.filter(
    (p) => p.category !== "jute-bags" && p.categoryLabel?.toLowerCase() !== "jute bags"
  );

  if (filteredProducts.length === 0) return null;

  return (
    <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
      {filteredProducts.map((product) => {
        const sizes = product.variants
          ?.map((v) => v.size)
          .filter((s): s is string => !!s)
          .filter((s, i, arr) => arr.indexOf(s) === i);

        return (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            onClick={(e) => handleProductClick(e, product)}
            className="group rounded-card border border-line bg-white overflow-hidden shadow-soft hover:shadow-lift transition-shadow block"
          >
            {/* Product Image */}
            <div className="relative aspect-square bg-cream overflow-hidden">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 280px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-taupe text-xs">
                  No image
                </div>
              )}
              {product.categoryLabel && (
                <span className="absolute top-2 left-2 bg-ink/80 text-ivory text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded">
                  {product.categoryLabel}
                </span>
              )}
            </div>

            {/* Product Info */}
            <div className="p-3 sm:p-4 space-y-1.5">
              <h3 className="text-sm font-bold text-ink leading-snug line-clamp-2 group-hover:text-zari-deep transition-colors">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-xs text-taupe leading-relaxed line-clamp-2">
                  {product.description}
                </p>
              )}

              {sizes && sizes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {sizes.map((size) => (
                    <span
                      key={size}
                      className="inline-block text-[10px] font-semibold text-taupe bg-cream border border-line rounded px-1.5 py-0.5"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
