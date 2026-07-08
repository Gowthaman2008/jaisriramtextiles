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
    <>
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
            <IconLink href="/search" label="Search" className="hidden lg:inline-flex"><Search size={19} /></IconLink>
            <WishlistButton count={wishlistCount} className="hidden lg:inline-flex" />
            <IconLink href="/account" label="Account" className="hidden lg:inline-flex"><User size={19} /></IconLink>
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
    </header>

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
            <div className="absolute inset-0 bg-ink/25 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
            
            <motion.nav
              className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-ivory bg-weave flex flex-col shadow-lift border-l border-zari/15 overflow-hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header inside drawer */}
              <div className="p-6 border-b border-line/50 flex items-center justify-between bg-cream/10">
                <div className="flex flex-col">
                  <span className="block font-display text-lg leading-none tracking-tight text-ink">
                    JAI SRI RAM
                  </span>
                  <span className="mt-1.5 block text-[9px] font-extrabold uppercase tracking-eyebrow text-zari-deep">
                    Textiles
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="rounded-full p-2 text-taupe hover:text-ink hover:bg-cream/60 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Promo Banner inside drawer */}
              <div className="bg-zari/5 px-6 py-2.5 text-center border-b border-line/45 flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-zari animate-pulse" />
                <p className="text-[10px] font-bold text-zari-deep tracking-widest uppercase">
                  Free shipping above ₹699
                </p>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7">
                {/* Categories */}
                <div className="space-y-3">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted px-2 block">
                    Categories
                  </span>
                  <motion.div
                    className="flex flex-col divide-y divide-line/35 mt-1"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.04
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
                            hidden: { opacity: 0, x: 12 },
                            show: { 
                              opacity: 1, 
                              x: 0,
                              transition: { type: "spring", stiffness: 100, damping: 15 }
                            }
                          }}
                        >
                          <Link
                            href={c.slug === "bulk-orders" ? "/bulk-orders" : c.slug === "all" ? "/shop" : `/shop/${c.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "group flex items-center justify-between py-3.5 px-2 text-sm font-medium transition-all duration-300 ease-silk",
                              isSale ? "text-danger" : isBulk ? "text-zari-deep" : "text-ink hover:text-zari-deep"
                            )}
                          >
                            <span className="relative flex items-center gap-2.5 transition-transform duration-300 ease-silk group-hover:translate-x-1.5">
                              {isSale && (
                                <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                              )}
                              {isBulk && (
                                <span className="h-1.5 w-1.5 rounded-full bg-zari animate-pulse" />
                              )}
                              <span className="tracking-wide">{c.label}</span>
                            </span>
                            <ChevronRight 
                              size={15} 
                              className={cn(
                                "text-muted/40 transform -translate-x-1 opacity-0 transition-all duration-300 ease-silk group-hover:opacity-100 group-hover:translate-x-0",
                                isSale ? "group-hover:text-danger" : isBulk ? "group-hover:text-zari-deep" : "group-hover:text-zari"
                              )} 
                            />
                          </Link>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Quick Links Section */}
                <div className="space-y-3 pt-6 border-t border-line/45">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted px-2 block">
                    Personal Space
                  </span>
                  <motion.div
                    className="flex flex-col gap-0.5 mt-1"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.04,
                          delayChildren: 0.15
                        }
                      }
                    }}
                  >
                    {[
                      { href: "/search", label: "Search Catalog", icon: <Search size={16} /> },
                      { href: "/account/wishlist", label: "My Wishlist", icon: <Heart size={16} />, count: wishlistCount },
                      { href: "/account", label: "My Profile", icon: <User size={16} /> },
                      { href: "/cart", label: "Shopping Cart", icon: <ShoppingBag size={16} />, count: cartCount }
                    ].map((link) => (
                      <motion.div
                        key={link.href}
                        variants={{
                          hidden: { opacity: 0, x: 12 },
                          show: { 
                            opacity: 1, 
                            x: 0,
                            transition: { type: "spring", stiffness: 100, damping: 15 }
                          }
                        }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="group flex items-center justify-between rounded-xl py-3 px-3.5 text-sm font-medium text-ink transition-all duration-300 hover:bg-cream/50 hover:text-zari-deep"
                        >
                          <span className="flex items-center gap-3 transition-transform duration-300 ease-silk group-hover:translate-x-1">
                            <span className="text-muted group-hover:text-zari transition-colors duration-300">
                              {link.icon}
                            </span>
                            <span className="tracking-wide text-ink/80 group-hover:text-ink">{link.label}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {link.count !== undefined && link.count > 0 && (
                              <span className="text-[9px] font-bold h-4 min-w-4 px-1 grid place-items-center rounded-full bg-zari text-ivory shadow-sm">
                                {link.count}
                              </span>
                            )}
                            <ChevronRight
                              size={14}
                              className="text-muted/40 opacity-0 transform -translate-x-1 transition-all duration-300 ease-silk group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-zari"
                            />
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>

              {/* Footer Area inside drawer */}
              <div className="p-6 bg-cream/15 border-t border-line/40 flex flex-col items-center justify-center">
                <div className="text-[9px] font-medium tracking-widest text-muted/65 text-center">
                  © 2026 {BUSINESS.name}. ALL RIGHTS RESERVED.
                </div>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function IconLink({ href, label, children, className }: { href: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn("relative rounded-full p-2 text-ink transition-colors hover:bg-cream", className)}
    >
      {children}
    </Link>
  );
}

function WishlistButton({ count, className }: { count: number; className?: string }) {
  return (
    <Link
      href="/account/wishlist"
      aria-label={`Wishlist, ${count} items`}
      className={cn("relative rounded-full p-2 text-ink transition-colors hover:bg-cream", className)}
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

