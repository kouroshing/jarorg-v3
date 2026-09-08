"use client";

import React, { useMemo, useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, Award, Zap, TrendingUp, Clock, Info, ChevronLeft, ChevronRight } from "lucide-react";

export interface BudgetStop {
  index: number;
  rate: number;
  shortLabel: string;
  level: "low" | "golden" | "high";
  hint: string;
  badge: string;
}

export const BUDGET_STOPS: BudgetStop[] = [
  {
    index: 0,
    rate: 900000,
    shortLabel: "۹۰۰ هزار",
    level: "low",
    hint: "مناسب کارهای اقتصادی با موبایل/دوربین پایه - داوطلب محدود",
    badge: "پایه / دانشجویی",
  },
  {
    index: 1,
    rate: 1800000,
    shortLabel: "۱.۸ م",
    level: "low",
    hint: "مناسب کارهای اقتصادی با موبایل/دوربین پایه - داوطلب محدود",
    badge: "اقتصادی",
  },
  {
    index: 2,
    rate: 2700000,
    shortLabel: "۲.۷ م",
    level: "low",
    hint: "مناسب کارهای اقتصادی با موبایل/دوربین پایه - داوطلب محدود",
    badge: "نیمه‌حرفه‌ای",
  },
  {
    index: 3,
    rate: 3600000,
    shortLabel: "۳.۶ م",
    level: "golden",
    hint: "پیشنهادی جار - بیشترین تعداد عکاس داوطلب و کیفیت تضمینی",
    badge: "پیشنهادی جار",
  },
  {
    index: 4,
    rate: 6500000,
    shortLabel: "۶.۵ م",
    level: "high",
    hint: "کیفیت سینمایی و تجاری - اولویت اول متخصصین برتر",
    badge: "حرفه‌ای و استودیویی",
  },
  {
    index: 5,
    rate: 11000000,
    shortLabel: "۱۱ م",
    level: "high",
    hint: "کیفیت سینمایی و تجاری - اولویت اول متخصصین برتر",
    badge: "تبلیغاتی و پریمیوم",
  },
  {
    index: 6,
    rate: 18000000,
    shortLabel: "۱۸ م",
    level: "high",
    hint: "کیفیت سینمایی و تجاری - اولویت اول متخصصین برتر",
    badge: "سینمایی و کارگردانی VIP",
  },
];

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount);
}

export function formatShortPrice(amount: number): string {
  if (amount < 1_000_000) {
    const val = Math.round(amount / 1_000);
    return `${new Intl.NumberFormat("fa-IR").format(val)} هزار`;
  }
  const millions = amount / 1_000_000;
  const formatted = new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(millions).replace("٫", ".");
  return `${formatted} م`;
}

interface BudgetSliderProps {
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  durationHours: number;
  onChangeDuration: (hours: number) => void;
}

