"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Coins,
} from "lucide-react";
import { BUDGET_STOPS, formatPrice, BudgetStop } from "@/components/order/BudgetSlider";

// 4 Core High-Conversion Budget Tiers
export const PRIMARY_BUDGET_TIERS = [
  {
    index: 1,
    title: "اقتصادی",
    rate: 1800000,
    shortRate: "۱.۸ م ت/ساعت",
    subtitle: "مناسب عکاسی پایه",
    isAutoPriced: false,
  },
  {
    index: 3,
    title: "استاندارد",
    rate: 3600000,
    shortRate: "۳.۶ م ت/ساعت",
    badge: "پیشنهادی جار",
    subtitle: "تعادل پیشنهادی و تضمینی",
    isAutoPriced: true,
  },
  {
    index: 4,
    title: "حرفه‌ای",
    rate: 6500000,
    shortRate: "۶.۵ م ت/ساعت",
    subtitle: "تجهیزات و سابقه بالا",
    isAutoPriced: false,
  },
  {
    index: 5,
    title: "ویژه و VIP",
    rate: 11000000,
    shortRate: "۱۱ م ت/ساعت",
    subtitle: "کیفیت سینمایی و برند",
    isAutoPriced: false,
  },
];

export interface StepBudgetProps {
  isAutoPriced: boolean;
  onChangeAutoPriced: (val: boolean) => void;
  selectedBudgetIndex: number;
  onChangeBudgetIndex: (val: number) => void;
  durationHours: number;
}

