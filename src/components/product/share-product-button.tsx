"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Share2,
  X,
  Copy,
  Check,
  Smartphone,
  MessageCircle,
  ExternalLink,
  Send,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface ShareProductButtonProps {
  product: Product;
}

export function ShareProductButton({ product }: ShareProductButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !!navigator.share) {
      setCanNativeShare(true);
    }
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const getProductUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return `https://jaisriramtextiles.in/product/${product.slug}`;
  };

  const productUrl = getProductUrl();
  const priceDisplay = formatINR(product.pricePaise, true);
  const originalPriceDisplay = product.compareAtPaise
    ? formatINR(product.compareAtPaise, true)
    : null;

  // Build WhatsApp Share Text with emojis, product details, photo URL, and direct link
  const buildWhatsAppMessage = () => {
    const lines = [
      `🌟 *${product.name}*`,
      product.categoryLabel ? `🏷️ Category: *${product.categoryLabel}*` : "",
      `💰 Price: *${priceDisplay}*${originalPriceDisplay ? ` ~(${originalPriceDisplay})~` : ""}`,
      product.description ? `📝 ${product.description.slice(0, 140)}...` : "",
      `🌿 100% Pure Handloom Cotton | JAI SRI RAM TEXTILES`,
      "",
      product.image ? `📸 *Product Photo:*\n${product.image}` : "",
      "",
      `🔗 *View & Order Online:*\n${productUrl}`,
    ].filter(Boolean);

    return lines.join("\n");
  };

  const handleWhatsAppShare = () => {
    const message = buildWhatsAppMessage();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(productUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = productUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;

    setIsSharingImage(true);
    try {
      let shareData: ShareData = {
        title: product.name,
        text: `Check out ${product.name} (${priceDisplay}) at Jai Sri Ram Textiles`,
        url: productUrl,
      };

      // Try sharing with the actual image file on supported mobile devices
      if (product.image && navigator.canShare) {
        try {
          const res = await fetch(product.image);
          const blob = await res.blob();
          const file = new File([blob], `${product.slug}.jpg`, {
            type: blob.type || "image/jpeg",
          });
          if (navigator.canShare({ files: [file] })) {
            shareData = {
              title: product.name,
              text: `${product.name} (${priceDisplay})\n100% Pure Handloom Cotton\n${productUrl}`,
              files: [file],
            };
          }
        } catch (imgErr) {
          console.warn("Could not bundle image in native share:", imgErr);
        }
      }

      await navigator.share(shareData);
      setIsOpen(false);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Native share error:", err);
      }
    } finally {
      setIsSharingImage(false);
    }
  };

  const handleTelegramShare = () => {
    const text = `${product.name} (${priceDisplay}) - Jai Sri Ram Textiles\n${product.image || ""}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Share Button (Positioned next to Bulk Orders) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-white/90 hover:bg-cream px-3.5 py-1.5 text-xs font-semibold text-ink shadow-xs transition-all hover:border-zari hover:text-zari-deep active:scale-95 cursor-pointer"
        title="Share this product"
      >
        <Share2 size={14} className="text-zari-deep" />
        <span>Share</span>
      </button>

      {/* Share Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Dialog Container */}
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-2xl z-10 animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-cream/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zari/20 text-zari-deep">
                  <Share2 size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">Share Product</h3>
                  <p className="text-[11px] text-taupe">Share photos, details & links with friends</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-taupe hover:bg-cream hover:text-ink transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Product Preview Card */}
            <div className="p-5">
              <div className="flex gap-3.5 rounded-xl border border-line bg-cream/30 p-3 items-center">
                {product.image ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream border border-line">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-cream flex items-center justify-center text-taupe text-[10px]">
                    No Photo
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {product.categoryLabel && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zari-deep">
                      {product.categoryLabel}
                    </span>
                  )}
                  <h4 className="font-display text-xs font-bold text-ink truncate leading-tight mt-0.5">
                    {product.name}
                  </h4>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xs font-bold text-ink">{priceDisplay}</span>
                    {originalPriceDisplay && (
                      <span className="text-[11px] text-taupe line-through">
                        {originalPriceDisplay}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Share Destination Options */}
              <div className="mt-5 space-y-2.5">
                {/* 1. WhatsApp Button (Primary Highlight) */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-ink transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                      {/* WhatsApp Icon */}
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="fill-white stroke-none"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-ink group-hover:text-[#128C7E] transition-colors">
                        Share on WhatsApp
                      </div>
                      <div className="text-[11px] text-taupe">
                        Sends photo link, price & full product details
                      </div>
                    </div>
                  </div>
                  <ExternalLink size={15} className="text-taupe group-hover:text-[#128C7E]" />
                </button>

                {/* 2. Native Share (Device Share Sheet with Photos support) */}
                {canNativeShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    disabled={isSharingImage}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-cream/60 hover:bg-cream border border-line text-ink transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-ink text-ivory flex items-center justify-center shrink-0 shadow-xs">
                        <Smartphone size={18} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-ink group-hover:text-zari-deep transition-colors">
                          {isSharingImage ? "Preparing Photo..." : "More Apps & Social Media"}
                        </div>
                        <div className="text-[11px] text-taupe">
                          Share directly to Instagram, Telegram, SMS & more
                        </div>
                      </div>
                    </div>
                    <Share2 size={15} className="text-taupe group-hover:text-ink" />
                  </button>
                )}

                {/* 3. Telegram Option */}
                <button
                  type="button"
                  onClick={handleTelegramShare}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border border-[#229ED9]/30 text-ink transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Send size={16} className="-translate-x-0.5 translate-y-0.5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-ink group-hover:text-[#229ED9] transition-colors">
                        Share on Telegram
                      </div>
                      <div className="text-[11px] text-taupe">
                        Share product link and summary to Telegram
                      </div>
                    </div>
                  </div>
                  <ExternalLink size={15} className="text-taupe group-hover:text-[#229ED9]" />
                </button>
              </div>

              {/* Copy Direct Link Section */}
              <div className="mt-5 pt-4 border-t border-line">
                <label className="block text-[11px] font-bold text-taupe uppercase tracking-wider mb-2">
                  Or Copy Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={productUrl}
                    className="flex-1 px-3 py-2 text-xs bg-cream/40 border border-line rounded-xl text-ink font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer ${
                      copied
                        ? "bg-success text-ivory"
                        : "bg-ink hover:bg-zari text-ivory"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
