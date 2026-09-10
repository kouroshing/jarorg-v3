"use client";

import React from "react";
import { Camera } from "lucide-react";

export default function OrderMatchingRadar({
  size = 240,
  foundCount = 0,
}: {
  size?: number;
  foundCount?: number;
}) {
  return (
    <div
      className="relative mx-auto shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(204,120,92,0.16)_0%,rgba(204,120,92,0.05)_42%,transparent_70%)]" />

      <div className="absolute inset-[8%] rounded-full border border-jar-logo/20" />
      <div className="absolute inset-[22%] rounded-full border border-jar-logo/15" />
      <div className="absolute inset-[36%] rounded-full border border-jar-logo/10" />

      <div className="absolute left-1/2 top-[8%] bottom-[8%] w-px -translate-x-1/2 bg-jar-logo/10" />
      <div className="absolute top-1/2 right-[8%] left-[8%] h-px -translate-y-1/2 bg-jar-logo/10" />

      <div className="absolute inset-[8%] overflow-hidden rounded-full">
        <div className="absolute inset-0 origin-center animate-radar-sweep bg-[conic-gradient(from_0deg,transparent_0deg,rgba(204,120,92,0.0)_10deg,rgba(204,120,92,0.38)_52deg,transparent_88deg)]" />
      </div>

      <div className="absolute inset-[10%] animate-orbit-slow">
        <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-jar-logo shadow-[0_0_12px_rgba(204,120,92,0.8)]" />
      </div>
      <div className="absolute inset-[22%] animate-orbit-reverse">
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber-400/90 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
      </div>
      <div className="absolute inset-[32%] animate-orbit-slow" style={{ animationDuration: "22s" }}>
        <span className="absolute left-[18%] bottom-[8%] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      </div>

      {foundCount > 0 && (
        <span className="absolute left-[22%] top-[28%] flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
      )}

      <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-jar-border bg-jar-surface text-jar-logo shadow-xs">
        <Camera className="h-7 w-7" />
      </div>
    </div>
  );
}
