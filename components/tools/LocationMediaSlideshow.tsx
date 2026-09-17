"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Film, ImageIcon } from "lucide-react";
import type { LocationMediaItem } from "@/lib/locations/photoLocation";

export default function LocationMediaSlideshow({
  items,
  alt,
}: {
  items: LocationMediaItem[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const count = items.length;
  const current = items[Math.min(index, Math.max(0, count - 1))];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (count <= 1) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  useEffect(() => {
    videoRef.current?.pause();
  }, [index]);

  useEffect(() => {
    if (count <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, go]);

  if (!current) return null;

  return (
    <div
      className="relative overflow-hidden rounded-[1.75rem] border border-white/40 bg-[#141413] shadow-[0_24px_80px_rgba(20,20,19,0.18)]"
      onTouchStart={(e) => {
        touchX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (dx > 56) go(-1);
        if (dx < -56) go(1);
      }}
    >
      <div className="relative aspect-[4/5] sm:aspect-[16/10]">
        {current.kind === "video" ? (
          <video
            ref={videoRef}
            key={current.url}
            src={current.url}
            className="h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={alt} className="h-full w-full object-cover" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#141413] shadow-lg backdrop-blur-md active:scale-95"
            aria-label="اسلاید قبلی"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#141413] shadow-lg backdrop-blur-md active:scale-95"
            aria-label="اسلاید بعدی"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}

      <div className="absolute bottom-3 inset-x-0 z-10 flex items-center justify-center gap-2 px-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
          {current.kind === "video" ? (
            <Film className="h-3 w-3" />
          ) : (
            <ImageIcon className="h-3 w-3" />
          )}
          {(index + 1).toLocaleString("fa-IR")} / {count.toLocaleString("fa-IR")}
        </span>
      </div>

      {count > 1 && (
        <div className="absolute top-3 inset-x-0 z-10 flex justify-center gap-1.5 px-10">
          {items.map((item, i) => (
            <button
              key={`${item.kind}-${item.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-2 bg-white/45"
              }`}
              aria-label={`اسلاید ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
