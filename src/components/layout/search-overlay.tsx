"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  X,
  Loader2,
  ShoppingBag,
  Mic,
  MicOff,
  TrendingUp,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Package,
  Gift,
  Wallet,
  Headphones,
  Layers,
  Factory,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-modal-provider";

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  price_paise: number;
  product_images: { url: string; sort_order: number }[];
  matchedVariant?: string;
  categories?: { name: string; slug: string } | null;
  description?: string;
};

type StorePageOption = {
  title: string;
  description: string;
  href: string;
  badge: string;
  icon: React.ReactNode;
  keywords: string[];
};

const STORE_OPTIONS: StorePageOption[] = [
  {
    title: "Bulk & Wholesale Orders",
    description: "Direct loom wholesale pricing for weddings, temples, and corporate orders",
    href: "/bulk-orders",
    badge: "Special Service",
    icon: <Factory className="w-5 h-5 text-zari-deep" />,
    keywords: ["bulk", "bulk orders", "wholesale", "custom", "wedding order", "temple", "distributor", "factory"],
  },
  {
    title: "Claim ₹100 Gift Card",
    description: "Submit 5-star review screenshots from Amazon/Flipkart to receive instant ₹100 reward",
    href: "/claim-giftcard",
    badge: "Reward",
    icon: <Gift className="w-5 h-5 text-zari-deep" />,
    keywords: ["giftcard", "gift card", "gift-card", "voucher", "reward", "claim", "100", "review", "review reward"],
  },
  {
    title: "Cashback Wallet",
    description: "Check your active cashback balance and redeem up to 20% on future orders",
    href: "/account?tab=wallet",
    badge: "Wallet",
    icon: <Wallet className="w-5 h-5 text-zari-deep" />,
    keywords: ["wallet", "cashback", "balance", "credit", "money", "wallet points"],
  },
  {
    title: "Track My Orders",
    description: "Live courier tracking, order status, and dispatch details",
    href: "/account?tab=orders",
    badge: "Orders",
    icon: <Package className="w-5 h-5 text-zari-deep" />,
    keywords: ["track", "order", "orders", "my orders", "status", "courier", "awb", "tracking", "delivery status"],
  },
  {
    title: "Customer Support Desk",
    description: "Open a priority support ticket with 24-hour resolution window",
    href: "/account?tab=support",
    badge: "Support",
    icon: <Headphones className="w-5 h-5 text-zari-deep" />,
    keywords: ["support", "help", "contact", "phone", "email", "ticket", "issue", "complaint", "customer care"],
  },
  {
    title: "White Dhotis / Veshtis",
    description: "Pure white wedding and temple border dhotis in single & double sizes",
    href: "/shop/white-dhoti",
    badge: "Collection",
    icon: <Layers className="w-5 h-5 text-zari-deep" />,
    keywords: ["white dhoti", "white veshti", "wedding dhoti", "panchakacham", "single", "double"],
  },
  {
    title: "Colour Dhotis",
    description: "Traditional Balaji & festive colour dhotis with rich gold zari borders",
    href: "/shop/colour-dhoti",
    badge: "Collection",
    icon: <Layers className="w-5 h-5 text-zari-deep" />,
    keywords: ["colour dhoti", "color dhoti", "balaji dhoti", "colour veshti"],
  },
  {
    title: "Handloom Cotton Towels",
    description: "High-density water absorbent pure cotton towels and pooja angavastrams",
    href: "/shop/towels",
    badge: "Collection",
    icon: <Layers className="w-5 h-5 text-zari-deep" />,
    keywords: ["towel", "towels", "thundu", "angavastram", "bath towel", "pooja towel"],
  },
  {
    title: "Cotton Scarfs & Shawls",
    description: "Featherlight daily & festive wear breathable cotton scarfs",
    href: "/shop/scarfs",
    badge: "Collection",
    icon: <Layers className="w-5 h-5 text-zari-deep" />,
    keywords: ["scarf", "scarfs", "scarves", "shawl", "angavastram"],
  },
  {
    title: "Eco-Friendly Jute Bags",
    description: "Durable sustainable shopping, pooja, and bulk gift bags",
    href: "/shop/jute-bags",
    badge: "Collection",
    icon: <Layers className="w-5 h-5 text-zari-deep" />,
    keywords: ["jute", "bag", "jute bag", "bags", "canvas", "tote"],
  },
];