export default function StepBudget({
  isAutoPriced,
  onChangeAutoPriced,
  selectedBudgetIndex,
  onChangeBudgetIndex,
  durationHours,
}: StepBudgetProps) {
  const currentBudgetStop: BudgetStop = BUDGET_STOPS[selectedBudgetIndex] || BUDGET_STOPS[3];
  const goldenStop = BUDGET_STOPS[3]; // Golden balance default (3.6m / hr)

  const effectiveRate = isAutoPriced ? goldenStop.rate : currentBudgetStop.rate;
  const totalEstimatedPrice = effectiveRate * durationHours;

  // Toggle for Advanced Slider View
  const [showAdvancedSlider, setShowAdvancedSlider] = useState(false);

  // Draggable Slider Track Reference & State
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
    onChangeAutoPriced(targetIndex === 3);
    onChangeBudgetIndex(targetIndex);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      const fraction = getFractionFromClientX(e.clientX);
      const percent = fraction * 100;
      setDragPercent(percent);
      const targetIndex = Math.round(fraction * (BUDGET_STOPS.length - 1));
      onChangeAutoPriced(targetIndex === 3);
      onChangeBudgetIndex(targetIndex);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore if not captured
      }
      setDragPercent(null);
    }
  };

  const isBudgetGoldenDefault = isAutoPriced;

  return (
    <div className="space-y-6 sm:space-y-7" dir="rtl">
      {/* Editorial Header */}
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-jar-primary tracking-tight">
          بودجه و سطح متخصص را مشخص کن
        </h2>
      </div>

      {/* BUDGET SECTION */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-jar-primary">
            بودجه و سطح متخصص
          </h3>
          <span className="text-[11px] text-jar-muted font-mono">
            نرخ ساعتی: {formatPrice(effectiveRate)} ت
          </span>
        </div>

        {/* Text + Checkbox Smart Default Row (No Boxes) */}
        <div
          role="checkbox"
          aria-checked={isBudgetGoldenDefault}
          tabIndex={0}
          onClick={() => {
            if (isBudgetGoldenDefault) {
              onChangeAutoPriced(false);
            } else {
              onChangeAutoPriced(true);
              onChangeBudgetIndex(3);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              if (isBudgetGoldenDefault) {
                onChangeAutoPriced(false);
              } else {
                onChangeAutoPriced(true);
                onChangeBudgetIndex(3);
              }
            }
          }}
          className="group flex items-start gap-3 py-1 cursor-pointer select-none"
        >
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-md border shrink-0 mt-0.5 transition-all ${
              isBudgetGoldenDefault
                ? "bg-jar-primary border-jar-primary text-white shadow-xs"
                : "border-jar-border bg-jar-surface group-hover:border-jar-primary/40"
            }`}
          >
            {isBudgetGoldenDefault && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-jar-primary group-hover:text-black transition-colors">
                  نرخ استاندارد و پیشنهادی جار
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    isBudgetGoldenDefault
                      ? "bg-jar-logo/10 text-jar-logo border-jar-logo/20"
                      : "bg-jar-canvas text-jar-muted border-jar-border"
                  }`}
                >
                  پیشنهادی
                </span>
              </div>
              <span className="text-xs sm:text-sm font-mono font-black text-jar-primary">
                ۳,۶۰۰,۰۰۰ ت/ساعت
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-jar-muted leading-relaxed">
              تعادل پیشنهادی بین کیفیت عالی و بیشترین سرعت پذیرش عکاس.
            </p>
          </div>
        </div>

        {/* Progressive Disclosure: Manual Tiers & Slider expand if unchecked */}
        <AnimatePresence>
          {!isBudgetGoldenDefault && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3 pt-2 overflow-hidden"
            >
              {/* 4 Clean Minimal Primary Tiers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                {PRIMARY_BUDGET_TIERS.map((tier) => {
                  const isSelected =
                    (tier.isAutoPriced && isAutoPriced) ||
                    (!isAutoPriced && selectedBudgetIndex === tier.index);

                  return (
                    <button
                      key={tier.index}
                      type="button"
                      onClick={() => {
                        onChangeAutoPriced(false);
                        onChangeBudgetIndex(tier.index);
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-right transition-all cursor-pointer relative flex flex-col justify-between min-h-[96px] sm:min-h-[105px] ${
                        isSelected
                          ? "border-2 border-jar-primary bg-jar-surface text-jar-primary shadow-xs"
                          : "border-jar-border bg-jar-surface hover:border-jar-primary/40 text-jar-primary"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm font-black text-jar-primary">
                            {tier.title}
                          </span>
                          {isSelected ? (
                            <span className="flex h-4 w-4 rounded-full bg-jar-primary text-white border border-jar-primary items-center justify-center">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="flex h-4 w-4 rounded-full border border-jar-border bg-jar-surface" />
                          )}
                        </div>
                        <span
                          className={`block text-xs sm:text-sm font-mono ${
                            isSelected ? "font-black text-jar-primary" : "font-bold text-jar-muted"
                          }`}
                        >
                          {tier.shortRate}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <span className="block text-[10px] text-jar-muted leading-tight">
                          {tier.subtitle}
                        </span>
                        {tier.badge && (
                          <span
                            className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                              isSelected
                                ? "bg-jar-logo/10 text-jar-logo border-jar-logo/20"
                                : "bg-jar-canvas text-jar-muted border-jar-border"
                            }`}
                          >
                            {tier.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 1-Line Dynamic Acceptance Hint */}
              <div className="px-3 py-2 rounded-xl bg-jar-canvas border border-jar-border flex items-center gap-2 text-jar-muted text-[11px] font-medium">
                <Info className="h-3.5 w-3.5 text-[#A8A29A] shrink-0" />
                <span>{currentBudgetStop.hint}</span>
              </div>

              {/* Advanced Slider Accordion Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSlider(!showAdvancedSlider)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-jar-muted hover:text-jar-primary transition-colors cursor-pointer py-1"
                >
                  <SlidersHorizontal className="h-3 w-3 text-[#A8A29A]" />
                  <span>{showAdvancedSlider ? "بستن تنظیم دستی اسلایدر" : "تنظیم دستی با اسلایدر و سطوح بیشتر"}</span>
                  {showAdvancedSlider ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </div>

              {/* Progressive Disclosure: Snapp-Style 7-Stop Slider */}
              <AnimatePresence>
                {showAdvancedSlider && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28 }}
                    className="pt-2 overflow-hidden space-y-3"
                  >
                    <div className="rounded-2xl border border-jar-border bg-jar-surface p-3.5 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-jar-muted">
                        <span>پایه (۹۰۰ هزار ت)</span>
                        <span className="text-jar-primary font-black">پیشنهادی جار (۳.۶ م ت)</span>
                        <span>VIP (۱۸ م ت)</span>
                      </div>

                      {/* Interactive Slider Track */}
                      <div className="py-1 px-4">
                        <div
                          ref={trackRef}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          className="relative h-8 flex items-center cursor-pointer touch-none select-none"
                          role="slider"
                          aria-label="اسلایدر تعیین نرخ بودجه"
                          aria-valuemin={0}
                          aria-valuemax={6}
                          aria-valuenow={selectedBudgetIndex}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowLeft") {
                              e.preventDefault();
                              const next = Math.min(6, selectedBudgetIndex + 1);
                              onChangeAutoPriced(next === 3);
                              onChangeBudgetIndex(next);
                            } else if (e.key === "ArrowRight") {
                              e.preventDefault();
                              const prev = Math.max(0, selectedBudgetIndex - 1);
                              onChangeAutoPriced(prev === 3);
                              onChangeBudgetIndex(prev);
                            }
                          }}
                        >
                          {/* Background Track Line */}
                          <div className="relative h-2 w-full rounded-full bg-jar-border shadow-inner overflow-hidden">
                            <div
                              className={`absolute top-0 right-0 h-full rounded-full bg-jar-primary ${
                                dragPercent !== null ? "" : "transition-all duration-200 ease-out"
                              }`}
                              style={{
                                width: `${
                                  dragPercent !== null
                                    ? dragPercent
                                    : (selectedBudgetIndex / (BUDGET_STOPS.length - 1)) * 100
                                  }%`,
                              }}
                            />
                          </div>

                          {/* 7 Station Dots */}
                          <div className="absolute inset-0 pointer-events-none">
                            {BUDGET_STOPS.map((stop) => {
                              const isPassedOrActive = stop.index <= selectedBudgetIndex;
                              const isCurrent = stop.index === selectedBudgetIndex;
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
                                        onChangeAutoPriced(stop.index === 3);
                                        onChangeBudgetIndex(stop.index);
                                      }}
                                      className={`w-3 h-3 rounded-full border-2 border-white transition-all cursor-pointer ${
                                        isCurrent
                                          ? "bg-jar-primary ring-2 ring-jar-primary/40 scale-125"
                                          : isPassedOrActive
                                          ? "bg-jar-primary"
                                          : "bg-jar-border"
                                      }`}
                                      aria-label={stop.shortLabel}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Draggable Handle */}
                          <div className="absolute inset-0 pointer-events-none">
                            <motion.div
                              className="absolute top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-30"
                              style={{
                                right: `${
                                  dragPercent !== null
                                    ? dragPercent
                                    : (selectedBudgetIndex / (BUDGET_STOPS.length - 1)) * 100
                                }`,
                              }}
                              animate={{
                                right: `${
                                  dragPercent !== null
                                    ? dragPercent
                                    : (selectedBudgetIndex / (BUDGET_STOPS.length - 1)) * 100
                                }%`,
                              }}
                              transition={
                                dragPercent !== null
                                  ? { duration: 0 }
                                  : { type: "spring", stiffness: 500, damping: 32 }
                              }
                            >
                              <div className="translate-x-1/2 flex items-center justify-center pointer-events-auto">
                                <div className="h-6 w-10 rounded-full bg-white border border-[#E5E0D8] hover:border-[#141413] shadow-xs flex items-center justify-center gap-0.5 cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-transform">
                                  <ChevronLeft className="h-3 w-3 text-[#141413]" />
                                  <ChevronRight className="h-3 w-3 text-[#141413]" />
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      </div>

                      {/* 7 Quick Stop Chips */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x -mx-1 px-1">
                        {BUDGET_STOPS.map((stop) => {
                          const isSelected = selectedBudgetIndex === stop.index;

                          return (
                            <button
                              key={stop.index}
                              type="button"
                              onClick={() => {
                                onChangeAutoPriced(stop.index === 3);
                                onChangeBudgetIndex(stop.index);
                              }}
                              className={`shrink-0 py-1.5 px-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? "border-2 border-[#141413] bg-white text-[#141413] font-black shadow-xs"
                                  : "border-[#E5E0D8] bg-white text-[#141413] hover:border-[#141413]/40 text-[11px]"
                              }`}
                            >
                              <span className={`block text-[11px] font-mono font-bold leading-none ${
                                isSelected ? "text-[#141413]" : "text-[#141413]"
                              }`}>
                                {stop.shortLabel}
                              </span>
                              <span className={`block text-[9px] truncate mt-0.5 ${
                                isSelected ? "text-[#CC785C] font-bold" : "text-[#66605B]"
                              }`}>
                                {stop.badge.split(" ")[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sleek Minimal Financial Summary Bar */}
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#141413] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs border border-[#141413]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#282725] border border-[#3E3B37] flex items-center justify-center shrink-0 text-[#FAF9F5]">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#FAF9F5]">
                برآورد کل پروژه ({durationHours} ساعت آفیش)
              </div>
              <div className="text-[11px] text-[#A8A29A]">
                ساعتی {formatPrice(effectiveRate)} تومان • ثبت رایگان در رادار
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 self-end sm:self-auto">
            <span className="text-lg sm:text-xl font-black font-mono text-white">
              {formatPrice(totalEstimatedPrice)}
            </span>
            <span className="text-xs font-bold text-[#A8A29A]">تومان</span>
          </div>
        </div>
      </section>
    </div>
  );
}
