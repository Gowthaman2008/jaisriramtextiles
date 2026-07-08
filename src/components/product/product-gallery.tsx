"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Autoplay timer to swap images every 4.5 seconds
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) {
    return (
      <div className="zari-frame aspect-square overflow-hidden rounded-card bg-cream grid place-items-center text-sm text-taupe">
        No image yet
      </div>
    );
  }

  const activeImage = images[currentIndex];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Image Frame */}
      <div className="zari-frame aspect-square overflow-hidden rounded-card bg-cream relative group">
        <Image
          src={activeImage}
          alt={`${name} - Image ${currentIndex + 1}`}
          width={900}
          height={900}
          className="h-full w-full object-cover transition-all duration-500 ease-in-out"
          priority
        />

        {/* Left/Right Clickable Navigation chevrons (always visible on mobile, hover-only on desktop) */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink p-1.5 rounded-full shadow transition-all duration-200 opacity-0 group-hover:opacity-100 max-md:opacity-100 cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink p-1.5 rounded-full shadow transition-all duration-200 opacity-0 group-hover:opacity-100 max-md:opacity-100 cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Slide Indicator Overlay Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-ink/35 px-2.5 py-1 rounded-full backdrop-blur-xs">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "bg-white scale-125" : "bg-white/50"
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selectable Thumbnail Images Row */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-line/50">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border bg-cream transition-all duration-200 ${
                idx === currentIndex
                  ? "border-zari ring-1 ring-zari scale-95"
                  : "border-line hover:border-taupe"
              }`}
            >
              <Image
                src={img}
                alt={`${name} thumbnail ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