const POPULAR_SEARCHES = [
  "White Dhoti",
  "Gold Border Veshti",
  "Cotton Towels",
  "Colour Dhoti",
  "Temple Scarfs",
  "Jute Bags",
  "Bulk Orders",
  "₹100 Gift Card",
];

// Normalized typo & synonym mapping for textiles
const SYNONYMS: Record<string, string> = {
  dhati: "dhoti",
  dhotie: "dhoti",
  dhotis: "dhoti",
  dothi: "dhoti",
  dothis: "dhoti",
  dhoty: "dhoti",
  dhottee: "dhoti",
  vesthi: "veshti",
  vesti: "veshti",
  vetti: "veshti",
  vasti: "veshti",
  veshtis: "veshti",
  vesthis: "veshti",
  thundu: "towel",
  tund: "towel",
  thund: "towel",
  towl: "towel",
  towls: "towel",
  towal: "towel",
  angavastram: "towel",
  scaf: "scarf",
  scarfs: "scarf",
  scarves: "scarf",
  skarf: "scarf",
  whiet: "white",
  wite: "white",
  colur: "colour",
  color: "colour",
  clour: "colour",
  coton: "cotton",
  cotten: "cotton",
  balajee: "balaji",
  balaj: "balaji",
  zarri: "zari",
  jari: "zari",
  bluk: "bulk",
  wholsale: "wholesale",
  wholsl: "wholesale",
  giftcard: "gift card",
  walet: "wallet",
  cashbac: "cashback",
  cshback: "cashback",
  cancle: "cancel",
  retun: "return",
  shippng: "shipping",
  ordr: "order",
  ordrs: "order",
};

function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1, // deletion
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i - 1] + 1 // substitution
        );
      }
    }
  }
  return matrix[bn][an];
}

