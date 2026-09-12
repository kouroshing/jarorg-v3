"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Coins, Sparkles } from "lucide-react";
import { formatPrice, formatShortPrice } from "@/lib/format/price";
import {
  type BudgetStop,
  getBudgetStops,
  getGoldenIndex,
  getBudgetStop,
  levelTone,
} from "@/lib/pricing/budgetStops";

export interface OrderBudgetAdjusterProps {
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  durationHours: number;
  /** Override ladder (e.g. from admin API later). Defaults to getBudgetStops(). */
  stops?: BudgetStop[];
}

/**
 * Compact RTL budget slider for order finalize.
 * Below golden = red, at golden = neutral, above = green.
 */
export default function OrderBudgetAdjuster({
  selectedIndex,
  onSelectIndex,
  durationHours,
  stops: stopsProp,
}: OrderBudgetAdjusterProps) {
  const stops = stopsProp ?? getBudgetStops();
  const goldenIndex = getGoldenIndex(stops);
  const current = getBudgetStop(selectedIndex, stops);
  const tone = levelTone(current.level);
  const maxIndex = Math.max(stops.length - 1, 1);

  const total = useMemo(
    () => current.rate * Math.max(1, durationHours),
    [current.rate, durationHours]
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

  const fractionFromX = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    // RTL: right = 0 (low), left = 1 (high)
    return Math.max(0, Math.min(1, (rect.right - clientX) / rect.width));
  }, []);

  const selectFromFraction = useCallback(
    (fraction: number) => {
      const idx = Math.round(fraction * maxIndex);
      if (idx !== selectedIndex) onSelectIndex(idx);
    },
    [maxIndex, onSelectIndex, selectedIndex]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const f = fractionFromX(e.clientX);
    setDragPercent(f * 100);
    selectFromFraction(f);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const f = fractionFromX(e.clientX);
    setDragPercent(f * 100);
    selectFromFraction(f);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragPercent(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const fillPercent =
    dragPercent !== null ? dragPercent : (selectedIndex / maxIndex) * 100;

  return (
    <div
      className={`rounded-2xl border px-3.5 py-3.5 sm:px-4 sm:py-4 space-y-3.5 transition-colors ${tone.border} ${tone.softBg}`}
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2.5 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-jar-surface ${tone.border}`}
          >
            <Coins className={`h-4 w-4 ${tone.text}`} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-black text-jar-primary">
              مبلغ پروژه + هزینه‌های جانبی
            </p>
            <p className="text-[11px] text-jar-muted leading-relaxed">
              با کشیدن اسلایدر، نرخ ساعتی پیشنهادی‌تان را تنظیم کنید. پرداخت بعد از توافق با
              متخصص انجام می‌شود.
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${tone.border} ${tone.text} bg-jar-surface`}
        >
          {current.level === "golden" && <Sparkles className="h-3 w-3" />}
          {current.badge}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-jar-muted mb-0.5">
            برآورد کل ({durationHours} ساعت)
          </p>
          <p className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${tone.text}`}>
            {formatPrice(total)}
            <span className="text-xs font-medium text-jar-muted mr-1.5">تومان</span>
          </p>
        </div>
        <p className="text-[11px] font-mono font-bold text-jar-muted">
          ساعتی {formatPrice(current.rate)} ت
        </p>
      </div>

      <div className="rounded-xl border border-jar-border bg-jar-surface p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-jar-muted">
          <span className="text-rose-600">زیر عرف</span>
          <span className="text-jar-primary font-black">نرمال</span>
          <span className="text-emerald-600">بالاتر</span>
        </div>

        <div className="px-3 sm:px-4 py-1">
          <div
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative h-8 flex items-center cursor-pointer touch-none select-none"
            role="slider"
            aria-label="تنظیم بودجه پروژه"
            aria-valuemin={0}
            aria-valuemax={maxIndex}
            aria-valuenow={selectedIndex}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                onSelectIndex(Math.min(maxIndex, selectedIndex + 1));
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                onSelectIndex(Math.max(0, selectedIndex - 1));
              }
            }}
          >
            <div className={`relative h-2 w-full rounded-full overflow-hidden ${tone.track}`}>
              <div
                className={`absolute top-0 right-0 h-full rounded-full ${tone.fill} ${
                  dragPercent !== null ? "" : "transition-all duration-200 ease-out"
                }`}
                style={{ width: `${fillPercent}%` }}
              />
            </div>

            <div className="absolute inset-0 pointer-events-none">
              {stops.map((stop) => {
                const pos = (stop.index / maxIndex) * 100;
                const active = stop.index <= selectedIndex;
                const currentStop = stop.index === selectedIndex;
                return (
                  <div
                    key={stop.index}
                    className="absolute top-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{ right: `${pos}%` }}
                  >
                    <div className="translate-x-1/2">
                      <button
                        type="button"
                        aria-label={stop.shortLabel}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIndex(stop.index);
                        }}
                        className={`h-2.5 w-2.5 rounded-full border-2 border-white transition-transform ${
                          currentStop
                            ? `${tone.fill} scale-125 ring-2 ring-offset-1 ${
                                current.level === "low"
                                  ? "ring-rose-300"
                                  : current.level === "high"
                                    ? "ring-emerald-300"
                                    : "ring-jar-primary/30"
                              }`
                            : active
                              ? tone.fill
                              : "bg-jar-border"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 z-20"
                style={{ right: `${fillPercent}%` }}
                animate={{ right: `${fillPercent}%` }}
                transition={
                  dragPercent !== null
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 480, damping: 32 }
                }
              >
                <div className="translate-x-1/2 pointer-events-auto">
                  <div
                    className={`h-7 w-11 rounded-full bg-white border shadow-sm flex items-center justify-center gap-0.5 cursor-grab active:cursor-grabbing ${tone.border}`}
                  >
                    <ChevronLeft className={`h-3 w-3 ${tone.text}`} />
                    <ChevronRight className={`h-3 w-3 ${tone.text}`} />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="relative h-4 px-3 sm:px-4">
          {stops.map((stop) => {
            const pos = (stop.index / maxIndex) * 100;
            const selected = stop.index === selectedIndex;
            return (
              <button
                key={stop.index}
                type="button"
                onClick={() => onSelectIndex(stop.index)}
                className={`absolute top-0 -translate-x-1/2 text-[9px] sm:text-[10px] font-mono whitespace-nowrap transition-colors ${
                  selected
                    ? `font-black ${tone.text}`
                    : stop.index === goldenIndex
                      ? "font-bold text-jar-primary"
                      : "font-bold text-jar-muted/70"
                }`}
                style={{ right: `${pos}%` }}
              >
                {formatShortPrice(stop.rate * Math.max(1, durationHours))}
              </button>
            );
          })}
        </div>
      </div>

      <p className={`text-[11px] font-medium leading-relaxed ${tone.text}`}>
        {current.hint}
      </p>
    </div>
  );
}
