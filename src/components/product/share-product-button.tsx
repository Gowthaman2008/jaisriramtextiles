"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Share2,
  X,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Download,
  Loader2,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface ShareProductButtonProps {
  product: Product;
}

export function ShareProductButton({ product }: ShareProductButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSharingMedia, setIsSharingMedia] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);

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

  // Clean, concise message without description and without raw image URLs
  const buildCleanCaption = () => {
    const lines = [
      `✨ *${product.name}*`,
      product.categoryLabel ? `🏷️ *Category:* ${product.categoryLabel}` : "",
      `💰 *Price:* ${priceDisplay}${originalPriceDisplay ? ` ~(${originalPriceDisplay})~` : ""}`,
      `🌿 *100% Pure Handloom Cotton | JAI SRI RAM TEXTILES*`,
      "",
      `🔗 *View & Order Online:*`,
      `${productUrl}`,
    ].filter(Boolean);

    return lines.join("\n");
  };

  // Convert product image URL to a File for Web Share API Level 2 (Media sharing)
  const getProductImageFile = async (): Promise<File | null> => {
    if (!product.image) return null;
    try {
      const res = await fetch(product.image, { mode: "cors" });
      const blob = await res.blob();
      const mimeType = blob.type || "image/jpeg";
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
      return new File([blob], `${product.slug || "product"}.${ext}`, { type: mimeType });
    } catch (e) {
      console.warn("Could not fetch image file for media sharing:", e);
      return null;
    }
  };

  // Share as media photo + caption via Native Web Share API (WhatsApp, etc.)
  const handleMediaShare = async () => {
    setIsSharingMedia(true);
    const caption = buildCleanCaption();

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        let imageFile: File | null = null;
        if (product.image) {
          imageFile = await getProductImageFile();
        }

        // If browser supports sharing files (media), share the photo directly
        if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
          await navigator.share({
            title: product.name,
            text: caption,
            files: [imageFile],
          });
          setIsOpen(false);
          return;
        }

        // If file sharing is not supported by device, share text + URL via native share sheet
        await navigator.share({
          title: product.name,
          text: caption,
          url: productUrl,
        });
        setIsOpen(false);
        return;
      }

      // Fallback if navigator.share is completely unavailable (e.g. desktop non-HTTPS)
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Share error:", err);
        // Fallback to WhatsApp link
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setIsSharingMedia(false);
    }
  };

  // Direct WhatsApp Web Fallback button
  const handleWhatsAppDirect = () => {
    const caption = buildCleanCaption();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Download product image for manual sharing / attachments
  const handleDownloadPhoto = async () => {
    if (!product.image) return;
    setDownloadingImg(true);
    try {
      const res = await fetch(product.image);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${product.slug || "product"}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download image:", err);
      window.open(product.image, "_blank");
    } finally {
      setDownloadingImg(false);
    }
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
                  <p className="text-[11px] text-taupe">Send photo, price & order link</p>
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

              {/* Share Options */}
              <div className="mt-5 space-y-2.5">
                {/* 1. Primary Share: Media Photo + Caption into WhatsApp / Social Apps */}
                <button
                  type="button"
                  onClick={handleMediaShare}
                  disabled={isSharingMedia}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white transition-all group shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      {isSharingMedia ? (
                        <Loader2 size={20} className="animate-spin text-white" />
                      ) : (
                        /* WhatsApp SVG */
                        <svg
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          fill="currentColor"
                          className="text-white"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">
                        {isSharingMedia ? "Preparing Photo..." : "Share Photo to WhatsApp"}
                      </div>
                      <div className="text-[11px] text-white/85">
                        Sends photo as media with price & order link
                      </div>
                    </div>
                  </div>
                  <Share2 size={16} className="text-white/80" />
                </button>

                {/* 2. Direct Web WhatsApp link fallback */}
                <button
                  type="button"
                  onClick={handleWhatsAppDirect}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-ink transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#25D366]/20 text-[#128C7E] flex items-center justify-center shrink-0">
                      <ExternalLink size={16} />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-ink group-hover:text-[#128C7E] transition-colors">
                        Open WhatsApp Web Directly
                      </div>
                      <div className="text-[10px] text-taupe">
                        Quick text & order link for desktop WhatsApp
                      </div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-taupe group-hover:text-[#128C7E]" />
                </button>

                {/* 3. Download Photo Option */}
                {product.image && (
                  <button
                    type="button"
                    onClick={handleDownloadPhoto}
                    disabled={downloadingImg}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-cream/60 hover:bg-cream border border-line text-ink transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink/10 text-ink flex items-center justify-center shrink-0">
                        {downloadingImg ? (
                          <Loader2 size={15} className="animate-spin text-ink" />
                        ) : (
                          <Download size={15} />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-ink group-hover:text-zari-deep transition-colors">
                          Save Product Photo
                        </div>
                        <div className="text-[10px] text-taupe">
                          Download high-res image to device
                        </div>
                      </div>
                    </div>
                    <Download size={14} className="text-taupe group-hover:text-ink" />
                  </button>
                )}
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
