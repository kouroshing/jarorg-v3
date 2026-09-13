"use client";

import { useEffect, useRef, useState } from "react";

const MAX_PULL = 160;

const LINES = [
  { at: 0, text: "کشیدنی… هنوز ته قابه" },
  { at: 28, text: "این پایین‌تر چیزی نیست" },
  { at: 56, text: "اوکی اوکی… تهشه دیگه" },
  { at: 88, text: "شاتر رو ول کن، فیلم تموم شد" },
  { at: 120, text: "آخرین فریم! برو بالا پروژه بگیر" },
] as const;

/**
 * End-of-page rubber band: more pull → taller reveal + more jokes.
 * Grows in layout height (stays clear of the floating bottom nav).
 */
export default function EndOfPageBounce() {
  const pullRef = useRef(0);
  const [pull, setPull] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const touchBasePull = useRef(0);
  const reducedMotion = useRef(false);
  const engagedRef = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  useEffect(() => {
    const resist = (raw: number) => {
      const x = Math.max(0, raw);
      return Math.min(MAX_PULL, MAX_PULL * (1 - Math.exp(-x / 90)));
    };

    const nearBottom = () => {
      const doc = document.documentElement;
      return doc.scrollHeight - (window.scrollY + window.innerHeight) <= 24;
    };

    const applyPull = (next: number) => {
      pullRef.current = next;
      engagedRef.current = next > 0;
      setPull(next);
      // Keep viewport pinned to bottom as the reveal grows taller
      requestAnimationFrame(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
    };

    const springBack = () => {
      if (pullRef.current <= 0) return;
      setSnapping(true);
      applyPull(0);
      engagedRef.current = false;
      window.setTimeout(() => setSnapping(false), 560);
    };

    const canPull = () => nearBottom() || engagedRef.current;

    const onWheel = (e: WheelEvent) => {
      if (reducedMotion.current) return;
      if (!canPull()) {
        if (pullRef.current > 0) springBack();
        return;
      }
      if (e.deltaY > 0) {
        e.preventDefault();
        applyPull(resist(pullRef.current + e.deltaY * 0.55));
      } else if (pullRef.current > 0) {
        e.preventDefault();
        const next = Math.max(0, pullRef.current + e.deltaY * 0.7);
        applyPull(next);
        if (next <= 0) springBack();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? null;
      touchBasePull.current = pullRef.current;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (reducedMotion.current || touchStartY.current == null) return;
      const y = e.touches[0]?.clientY;
      if (y == null) return;
      const dy = touchStartY.current - y;
      if (!canPull() && dy > 0) return;
      if (dy <= 0 && pullRef.current <= 0) return;
      if (dy > 6 || pullRef.current > 0) e.preventDefault();
      applyPull(resist(touchBasePull.current + dy));
    };

    const onTouchEnd = () => {
      touchStartY.current = null;
      springBack();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const t = pull / MAX_PULL;
  const baseH = 120;
  const growH = pull * 1.2;
  const springLen = 18 + pull * 0.55;
  const aperture = 4 + t * 10;
  const line = [...LINES].reverse().find((l) => pull >= l.at)?.text ?? LINES[0].text;
  const showStrip = pull > 40;
  const showFlash = pull > 95;

  return (
    <div
      className="relative z-10 w-full flex flex-col items-center select-none pointer-events-none pb-4 md:pb-6"
      aria-hidden="true"
    >
      <div
        className={`relative w-full max-w-sm mx-auto flex flex-col items-center justify-end overflow-hidden px-4 ${
          snapping
            ? "transition-[min-height] duration-500 ease-[cubic-bezier(0.22,1.55,0.36,1)]"
            : ""
        }`}
        style={{ minHeight: baseH + growH }}
      >
        <div
          className="absolute inset-x-8 bottom-10 rounded-full bg-jar-logo/10 blur-2xl pointer-events-none"
          style={{ height: 40 + pull * 0.4, opacity: 0.25 + t * 0.45 }}
        />

        <p
          className="relative z-10 text-center text-[11px] sm:text-xs font-bold text-jar-primary/80 mb-2 px-3"
          style={{ opacity: 0.45 + t * 0.55 }}
        >
          {line}
        </p>

        {showStrip && (
          <div
            className="relative z-10 mb-2 flex items-end gap-1.5"
            style={{ opacity: Math.min(1, (pull - 40) / 40) }}
          >
            {[0, 1, 2, 3, 4].map((i) => {
              const lit = pull > 50 + i * 18;
              return (
                <div
                  key={i}
                  className="rounded-md border border-jar-border bg-jar-surface/90 overflow-hidden"
                  style={{
                    width: 22 + (lit ? 4 : 0),
                    height: 16 + (lit ? pull * 0.06 : 0),
                    opacity: lit ? 1 : 0.25,
                    transform: lit ? `translateY(${-i * 2}px)` : undefined,
                  }}
                >
                  <div
                    className="h-full w-full"
                    style={{
                      background: lit
                        ? `linear-gradient(135deg, rgba(196,92,38,${0.15 + i * 0.08}), transparent)`
                        : "transparent",
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        <svg
          width="120"
          height={64 + springLen}
          viewBox={`0 0 120 ${64 + springLen}`}
          className="relative z-10 overflow-visible text-jar-logo"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d={coilPath(60, 4, springLen)}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.5 + t * 0.35}
          />

          {showFlash && (
            <g opacity={Math.min(1, (pull - 95) / 40)} stroke="currentColor">
              {[0, 45, 90, 135].map((deg) => (
                <line
                  key={deg}
                  x1="60"
                  y1={springLen + 8}
                  x2={60 + Math.cos((deg * Math.PI) / 180) * (14 + t * 8)}
                  y2={
                    springLen +
                    8 +
                    Math.sin((deg * Math.PI) / 180) * (14 + t * 8)
                  }
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.55"
                />
              ))}
            </g>
          )}

          <g transform={`translate(0 ${springLen})`}>
            <rect
              x="34"
              y="10"
              width="52"
              height="34"
              rx="9"
              className="fill-jar-primary"
            />
            <rect
              x="44"
              y="4"
              width="18"
              height="9"
              rx="3"
              className="fill-jar-primary"
            />
            <circle cx="60" cy="28" r="11" className="fill-[#F7F5F0]" />
            <circle cx="60" cy="28" r={aperture} className="fill-jar-logo" />
            <circle
              cx="60"
              cy="28"
              r={Math.max(1.5, aperture * 0.35)}
              className="fill-[#F7F5F0]"
            />
            <circle cx="76" cy="16" r="2.2" className="fill-jar-logo" />
          </g>
        </svg>

        <div className="relative z-10 mt-1.5 flex items-center gap-2 text-[10px] font-medium text-jar-muted">
          <span
            className="h-1 rounded-full bg-jar-logo/80"
            style={{ width: 8 + t * 72 }}
          />
          <span>{Math.round(t * 100)}٪ کشش قاب</span>
        </div>

        {pull > 130 && (
          <p className="relative z-10 mt-2 text-[10px] font-black text-jar-logo">
            جایزه: هیچی! برو ثبت سفارش
          </p>
        )}
      </div>
    </div>
  );
}

function coilPath(cx: number, y0: number, len: number): string {
  const turns = Math.max(3, Math.round(4 + len / 28));
  const amp = 7;
  let d = `M ${cx} ${y0}`;
  for (let i = 1; i <= turns; i++) {
    const y = y0 + (len * i) / turns;
    const x = cx + (i % 2 === 0 ? -amp : amp);
    d += ` L ${x} ${y}`;
  }
  d += ` L ${cx} ${y0 + len}`;
  return d;
}
