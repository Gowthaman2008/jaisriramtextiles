"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "group relative inline-flex items-center justify-center gap-2 font-sans font-semibold transition-all duration-300 ease-silk focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-ivory hover:shadow-lift hover:-translate-y-0.5 active:translate-y-0",
        gold:
          "bg-zari text-ivory hover:bg-zari-deep hover:shadow-glow hover:-translate-y-0.5",
        outline:
          "border border-line bg-transparent text-ink hover:border-zari hover:text-zari-deep",
        ghost: "bg-transparent text-ink hover:bg-cream",
      },
      size: {
        sm: "h-9 px-4 text-sm rounded-pill",
        md: "h-11 px-6 text-sm rounded-pill",
        lg: "h-[52px] px-8 text-base rounded-pill",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type BaseProps = VariantProps<typeof button> & { className?: string; children: React.ReactNode };
type AsButton = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = BaseProps & { href: string };

export function Button(props: AsButton | AsLink) {
  const { className, variant, size, children } = props;
  const classes = cn(button({ variant, size }), className);

  // Subtle silk sheen that sweeps across on hover — a quiet micro-interaction.
  const sheen = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-silk group-hover:translate-x-full"
    />
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {sheen}
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </Link>
    );
  }

  const { href: _h, ...rest } = props as AsButton;
  return (
    <button className={classes} {...rest}>
      {sheen}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
