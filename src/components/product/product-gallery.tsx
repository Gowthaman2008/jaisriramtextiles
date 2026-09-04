"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play, Video as VideoIcon, Volume2, VolumeX } from "lucide-react";
import { isVideoMediaUrl } from "@/components/home/hero-carousel";

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Touch swipe states for mobile view
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const handleManualSelect = (newIdx: number) => {
    setUserInteracted(true);
    setCurrentIndex(newIdx);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    if (images.length <= 1) return;
    if (!touchStartX.current || !touchEndX.current || !touchStartY.current || !touchEndY.current) return;
    
    const xDistance = touchStartX.current - touchEndX.current;
    const yDistance = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 50;

    // Trigger horizontal swipe only when swipe is predominantly horizontal
    if (Math.abs(xDistance) > Math.abs(yDistance) && Math.abs(xDistance) > minSwipeDistance) {
      if (xDistance > 0) {
        // Swipe left -> Next image (manual user swipe)
        handleManualSelect((currentIndex + 1) % images.length);
      } else {
        // Swipe right -> Previous image (manual user swipe)
        handleManualSelect((currentIndex - 1 + images.length) % images.length);
      }
    }
  };

  const activeMedia = images[currentIndex];
  const isCurrentVideo = isVideoMediaUrl(activeMedia);

  // Autoplay timer: completely disabled if the user has manually changed/swiped images, is hovering, or viewing a video
  useEffect(() => {
    if (images.length <= 1) return;
    if (userInteracted || isHovered || isCurrentVideo) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length, userInteracted, isHovered, isCurrentVideo]);

  if (!images || images.length === 0) {
    return (
      <div className="zari-frame aspect-square overflow-hidden rounded-card bg-cream grid place-items-center text-sm text-taupe">
        No image yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Media Frame */}
      <div 
        className="zari-frame aspect-square overflow-hidden rounded-card bg-cream relative group"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isCurrentVideo ? (
          <div className="relative w-full h-full bg-black">
            <video
              key={activeMedia}
              src={activeMedia}
              controls
              autoPlay
              muted={isMuted}
              playsInline
              preload="auto"
              onEnded={() => {
                // If user has not manually locked onto this video, continue to next item on complete
                if (!userInteracted && images.length > 1) {
                  setCurrentIndex((prev) => (prev + 1) % images.length);
                }
              }}
              className="h-full w-full object-cover"
            />
            {/* Video badge overlay */}
            <div className="absolute top-3 left-3 bg-black/75 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow pointer-events-none z-10">
              <VideoIcon size={12} className="text-zari" />
              Product Video
            </div>

            {/* Quick sound toggle */}
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              aria-label={isMuted ? "Unmute video sound" : "Mute video sound"}
              className="absolute top-3 right-3 bg-black/75 hover:bg-black text-white p-1.5 rounded-full shadow transition-all duration-200 z-10 cursor-pointer"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        ) : (
          <Image
            src={activeMedia}
            alt={`${name} - Media ${currentIndex + 1}`}
            width={900}
            height={900}
            className="h-full w-full object-cover transition-all duration-500 ease-in-out"
            priority
          />
        )}

        {/* Left/Right Clickable Navigation chevrons (always visible on mobile, hover-only on desktop) */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => handleManualSelect((currentIndex - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink p-1.5 rounded-full shadow transition-all duration-200 opacity-0 group-hover:opacity-100 hidden md:block cursor-pointer z-10"
              aria-label="Previous media"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => handleManualSelect((currentIndex + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-ink p-1.5 rounded-full shadow transition-all duration-200 opacity-0 group-hover:opacity-100 hidden md:block cursor-pointer z-10"
              aria-label="Next media"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Slide Indicator Overlay Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-ink/35 px-2.5 py-1 rounded-full backdrop-blur-xs z-10">
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => handleManualSelect(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "bg-white scale-125" : "bg-white/50"
                }`}
                aria-label={`Go to item ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selectable Thumbnail Row */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-line/50">
          {images.map((img, idx) => {
            const isThumbVideo = isVideoMediaUrl(img);
            return (
              <button
                key={idx}
                onClick={() => handleManualSelect(idx)}
                className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border bg-cream transition-all duration-200 cursor-pointer ${
                  idx === currentIndex
                    ? "border-zari ring-1 ring-zari scale-95"
                    : "border-line hover:border-taupe"
                }`}
              >
                {isThumbVideo ? (
                  <div className="relative w-full h-full bg-black">
                    <video
                      src={img}
                      muted
                      playsInline
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-white">
                      <Play size={14} className="fill-white drop-shadow" />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={img}
                    alt={`${name} thumbnail ${idx + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
