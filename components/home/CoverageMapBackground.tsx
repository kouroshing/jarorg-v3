"use client";

import React, { useId, useState } from "react";
import {
  IRAN_MAP_VIEWBOX,
  IRAN_OUTLINE_PATH,
  type CoverageCircle,
} from "@/lib/geo/coverageMap";

type Props = {
  circles: CoverageCircle[];
  specialistCount: number;
};

/**
 * Full-bleed minimal Iran map for the homepage hero.
 * Circles = real ACTIVE specialist coverage (base + radius), clustered.
 */
export default function CoverageMapBackground({
  circles,
  specialistCount,
}: Props) {
  const reactId = useId().replace(/:/g, "");
  const softFilterId = `jar-map-soft-${reactId}`;
  const [active, setActive] = useState<number | null>(null);
  const { width, height } = IRAN_MAP_VIEWBOX;
  const hasCovers = circles.length > 0;

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[#F7F5F0]" />
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 38%, rgba(255,255,255,0.92) 0%, transparent 72%)",
        }}
      />

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        <defs>
          <filter id={softFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Padding so Iran sits centered without aggressive crop */}
        <g transform="translate(40 20) scale(0.92)">
          <path
            d={IRAN_OUTLINE_PATH}
            fill="rgba(100, 95, 88, 0.07)"
            stroke="rgba(55, 50, 45, 0.38)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d={IRAN_OUTLINE_PATH}
            fill="none"
            stroke="rgba(70, 64, 58, 0.08)"
            strokeWidth="10"
            strokeLinejoin="round"
            filter={`url(#${softFilterId})`}
          />

          {hasCovers
            ? circles.map((c, index) => {
                const isActive = active === index;
                const delay = `${(index % 7) * 0.28}s`;
                return (
                  <g
                    key={`${c.x}-${c.y}-${index}`}
                    transform={`translate(${c.x} ${c.y})`}
                    className="pointer-events-auto cursor-default"
                    onMouseEnter={() => setActive(index)}
                    onMouseLeave={() => setActive(null)}
                  >
                    {/* Real coverage disc (specialist radius) */}
                    <circle
                      r={c.r}
                      fill={
                        isActive
                          ? "rgba(0, 96, 151, 0.14)"
                          : "rgba(0, 96, 151, 0.08)"
                      }
                      stroke="rgba(0, 96, 151, 0.22)"
                      strokeWidth="1"
                      className="transition-all duration-300"
                    />
                    <circle
                      r={Math.min(14, c.r * 0.22)}
                      fill="none"
                      stroke="rgba(0, 96, 151, 0.4)"
                      strokeWidth="1.25"
                      className="animate-coverage-pulse"
                      style={{ animationDelay: delay }}
                    />
                    <circle
                      r={isActive ? 4.8 : 3.8}
                      fill={isActive ? "#006097" : "rgba(0, 96, 151, 0.9)"}
                    />
                    {(isActive || c.label) && (
                      <text
                        y={-(c.r * 0.15 + 14)}
                        textAnchor="middle"
                        style={{
                          fontSize: isActive ? 14 : 11,
                          fontWeight: 700,
                          fill: isActive
                            ? "rgba(40, 36, 32, 0.88)"
                            : "rgba(70, 64, 58, 0.42)",
                        }}
                      >
                        {c.label || "پوشش فعال"}
                        {c.count > 1 ? ` · ${c.count}` : ""}
                      </text>
                    )}
                  </g>
                );
              })
            : null}
        </g>
      </svg>

      {!hasCovers && (
        <div className="absolute inset-x-0 top-[58%] flex justify-center pointer-events-none">
          <p className="rounded-full border border-jar-border/70 bg-jar-surface/80 px-3 py-1 text-[10px] font-bold text-jar-muted backdrop-blur-sm">
            به‌زودی پوشش واقعی متخصصان روی نقشه نمایش داده می‌شود
          </p>
        </div>
      )}

      {/* Soft center veil for typography — keep light so map stays visible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 42% 36% at 50% 40%, rgba(247,245,240,0.55) 0%, rgba(247,245,240,0.12) 48%, transparent 72%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#F7F5F0] to-transparent" />

      {specialistCount > 0 && (
        <span className="sr-only">
          {specialistCount} متخصص فعال با محدوده پوشش روی نقشه
        </span>
      )}
    </div>
  );
}
