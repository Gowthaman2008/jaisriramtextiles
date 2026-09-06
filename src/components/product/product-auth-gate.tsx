"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-modal-provider";
import { Lock, Sparkles, LogIn } from "lucide-react";

export function ProductAuthGate({ slug, productName }: { slug: string; productName: string }) {
  const { user, loading, requireAuth } = useAuth();
  const [hasPrompted, setHasPrompted] = useState(false);

  useEffect(() => {
    if (!loading && !user && !hasPrompted) {
      setHasPrompted(true);
      requireAuth({
        title: "Sign In to View Product",
        subtitle: `Please sign in or create an account to view ${productName}, check fabric specifications, and order online.`,
        nextUrl: `/product/${slug}`,
        onSuccess: () => {
          // Unlocked
        },
      });
    }
  }, [user, loading, hasPrompted, requireAuth, slug, productName]);

  if (loading || user) {
    return null;
  }

  return (
    <div className="my-6 p-5 rounded-2xl bg-gradient-to-r from-cream via-ivory to-cream border border-zari/40 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-zari/20 text-zari-deep shrink-0 mt-0.5">
          <Lock size={20} />
        </div>
        <div>
          <h4 className="font-display text-sm font-bold text-ink flex items-center gap-1.5">
            <Sparkles size={14} className="text-zari" />
            Member Access Required
          </h4>
          <p className="text-xs text-taupe mt-0.5 leading-relaxed">
            Please sign in to order <strong className="text-ink font-semibold">{productName}</strong>, apply cashback, and claim first-order discounts.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => {
            requireAuth({
              title: "Sign In to View Product",
              subtitle: `Please sign in or create an account to view ${productName}.`,
              nextUrl: `/product/${slug}`,
            });
          }}
          className="flex-1 sm:flex-initial px-4 py-2.5 bg-ink hover:bg-zari text-ivory text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <LogIn size={14} />
          <span>Sign In / Register</span>
        </button>

        <a
          href={`/sign-in?next=${encodeURIComponent(`/product/${slug}`)}`}
          className="px-3 py-2.5 border border-line bg-white hover:bg-cream text-ink text-xs font-bold rounded-xl transition-all shadow-xs text-center whitespace-nowrap"
        >
          Sign In Page &rarr;
        </a>
      </div>
    </div>
  );
}
