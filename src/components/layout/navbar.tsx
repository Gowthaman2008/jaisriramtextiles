"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, ShoppingBag, User, Menu, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navCategories = CATEGORIES.filter((c) => c.slug !== "all");

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-500 ease-silk",
        scrolled ? "glass border-b border-line/70 shadow-soft" : "bg-transparent"
      )}
    >
      <Container>
        <div className="flex h-[76px] items-center justify-between gap-6">
          {/* Logo — wordmark with woven-gold underline */}
          <Link href="/" className="group shrink-0" aria-label="JAI SRI RAM TEXTILES home">
            <span className="block font-display text-lg leading-none tracking-tight text-ink sm:text-xl">
              JAI SRI RAM
            </span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-eyebrow text-zari-deep">
              Textiles
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Categories">
            {navCategories.map((c) => (
              <Link
                key={c.slug}
                href={c.slug === "bulk-orders" ? "/bulk-orders" : `/shop/${c.slug}`}
                className="group relative text-sm font-medium text-ink/80 transition-colors hover:text-ink"
              >
                {c.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-zari transition-all duration-300 ease-silk group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <IconLink href="/search" label="Search"><Search size={19} /></IconLink>
            <IconLink href="/account/wishlist" label="Wishlist"><Heart size={19} /></IconLink>
            <IconLink href="/account" label="Account"><User size={19} /></IconLink>
            <CartButton count={0} />
            <button
              className="ml-1 rounded-full p-2 text-ink lg:hidden"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-[60] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink/30" onClick={() => setMobileOpen(false)} />
            <motion.nav
              className="absolute right-0 top-0 h-full w-[80%] max-w-xs bg-ivory p-6 shadow-lift"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="font-display text-lg">Menu</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X size={22} />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {navCategories.map((c) => (
                  <Link
                    key={c.slug}
                    href={c.slug === "bulk-orders" ? "/bulk-orders" : `/shop/${c.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-medium text-ink transition hover:bg-cream"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative rounded-full p-2 text-ink transition-colors hover:bg-cream"
    >
      {children}
    </Link>
  );
}

function CartButton({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} items`}
      className="relative rounded-full p-2 text-ink transition-colors hover:bg-cream"
    >
      <ShoppingBag size={19} />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-zari px-1 text-[10px] font-bold text-ivory"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
