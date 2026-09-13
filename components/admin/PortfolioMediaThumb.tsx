"use client";

import React, { useState } from "react";
import { Film, ImageOff } from "lucide-react";

/**
 * Admin thumbnail that survives HEIC / missing disk files / unplayable MOV.
 * Chrome cannot paint HEIC; a failed <img> with object-cover looks like an empty gray tile.
 */
export default function PortfolioMediaThumb({
  fileUrl,
  mediaType,
  alt,
  className = "h-full w-full object-cover",
}: {
  fileUrl: string;
  mediaType: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const looksHeic = /\.hei[cf]($|\?)/i.test(fileUrl);
  const isVideo = mediaType === "VIDEO";

  if (failed || looksHeic) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-slate-100 px-3 text-center">
        <ImageOff className="h-5 w-5 text-slate-400" />
        <p className="text-[10px] font-bold text-slate-600 leading-snug">
          {looksHeic
            ? "فرمت HEIC آیفون — در مرورگر دیده نمی‌شود"
            : isVideo
              ? "ویدیو قابل پخش نیست (فایل خراب یا MOV)"
              : "فایل پیدا نشد یا قابل نمایش نیست"}
        </p>
      </div>
    );
  }

  if (isVideo) {
    return (
      <>
        <video
          src={fileUrl}
          className={className}
          preload="metadata"
          muted
          playsInline
          onError={() => setFailed(true)}
        />
        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/65 text-white pointer-events-none">
          <Film className="w-3 h-3" />
          ویدیو
        </span>
      </>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fileUrl}
      alt={alt || ""}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
