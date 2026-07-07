"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Heart, ShoppingBag, User, Menu, X, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { CATEGORIES, BUSINESS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";

const navCategories = CATEGORIES;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { cart } = useCart();
  const { wishlist } = useWishlist();

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlist.length;

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
                href={c.slug === "bulk-orders" ? "/bulk-orders" : c.slug === "all" ? "/shop" : `/shop/${c.slug}`}
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
            <WishlistButton count={wishlistCount} />
            <IconLink href="/account" label="Account"><User size={19} /></IconLink>
            <CartButton count={cartCount} />
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-full p-2 text-ink transition-colors hover:bg-cream lg:hidden"
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
            {/* Glassmorphism backdrop */}
            <div className="absolute inset-0 bg-ink/40 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
            
            <motion.nav
              className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-ivory flex flex-col shadow-lift border-l border-zari/20 overflow-hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header inside drawer */}
              <div className="p-6 border-b border-line flex items-center justify-between bg-cream/25">
                <div>
                  <span className="block font-display text-base leading-none tracking-tight text-ink">
                    JAI SRI RAM
                  </span>
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-eyebrow text-zari-deep">
                    Textiles
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="rounded-full p-2 text-ink hover:bg-cream/70 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Promo Banner inside drawer */}
              <div className="bg-zari/10 border-b border-zari/20 px-6 py-2">
                <p className="text-[10px] font-bold text-zari-deep tracking-wider uppercase text-center">
                  ✨ Free shipping above ₹699
                </p>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
                {/* Categories */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-taupe px-3">
                    Categories
                  </span>
                  <motion.div
                    className="flex flex-col gap-1.5 mt-2"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.05
                        }
                      }
                    }}
                  >
                    {navCategories.map((c) => {
                      const isSale = c.slug === "sale";
                      const isBulk = c.slug === "bulk-orders";
                      
                      return (
                        <motion.div
                          key={c.slug}
                          variants={{
                            hidden: { opacity: 0, x: 15 },
                            show: { opacity: 1, x: 0 }
                          }}
                        >
                          <Link
                            href={c.slug === "bulk-orders" ? "/bulk-orders" : c.slug === "all" ? "/shop" : `/shop/${c.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 group border border-transparent",
                              isSale
                                ? "bg-danger/5 border-danger/10 text-danger hover:bg-danger/10"
                                : isBulk
                                ? "bg-zari/5 border-zari/15 text-zari-deep hover:bg-zari/10"
                                : "text-ink hover:bg-cream/55 hover:border-line/45"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {isSale && <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />}
                              {c.label}
                            </span>
                            <ChevronRight size={15} className={cn(
                              "text-muted group-hover:text-ink transition-transform duration-200 group-hover:translate-x-1",
                              isSale && "text-danger/70 group-hover:text-danger",
                              isBulk && "text-zari group-hover:text-zari-deep"
                            )} />
                          </Link>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Quick links grid */}
                <div className="space-y-2 pt-4 border-t border-line/60">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-taupe px-3">
                    Quick Links
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <QuickLink href="/account" label="My Profile" icon={<User size={16} className="text-zari-deep" />} onClick={() => setMobileOpen(false)} />
                    <QuickLink href="/cart" label="Shopping Cart" icon={<ShoppingBag size={16} className="text-zari-deep" />} count={cartCount} onClick={() => setMobileOpen(false)} />
                    <QuickLink href="/account/wishlist" label="My Wishlist" icon={<Heart size={16} className="text-zari-deep" />} count={wishlistCount} onClick={() => setMobileOpen(false)} />
                    <QuickLink href="/search" label="Search Catalog" icon={<Search size={16} className="text-zari-deep" />} onClick={() => setMobileOpen(false)} />
                  </div>
                </div>
              </div>

              {/* Footer Area inside drawer */}
              <div className="p-6 bg-cream/25 border-t border-line space-y-4">
                <div className="space-y-1 text-xs text-taupe">
                  <p className="font-bold text-ink text-[10px] uppercase tracking-wider">Contact Details</p>
                  <p className="flex items-center gap-1.5 mt-1.5 font-medium select-all">
                    📧 {BUSINESS.email}
                  </p>
                  <p className="text-[10.5px] leading-relaxed mt-1 text-taupe/90">
                    📍 {BUSINESS.address.line1}, {BUSINESS.address.city}, {BUSINESS.address.state} - {BUSINESS.address.pincode}
                  </p>
                </div>
                <div className="text-[9px] text-muted text-center pt-2 border-t border-line/40">
                  © 2026 {BUSINESS.name}. All Rights Reserved.
                </div>
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

function WishlistButton({ count }: { count: number }) {
  return (
    <Link
      href="/account/wishlist"
      aria-label={`Wishlist, ${count} items`}
      className="relative rounded-full p-2 text-ink transition-colors hover:bg-cream"
    >
      <Heart size={19} />
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

function QuickLink({ href, label, icon, count, onClick }: { href: string; label: string; icon: React.ReactNode; count?: number; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-line/60 bg-white hover:bg-cream/40 transition-all duration-200 group text-left shadow-soft w-full"
    >
      <div className="flex items-center justify-between w-full">
        <span className="p-1.5 rounded-lg bg-cream/75 text-ink transition-colors group-hover:bg-zari/15">{icon}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[9px] font-bold h-4 min-w-4 px-1 grid place-items-center rounded-full bg-zari text-ivory shadow-sm">
            {count}
          </span>
        )}
      </div>
      <span className="text-xs font-bold text-ink/95 mt-1 tracking-tight group-hover:text-zari-deep transition-colors">{label}</span>
    </Link>
  );
}
