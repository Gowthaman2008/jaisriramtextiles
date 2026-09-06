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
  Camera,
  Mic,
  MicOff,
  ScanLine,
  Sparkles,
  TrendingUp,
  ChevronRight,
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
};

const POPULAR_SEARCHES = [
  "White Dhoti",
  "Gold Border Veshti",
  "Cotton Towels",
  "Colour Dhoti",
  "Temple Scarfs",
  "Jute Bags",
  "Bulk Orders",
];

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, requireAuth } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported in browser
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

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

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

  // Reset and focus whenever the overlay opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery("");
      setResults([]);
      setSearched(false);
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  }, [open, isListening]);

  // Debounced live search as the user types
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const term = `%${query.trim()}%`;

      const [byName, byVariant] = await Promise.all([
        supabase
          .from("products")
          .select("id, slug, name, price_paise, product_images(url, sort_order)")
          .eq("is_active", true)
          .ilike("name", term)
          .limit(8),
        supabase
          .from("products")
          .select(
            "id, slug, name, price_paise, product_images(url, sort_order), product_variants!inner(size, color)"
          )
          .eq("is_active", true)
          .or(`size.ilike.${term},color.ilike.${term}`, { foreignTable: "product_variants" })
          .limit(8),
      ]);

      const merged = new Map<string, SearchResult>();
      (byName.data || []).forEach((p: any) => merged.set(p.id, p));
      (byVariant.data || []).forEach((p: any) => {
        if (merged.has(p.id)) return;
        const v = p.product_variants?.[0];
        const matchedVariant = v ? [v.size, v.color].filter(Boolean).join(" / ") : undefined;
        merged.set(p.id, { ...p, matchedVariant });
      });

      setResults(Array.from(merged.values()).slice(0, 8));
      setLoading(false);
      setSearched(true);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on Escape
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
            className="w-full max-w-2xl bg-white rounded-3xl shadow-lift overflow-hidden border border-line/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Amazon-Style Search Header */}
            <div className="flex items-center gap-3 p-3.5 sm:p-4 border-b border-line bg-cream/20">
              <Search className="w-5 h-5 text-ink/75 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or ask a question (dhotis, towels, scarfs)..."
                className="flex-1 min-w-0 text-sm sm:text-base outline-none placeholder-taupe/60 text-ink bg-transparent"
              />

              {loading && <Loader2 className="w-4 h-4 text-zari-deep animate-spin shrink-0" />}

              {/* Action Tools: Voice / AI Lens / Clear / Close */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  title={isListening ? "Listening... Click to stop" : "Search with voice"}
                  className={`p-1.5 rounded-full transition-all ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "text-ink/65 hover:text-zari-deep hover:bg-cream"
                  }`}
                >
                  {isListening ? <MicOff size={17} /> : <Mic size={17} />}
                </button>

                {/* AI Camera / Lens */}
                <div
                  title="Visual AI Search"
                  className="p-1.5 rounded-full text-ink/65 hover:text-zari-deep hover:bg-cream transition-colors relative cursor-default hidden xs:block"
                >
                  <Camera size={17} />
                  <Sparkles className="w-2.5 h-2.5 text-zari absolute top-0.5 right-0.5" />
                </div>

                {/* QR / Barcode Scan */}
                <div
                  title="Scan Barcode"
                  className="p-1.5 rounded-full text-ink/65 hover:text-zari-deep hover:bg-cream transition-colors cursor-default hidden sm:block"
                >
                  <ScanLine size={17} />
                </div>

                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear query"
                    className="p-1.5 rounded-full text-taupe hover:text-ink hover:bg-cream transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}

                <button
                  onClick={onClose}
                  aria-label="Close search"
                  className="p-1.5 rounded-full text-taupe hover:text-ink hover:bg-cream transition-colors ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Popular Searches / Search Suggestions Chips */}
            {!query.trim() && (
              <div className="px-5 py-4 border-b border-line/40 bg-cream/10">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-taupe uppercase tracking-wider mb-2.5">
                  <TrendingUp className="w-3.5 h-3.5 text-zari-deep" />
                  <span>Popular Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((item) => (
                    <button
                      key={item}
                      onClick={() => setQuery(item)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-line hover:border-zari hover:text-zari-deep transition-all shadow-xs"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results Container */}
            <div className="max-h-[60vh] overflow-y-auto" data-lenis-prevent>
              {!query.trim() ? (
                <div className="p-8 text-center text-sm text-taupe">
                  Type any fabric, colour, or product name above to discover our collection.
                </div>
              ) : results.length === 0 && searched && !loading ? (
                <div className="p-10 text-center text-sm text-taupe">
                  No products found for &ldquo;{query}&rdquo;. Try searching for &ldquo;dhoti&rdquo;, &ldquo;veshti&rdquo;, or &ldquo;towel&rdquo;.
                </div>
              ) : (
                <div className="divide-y divide-line/40">
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
                        className="group flex items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-cream/40 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-cream border border-line shrink-0 shadow-xs">
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
                            <p className="text-sm font-semibold text-ink truncate group-hover:text-zari-deep transition-colors">
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
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