export default function BudgetSlider({
  selectedIndex,
  onSelectIndex,
  durationHours,
  onChangeDuration,
}: BudgetSliderProps) {
  const currentStop = BUDGET_STOPS[selectedIndex] || BUDGET_STOPS[3];

  const totalEstimatedPrice = useMemo(() => {
    return currentStop.rate * durationHours;
  }, [currentStop.rate, durationHours]);

  const depositAmount = useMemo(() => {
    return Math.round(totalEstimatedPrice / 2);
  }, [totalEstimatedPrice]);

  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

  const getFractionFromClientX = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    // In RTL, right edge is 0% (index 0), left edge is 100% (index 6)
    const distanceFromRight = rect.right - clientX;
    return Math.max(0, Math.min(1, distanceFromRight / rect.width));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const fraction = getFractionFromClientX(e.clientX);
    const percent = fraction * 100;
    setDragPercent(percent);
    const targetIndex = Math.round(fraction * (BUDGET_STOPS.length - 1));
    if (targetIndex !== selectedIndex) {
      onSelectIndex(targetIndex);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      const fraction = getFractionFromClientX(e.clientX);
      const percent = fraction * 100;
      setDragPercent(percent);
      const targetIndex = Math.round(fraction * (BUDGET_STOPS.length - 1));
      if (targetIndex !== selectedIndex) {
        onSelectIndex(targetIndex);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setDragPercent(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <div className="space-y-6 rounded-[28px] border border-[#E5E0D8] bg-white/95 p-5 sm:p-7 shadow-[0_2px_12px_rgba(31,30,29,0.03)] backdrop-blur-xl" dir="rtl">
      
      {/* Title & Duration Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141413] text-white font-bold text-xs">
              ۳
            </span>
            <h3 className="text-base sm:text-lg font-black text-[#141413]">
              تعیین بودجه و نرخ ساعتی (مدل پویا)
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#66605B] font-medium">
            نرخ دلخواه خود را تعیین کنید؛ سیستم هوشمند متناسب با این بودجه متخصصین واجد شرایط را فراخوان می‌کند.
          </p>
        </div>

        {/* Duration Hours Selector */}
        <div className="flex items-center gap-2 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] p-1.5 self-start sm:self-auto">
          <Clock className="h-4 w-4 text-[#66605B] mr-2" />
          <span className="text-xs font-bold text-[#141413] ml-1">مدت آفیش:</span>
          {[1, 2, 3, 4, 6].map((hrs) => (
            <button
              key={hrs}
              type="button"
              onClick={() => onChangeDuration(hrs)}
              className={`h-8 px-3 rounded-full text-xs font-black transition-all duration-200 cursor-pointer ${
                durationHours === hrs
                  ? "bg-[#141413] text-white shadow-xs scale-105"
                  : "text-[#66605B] hover:bg-white hover:text-[#141413]"
              }`}
            >
              {hrs} ساعت
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Main Rate Display Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-[#141413] p-5 text-white shadow-md border border-[#282725]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400">
              برآورد بودجه کل ({durationHours} ساعت):
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#CC785C]/20 border border-[#CC785C]/40 px-2.5 py-0.5 text-[11px] font-black text-[#CC785C]">
              {currentStop.level === "golden" && <Sparkles className="h-3 w-3" />}
              {currentStop.badge}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
              {formatPrice(totalEstimatedPrice)}
            </span>
            <span className="text-xs text-zinc-300 font-medium">تومان کل پروژه</span>
            <span className="text-[11px] text-zinc-400 mr-2 font-mono">
              (ساعتی {formatPrice(currentStop.rate)} ت)
            </span>
          </div>
        </div>

        {/* Quick Calculation Tag */}
        <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-r border-zinc-800 pt-3 sm:pt-0 sm:pr-6 text-left sm:text-right">
          <span className="text-xs text-zinc-400 font-medium">پیش‌پرداخت بیعانه (۵۰٪):</span>
          <span className="text-lg sm:text-xl font-black text-white font-mono">
            {formatPrice(depositAmount)} <span className="text-xs font-normal text-zinc-400">تومان</span>
          </span>
          <span className="text-[11px] font-bold text-[#CC785C] mt-0.5">
            تسویه الباقی پس از رضایت و تحویل کار
          </span>
        </div>
      </div>

      {/* 7-Stop Track with Dot Nodes & Draggable < > Pill Indicator */}
      <div className="rounded-2xl border border-[#E5E0D8] bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Top Track Label Row */}
        <div className="flex items-center justify-between text-xs font-bold text-[#66605B]">
          <span className="text-[#141413] font-black">
            پایه ({formatShortPrice(BUDGET_STOPS[0].rate * durationHours)} ت)
          </span>
          <span className="inline-flex items-center gap-1 text-[#CC785C] font-black text-[11px] bg-[#CC785C]/10 border border-[#CC785C]/20 px-2.5 py-0.5 rounded-full">
            <Sparkles className="h-3 w-3 text-[#CC785C]" />
            <span>پیشنهادی جار ({formatShortPrice(BUDGET_STOPS[3].rate * durationHours)})</span>
          </span>
          <span className="text-[#141413] font-black">
            VIP ({formatShortPrice(BUDGET_STOPS[6].rate * durationHours)})
          </span>
        </div>

        {/* Interactive Track Area */}
        <div className="py-2 px-5 sm:px-6">
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative h-9 flex items-center cursor-pointer touch-none select-none"
            role="slider"
            aria-label="اسلایدر تعیین نرخ بودجه"
            aria-valuemin={0}
            aria-valuemax={6}
            aria-valuenow={selectedIndex}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                onSelectIndex(Math.min(6, selectedIndex + 1));
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                onSelectIndex(Math.max(0, selectedIndex - 1));
              }
            }}
          >
            {/* Background Track Line */}
            <div className="relative h-2 w-full rounded-full bg-[#E5E0D8] shadow-inner overflow-hidden">
              {/* Active Filled Colored Bar */}
              <div
                className={`absolute top-0 right-0 h-full rounded-full bg-[#141413] ${
                  dragPercent !== null ? "" : "transition-all duration-200 ease-out"
                }`}
                style={{
                  width: `${
                    dragPercent !== null
                      ? dragPercent
                      : (selectedIndex / (BUDGET_STOPS.length - 1)) * 100
                  }%`,
                }}
              />
            </div>

            {/* 7 Station Dots along track */}
            <div className="absolute inset-0 pointer-events-none">
              {BUDGET_STOPS.map((stop) => {
                const isPassedOrActive = stop.index <= selectedIndex;
                const isCurrent = stop.index === selectedIndex;
                const posPercent = (stop.index / (BUDGET_STOPS.length - 1)) * 100;

                return (
                  <div
                    key={stop.index}
                    className="absolute top-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{ right: `${posPercent}%` }}
                  >
                    <div className="translate-x-1/2 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIndex(stop.index);
                        }}
                        className={`w-3 h-3 rounded-full border-2 border-white transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-[#141413] ring-2 ring-[#141413]/40 scale-110 shadow-xs"
                            : isPassedOrActive
                            ? "bg-[#141413] shadow-2xs"
                            : "bg-[#E5E0D8]"
                        }`}
                        aria-label={stop.shortLabel}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pill Handle with < > Chevrons */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-30"
                style={{
                  right: `${
                    dragPercent !== null
                      ? dragPercent
                      : (selectedIndex / (BUDGET_STOPS.length - 1)) * 100
                  }%`,
                }}
                animate={{
                  right: `${
                    dragPercent !== null
                      ? dragPercent
                      : (selectedIndex / (BUDGET_STOPS.length - 1)) * 100
                  }%`,
                }}
                transition={
                  dragPercent !== null
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 500, damping: 32 }
                }
              >
                {/* Centered pill with translate-x-1/2 */}
                <div className="translate-x-1/2 flex items-center justify-center pointer-events-auto">
                  <div className="h-7 sm:h-8 w-[48px] sm:w-[54px] rounded-full bg-white border border-[#E5E0D8] hover:border-[#141413] shadow-[0_2px_10px_rgba(31,30,29,0.08)] flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-transform select-none touch-none">
                    <ChevronLeft className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-[#141413] stroke-[2.5]" />
                    <ChevronRight className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-[#141413] stroke-[2.5]" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Tick Labels Below Track - Exactly Centered Under Each Dot */}
        <div className="relative h-5 px-5 sm:px-6 pt-1">
          <div className="relative w-full h-full">
            {BUDGET_STOPS.map((stop) => {
              const isSelected = selectedIndex === stop.index;
              const posPercent = (stop.index / (BUDGET_STOPS.length - 1)) * 100;

              return (
                <div
                  key={stop.index}
                  className="absolute top-0"
                  style={{ right: `${posPercent}%` }}
                >
                  <div className="translate-x-1/2 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => onSelectIndex(stop.index)}
                      className={`cursor-pointer whitespace-nowrap text-[10px] sm:text-[11px] font-mono transition-all ${
                        isSelected
                          ? "text-[#141413] font-black scale-110"
                          : stop.level === "golden"
                          ? "text-[#CC785C] font-black"
                          : "text-[#A8A29A] hover:text-[#141413] font-bold"
                      }`}
                    >
                      {formatShortPrice(stop.rate * durationHours)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Hint Box (Changes live with level) */}
      <div
        className={`flex items-center gap-3 rounded-2xl p-4 transition-all duration-300 border ${
          currentStop.level === "golden"
            ? "border-[#E5E0D8] bg-[#FAF9F5] text-[#141413] shadow-2xs"
            : currentStop.level === "high"
            ? "border-[#E5E0D8] bg-[#FAF9F5] text-[#141413]"
            : "border-[#E5E0D8] bg-[#FAF9F5] text-[#141413]"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            currentStop.level === "golden"
              ? "bg-[#141413] text-white shadow-xs"
              : currentStop.level === "high"
              ? "bg-[#141413] text-white"
              : "bg-[#E5E0D8] text-[#141413]"
          }`}
        >
          {currentStop.level === "golden" ? (
            <Sparkles className="h-4.5 w-4.5 text-[#CC785C]" />
          ) : currentStop.level === "high" ? (
            <Award className="h-4.5 w-4.5 text-white" />
          ) : (
            <Info className="h-4.5 w-4.5 text-[#141413]" />
          )}
        </div>

        <div className="space-y-0.5">
          <span className="text-[11px] font-black uppercase tracking-wider block opacity-70">
            تحلیل وضعیت عکاسان داوطلب
          </span>
          <p className="text-xs sm:text-sm font-extrabold leading-relaxed">
            {currentStop.hint}
          </p>
        </div>
      </div>

    </div>
  );
}