function normalizeQuery(raw: string): { normalized: string; suggestion: string | null } {
  const words = raw.toLowerCase().trim().split(/\s+/);
  let hasCorrection = false;
  const correctedWords = words.map((w) => {
    if (SYNONYMS[w]) {
      hasCorrection = true;
      return SYNONYMS[w];
    }
    // Check close typos with key terms
    const targets = ["dhoti", "veshti", "towel", "scarf", "cotton", "white", "colour", "bulk", "wallet", "giftcard", "orders"];
    for (const t of targets) {
      if (w.length >= 4 && levenshteinDistance(w, t) === 1) {
        hasCorrection = true;
        return t;
      }
    }
    return w;
  });

  const normalized = correctedWords.join(" ");
  return {
    normalized,
    suggestion: hasCorrection && normalized !== raw.toLowerCase().trim() ? normalized : null,
  };
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, requireAuth } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [matchedOptions, setMatchedOptions] = useState<StorePageOption[]>([]);
  const [autoSuggestion, setAutoSuggestion] = useState<string | null>(null);
  const [allProductsCache, setAllProductsCache] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Pre-fetch all active catalog products into memory cache when overlay opens for instantaneous fuzzy matching
  useEffect(() => {
    async function loadCatalog() {
      if (allProductsCache.length > 0) return;
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("products")
          .select("id, slug, name, price_paise, description, categories(slug, name), product_images(url, sort_order)")
          .eq("is_active", true);
        if (data) {
          setAllProductsCache(data);
        }
      } catch (e) {
        console.warn("Could not pre-cache products for search:", e);
      }
    }
    if (open) {
      loadCatalog();
    }
  }, [open, allProductsCache.length]);

  // Speech Recognition initialization
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setQuery(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!recognitionRef.current) {
      alert("Voice search is not supported on this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Voice search error:", err);
      }
    }
  };

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery("");
      setResults([]);
      setMatchedOptions([]);
      setAutoSuggestion(null);
      setSearched(false);
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  }, [open, isListening]);

  // Smart Live Search with Fuzzy Typo Tolerance & Store Options Matching
  useEffect(() => {
    const rawTerm = query.trim().toLowerCase();
    if (!rawTerm) {
      setResults([]);
      setMatchedOptions([]);
      setAutoSuggestion(null);
      setSearched(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const { normalized, suggestion } = normalizeQuery(rawTerm);
      setAutoSuggestion(suggestion);

      // 1. Match Store Page Options & Features
      const matchedPages = STORE_OPTIONS.filter((opt) => {
        const optTitle = opt.title.toLowerCase();
        const optDesc = opt.description.toLowerCase();
        const fullOptText = `${optTitle} ${optDesc} ${opt.keywords.join(" ")}`;

        return (
          fullOptText.includes(rawTerm) ||
          fullOptText.includes(normalized) ||
          opt.keywords.some((k) => {
            return (
              rawTerm.includes(k) ||
              k.includes(rawTerm) ||
              normalized.includes(k) ||
              k.includes(normalized) ||
              (rawTerm.length >= 4 && levenshteinDistance(rawTerm, k) <= 2)
            );
          })
        );
      });
      setMatchedOptions(matchedPages.slice(0, 3));

      // 2. Match Products with Fuzzy Logic + Supabase fallback
      let matchedProducts: SearchResult[] = [];

      if (allProductsCache.length > 0) {
        // High-speed client-side fuzzy ranker
        const queryWords = normalized.split(/\s+/).filter(Boolean);

        const scored = allProductsCache.map((p) => {
          const name = (p.name || "").toLowerCase();
          const catName = (p.categories?.name || "").toLowerCase();
          const desc = (p.description || "").toLowerCase();
          const pWords = `${name} ${catName} ${desc}`.split(/\s+/);

          let score = 0;

          // Exact full phrase match
          if (name.includes(rawTerm) || name.includes(normalized)) score += 100;
          if (catName.includes(rawTerm) || catName.includes(normalized)) score += 60;
          if (desc.includes(rawTerm) || desc.includes(normalized)) score += 30;

          // Word-by-word fuzzy comparison
          for (const qw of queryWords) {
            if (name.includes(qw)) score += 40;
            else if (catName.includes(qw)) score += 25;
            else {
              for (const pw of pWords) {
                if (pw.length >= 4 && qw.length >= 4 && levenshteinDistance(qw, pw) <= 1) {
                  score += 35;
                  break;
                } else if (pw.length >= 5 && qw.length >= 5 && levenshteinDistance(qw, pw) <= 2) {
                  score += 20;
                  break;
                }
              }
            }
          }

          return { product: p, score };
        });

        matchedProducts = scored
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map((item) => item.product);
      }

      // If client cache didn't match, run Supabase search
      if (matchedProducts.length === 0) {
        try {
          const supabase = createClient();
          const searchTokens = Array.from(new Set([rawTerm, normalized, ...normalized.split(/\s+/)])).filter(
            (t) => t.length >= 3
          );

          const orFilter = searchTokens.map((t) => `name.ilike.%${t}%`).join(",");

          const { data } = await supabase
            .from("products")
            .select("id, slug, name, price_paise, product_images(url, sort_order)")
            .eq("is_active", true)
            .or(orFilter || `name.ilike.%${normalized}%`)
            .limit(8);

          matchedProducts = data || [];
        } catch (dbErr) {
          console.error("Database search fallback error:", dbErr);
        }
      }

      setResults(matchedProducts);
      setLoading(false);
      setSearched(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, allProductsCache]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-ink/55 backdrop-blur-md flex items-start justify-center p-3 sm:p-4 pt-16 sm:pt-24"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-lift overflow-hidden border border-line/60 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            {/* Search Header Bar */}
            <div className="flex items-center gap-3 p-3.5 sm:p-4 border-b border-line bg-cream/20 shrink-0">
              <Search className="w-5 h-5 text-ink/75 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dhotis, towels, bulk orders, gift card..."
                className="flex-1 min-w-0 text-sm sm:text-base outline-none placeholder-taupe/60 text-ink bg-transparent"
              />

              {loading && <Loader2 className="w-4 h-4 text-zari-deep animate-spin shrink-0" />}

              {/* Action Tools: Voice / Clear / Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  title={isListening ? "Listening... Click to stop" : "Search with voice"}
                  className={`p-1.5 rounded-full transition-all ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-ink/65 hover:text-zari-deep hover:bg-cream cursor-pointer"
                  }`}
                >
                  {isListening ? <MicOff size={17} /> : <Mic size={17} />}
                </button>

                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear query"
                    className="p-1.5 rounded-full text-taupe hover:text-ink hover:bg-cream transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}

                <button
                  onClick={onClose}
                  aria-label="Close search"
                  className="p-1.5 rounded-full text-taupe hover:text-ink hover:bg-cream transition-colors ml-1 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Spelling auto-correction banner */}
            {autoSuggestion && (
              <div className="px-5 py-2.5 bg-zari/10 border-b border-zari/20 text-xs text-ink flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zari-deep" />
                  Showing results for{" "}
                  <strong className="font-bold text-zari-deep underline decoration-zari/60">
                    &ldquo;{autoSuggestion}&rdquo;
                  </strong>{" "}
                  instead of &ldquo;{query}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => setQuery(autoSuggestion)}
                  className="font-bold text-[11px] text-zari-deep hover:underline cursor-pointer"
                >
                  Use &ldquo;{autoSuggestion}&rdquo;
                </button>
              </div>
            )}

            {/* Popular Searches Chips when empty */}
            {!query.trim() && (
              <div className="px-5 py-4 border-b border-line/40 bg-cream/10 shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-taupe uppercase tracking-wider mb-2.5">
                  <TrendingUp className="w-3.5 h-3.5 text-zari-deep" />
                  <span>Popular Searches & Categories</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((item) => (
                    <button
                      key={item}
                      onClick={() => setQuery(item)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-line hover:border-zari hover:text-zari-deep transition-all shadow-xs cursor-pointer"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results Container */}
            <div className="flex-1 overflow-y-auto" data-lenis-prevent>
              {!query.trim() ? (
                <div className="p-8 text-center text-sm text-taupe space-y-1">
                  <p className="font-medium text-ink">Discover our Handloom Collections</p>
                  <p className="text-xs text-taupe">
                    Search for white dhotis, bath towels, bulk wholesale orders, or ₹100 gift cards.
                  </p>
                </div>
              ) : results.length === 0 && matchedOptions.length === 0 && searched && !loading ? (
                <div className="p-10 text-center text-sm text-taupe space-y-2">
                  <p className="font-medium text-ink">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-xs text-taupe">
                    Try searching for &ldquo;dhoti&rdquo;, &ldquo;veshti&rdquo;, &ldquo;towel&rdquo;, or &ldquo;bulk orders&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="p-2 sm:p-3 space-y-4">
                  {/* 1. Matched Store Pages & Navigation Options */}
                  {matchedOptions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zari-deep flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Store Pages & Features</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {matchedOptions.map((opt, i) => (
                          <Link
                            key={i}
                            href={opt.href}
                            onClick={onClose}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-cream/35 border border-zari/25 hover:border-zari hover:bg-cream/60 transition group cursor-pointer shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-white border border-line grid place-items-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                {opt.icon}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-ink group-hover:text-zari-deep transition-colors">
                                    {opt.title}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-zari/15 text-zari-deep text-[9px] font-bold uppercase">
                                    {opt.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-taupe truncate mt-0.5">{opt.description}</p>
                              </div>
                            </div>
                            <ExternalLink size={14} className="text-taupe group-hover:text-zari-deep shrink-0 mr-1" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Matched Products */}
                  {results.length > 0 && (
                    <div className="space-y-1.5">
                      {matchedOptions.length > 0 && (
                        <div className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-taupe">
                          Matching Products ({results.length})
                        </div>
                      )}
                      <div className="divide-y divide-line/40 rounded-2xl bg-white border border-line/50 overflow-hidden">
                        {results.map((p) => {
                          const image = [...(p.product_images || [])].sort(
                            (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                          )[0]?.url;
                          return (
                            <Link
                              key={p.id}
                              href={`/product/${p.slug}`}
                              onClick={(e) => {
                                onClose();
                                if (!user) {
                                  e.preventDefault();
                                  requireAuth({
                                    title: "Sign In to View Product",
                                    subtitle: `Please sign in to view ${p.name}.`,
                                    nextUrl: `/product/${p.slug}`,
                                    onSuccess: () => {
                                      window.location.href = `/product/${p.slug}`;
                                    },
                                  });
                                }
                              }}
                              className="group flex items-center justify-between gap-3 p-3 sm:p-3.5 hover:bg-cream/40 transition-colors"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-cream border border-line shrink-0 shadow-xs">
                                  {image ? (
                                    <Image
                                      src={image}
                                      alt={p.name}
                                      fill
                                      sizes="56px"
                                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full grid place-items-center text-taupe">
                                      <ShoppingBag size={18} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-ink truncate group-hover:text-zari-deep transition-colors">
                                    {p.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-zari-deep font-bold">
                                      {formatINR(p.price_paise, true)}
                                    </p>
                                    {p.matchedVariant && (
                                      <span className="text-[10px] font-bold text-taupe bg-cream px-1.5 py-0.5 rounded-md">
                                        {p.matchedVariant}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <ChevronRight className="w-4 h-4 text-taupe group-hover:text-zari group-hover:translate-x-0.5 transition-all shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
