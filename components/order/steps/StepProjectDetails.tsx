"use client";

import React, { useMemo, useRef, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  MessageSquareText,
  Landmark,
  Check,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  Info,
  CalendarDays,
  Coins,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { BUDGET_STOPS, formatPrice, formatShortPrice, BudgetStop } from "@/components/order/BudgetSlider";
import { LocationType } from "./StepLocation";
import { UpcomingDay } from "./StepDateTime";

const LocationMapPicker = dynamic(
  () => import("@/components/order/LocationMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 rounded-2xl bg-slate-100/90 border border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 animate-pulse">
        <MapPin className="h-7 w-7 text-[#141413] animate-bounce" />
        <span className="text-xs font-bold text-slate-500">در حال بارگذاری نقشه...</span>
      </div>
    ),
  }
);

// Generate next 14 days in Persian calendar
function getUpcoming14Days(): UpcomingDay[] {
  const days: UpcomingDay[] = [];
  const now = new Date();

  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const fullStr = new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

    const weekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(d);
    const dayMonth = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long" }).format(d);

    let relativeTag: string | undefined;
    if (i === 0) relativeTag = "امروز";
    else if (i === 1) relativeTag = "فردا";
    else if (i === 2) relativeTag = "پس‌فردا";

    const isFriday = d.getDay() === 5;

    days.push({
      dateStr: fullStr,
      weekday,
      formattedJalali: dayMonth,
      fullLabel: `${weekday} ${dayMonth}`,
      relativeTag,
      isFriday,
    });
  }

  return days;
}

const DURATION_OPTIONS = [
  { hours: 1, label: "۱ ساعت" },
  { hours: 2, label: "۲ ساعت (استاندارد)", isPopular: true },
  { hours: 3, label: "۳ ساعت" },
  { hours: 4, label: "۴ ساعت (نیم‌روز)" },
  { hours: 6, label: "۶ ساعت" },
  { hours: 8, label: "۸ ساعت (تمام‌روز)" },
];

const TIME_SLOTS = [
  { id: "morning", label: "۱۰:۰۰ الی ۱۲:۰۰ (صبح)" },
  { id: "noon", label: "۱۲:۰۰ الی ۱۴:۰۰ (ظهر)" },
  { id: "afternoon", label: "۱۴:۰۰ الی ۱۶:۰۰ (عصر)" },
  { id: "sunset", label: "۱۶:۰۰ الی ۱۸:۰۰ (غروب)" },
  { id: "early-night", label: "۱۸:۰۰ الی ۲۰:۰۰ (سرشب)" },
  { id: "night", label: "۲۰:۰۰ الی ۲۲:۰۰ (شب)" },
];

// 4 Core High-Conversion Budget Tiers
const PRIMARY_BUDGET_TIERS = [
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
    subtitle: "تعادل طلایی و تضمینی",
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

export interface StepProjectDetailsProps {
  // Location props
  locationType: LocationType;
  onChangeLocationType: (val: LocationType) => void;
  locationAddress: string;
  onChangeLocationAddress: (val: string) => void;
  districtOrCity: string;
  onChangeDistrictOrCity: (val: string) => void;

  // Scheduling props
  isFlexibleSchedule: boolean;
  onChangeFlexibleSchedule: (val: boolean) => void;
  bookingDate: string;
  onChangeBookingDate: (val: string) => void;
  durationHours: number;
  onChangeDurationHours: (val: number) => void;
  timeSlot: string;
  onChangeTimeSlot: (val: string) => void;

  // Budget props
  isAutoPriced: boolean;
  onChangeAutoPriced: (val: boolean) => void;
  selectedBudgetIndex: number;
  onChangeBudgetIndex: (val: number) => void;
}

export default function StepProjectDetails({
  locationType,
  onChangeLocationType,
  locationAddress,
  onChangeLocationAddress,
  districtOrCity,
  onChangeDistrictOrCity,

  isFlexibleSchedule,
  onChangeFlexibleSchedule,
  bookingDate,
  onChangeBookingDate,
  durationHours,
  onChangeDurationHours,
  timeSlot,
  onChangeTimeSlot,

  isAutoPriced,
  onChangeAutoPriced,
  selectedBudgetIndex,
  onChangeBudgetIndex,
}: StepProjectDetailsProps) {
  const upcomingDays = useMemo(() => getUpcoming14Days(), []);
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

  const isLocationDefault = locationType === "SPECIALIST_ADVICE";
  const isScheduleDefault = isFlexibleSchedule;
  const isBudgetGoldenDefault = isAutoPriced;

  return (
    <div className="space-y-6 sm:space-y-7" dir="rtl">
      {/* 0. Editorial Header: Minimal & Direct */}
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-950 tracking-tight">
          جزئیات اجرای پروژه‌ات رو مشخص کن
        </h2>
      </div>

      {/* ========================================================================= */}
      {/* 1. LOCATION SECTION */}
      {/* ========================================================================= */}
      <section className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 rounded-full bg-slate-900 text-white items-center justify-center text-[10px] font-black">
              ۱
            </span>
            <h3 className="text-xs sm:text-sm font-black text-slate-950">
              محل پروژه
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {isLocationDefault
              ? "پیشنهاد عکاس"
              : locationType === "CLIENT_LOCATION"
              ? "محل شما"
              : "استودیو"}
          </span>
        </div>

        {/* Text + Checkbox Smart Default Row */}
        <div
          role="checkbox"
          aria-checked={isLocationDefault}
          tabIndex={0}
          onClick={() => {
            if (isLocationDefault) {
              onChangeLocationType("CLIENT_LOCATION");
            } else {
              onChangeLocationType("SPECIALIST_ADVICE");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              if (isLocationDefault) {
                onChangeLocationType("CLIENT_LOCATION");
              } else {
                onChangeLocationType("SPECIALIST_ADVICE");
              }
            }
          }}
          className="group flex items-start gap-3 py-1 cursor-pointer select-none"
        >
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-md border shrink-0 mt-0.5 transition-all ${
              isLocationDefault
                ? "bg-[#141413] border-[#141413] text-slate-950 shadow-xs"
                : "border-slate-300 bg-white group-hover:border-slate-400"
            }`}
          >
            {isLocationDefault && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-950 group-hover:text-amber-950 transition-colors">
                  پیشنهاد لوکیشن با مشورت عکاس
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                    isLocationDefault
                      ? "bg-amber-100/90 text-amber-950 border-amber-300/80"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  پیشنهادی
                </span>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
              عکاس بر اساس سبک کار، بهترین لوکیشن‌ها را پیشنهاد می‌دهد.
            </p>
          </div>
        </div>

        {/* Progressive Disclosure: Options expand if unchecked */}
        <AnimatePresence>
          {!isLocationDefault && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3 pt-1 overflow-hidden"
            >
              <div className="space-y-2 pr-8 pt-1">
                <div
                  role="radio"
                  aria-checked={locationType === "CLIENT_LOCATION"}
                  tabIndex={0}
                  onClick={() => onChangeLocationType("CLIENT_LOCATION")}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      onChangeLocationType("CLIENT_LOCATION");
                    }
                  }}
                  className="group flex items-start gap-2.5 py-1 cursor-pointer select-none"
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border shrink-0 mt-0.5 transition-all ${
                      locationType === "CLIENT_LOCATION"
                        ? "border-[#141413] bg-[#141413] text-slate-950"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    }`}
                  >
                    {locationType === "CLIENT_LOCATION" && (
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                    )}
                  </div>
                  <div>
                    <span
                      className={`block text-xs sm:text-sm font-bold transition-colors ${
                        locationType === "CLIENT_LOCATION"
                          ? "text-slate-950 font-black"
                          : "text-slate-700 group-hover:text-slate-950"
                      }`}
                    >
                      در محل شما
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      منزل، محل کار یا فضای باز
                    </span>
                  </div>
                </div>

                <div
                  role="radio"
                  aria-checked={locationType === "JAR_STUDIO"}
                  tabIndex={0}
                  onClick={() => onChangeLocationType("JAR_STUDIO")}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      onChangeLocationType("JAR_STUDIO");
                    }
                  }}
                  className="group flex items-start gap-2.5 py-1 cursor-pointer select-none"
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border shrink-0 mt-0.5 transition-all ${
                      locationType === "JAR_STUDIO"
                        ? "border-[#141413] bg-[#141413] text-slate-950"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    }`}
                  >
                    {locationType === "JAR_STUDIO" && (
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                    )}
                  </div>
                  <div>
                    <span
                      className={`block text-xs sm:text-sm font-bold transition-colors ${
                        locationType === "JAR_STUDIO"
                          ? "text-slate-950 font-black"
                          : "text-slate-700 group-hover:text-slate-950"
                      }`}
                    >
                      استودیوهای همکار جار
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      آتلیه و عمارت‌های مجهز
                    </span>
                  </div>
                </div>
              </div>

              {locationType === "CLIENT_LOCATION" && (
                <LocationMapPicker
                  district={districtOrCity}
                  onChangeDistrict={onChangeDistrictOrCity}
                  address={locationAddress}
                  onChangeAddress={onChangeLocationAddress}
                />
              )}

              {locationType === "JAR_STUDIO" && (
                <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-600 text-[11px] font-medium">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>آدرس و هماهنگی استودیو پس از انتخاب عکاس انجام می‌شود.</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ========================================================================= */}
      {/* 2. SCHEDULING SECTION */}
      {/* ========================================================================= */}
      <section className="space-y-2.5 pt-3 border-t border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 rounded-full bg-slate-900 text-white items-center justify-center text-[10px] font-black">
              ۲
            </span>
            <h3 className="text-xs sm:text-sm font-black text-slate-950">
              زمان‌بندی پروژه
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {isScheduleDefault ? "توافق با متخصص" : `${durationHours} ساعت آفیش`}
          </span>
        </div>

        {/* Text + Checkbox Smart Default Row */}
        <div
          role="checkbox"
          aria-checked={isScheduleDefault}
          tabIndex={0}
          onClick={() => {
            if (isScheduleDefault) {
              onChangeFlexibleSchedule(false);
              if (!bookingDate && upcomingDays.length > 0) {
                onChangeBookingDate(upcomingDays[0].dateStr);
              }
              if (!timeSlot && TIME_SLOTS.length > 0) {
                onChangeTimeSlot(TIME_SLOTS[2].label);
              }
            } else {
              onChangeFlexibleSchedule(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              if (isScheduleDefault) {
                onChangeFlexibleSchedule(false);
                if (!bookingDate && upcomingDays.length > 0) {
                  onChangeBookingDate(upcomingDays[0].dateStr);
                }
                if (!timeSlot && TIME_SLOTS.length > 0) {
                  onChangeTimeSlot(TIME_SLOTS[2].label);
                }
              } else {
                onChangeFlexibleSchedule(true);
              }
            }
          }}
          className="group flex items-start gap-3 py-1 cursor-pointer select-none"
        >
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-md border shrink-0 mt-0.5 transition-all ${
              isScheduleDefault
                ? "bg-[#141413] border-[#141413] text-slate-950 shadow-xs"
                : "border-slate-300 bg-white group-hover:border-slate-400"
            }`}
          >
            {isScheduleDefault && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-950 group-hover:text-amber-950 transition-colors">
                  بهترین زمان با توافق متخصص
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                    isScheduleDefault
                      ? "bg-amber-100/90 text-amber-950 border-amber-300/80"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  پیشنهادی
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-600 font-bold">
                پایه ۲ ساعت
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
              روز و ساعت دقیق را بعد از انتخاب متخصص، با هم هماهنگ می‌کنید — لازم نیست الان تاریخ قطعی بگذارید.
            </p>
          </div>
        </div>

        {/* Progressive Disclosure: Calendar, Duration & Slots expand if unchecked */}
        <AnimatePresence>
          {!isScheduleDefault && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 pt-2 overflow-hidden"
            >
              {/* 1. Jalali Date Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>روز برگزاری پروژه:</span>
                    {bookingDate && (
                      <span className="text-slate-800 font-mono text-[11px] bg-slate-100 px-2 py-0.2 rounded-full border border-slate-200">
                        {bookingDate}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none touch-pan-x -mx-1 px-1">
                  {upcomingDays.map((day) => {
                    const isSelected = bookingDate === day.dateStr;

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => onChangeBookingDate(day.dateStr)}
                        className={`shrink-0 flex flex-col items-center justify-between min-w-[70px] sm:min-w-[76px] h-[72px] sm:h-[78px] px-1.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#141413] bg-[#141413] text-slate-950 font-black shadow-xs"
                            : day.isFriday
                            ? "border-rose-200 bg-rose-50/40 text-rose-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-[11px] font-bold">{day.weekday}</span>
                        <span className="text-sm font-black font-mono">
                          {day.formattedJalali.split(" ")[0]}
                        </span>
                        <span className="text-[9px] font-medium opacity-80">
                          {day.relativeTag || day.formattedJalali.split(" ")[1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Duration Chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>مدت زمان آفیش:</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {DURATION_OPTIONS.map((opt) => {
                    const isSelected = durationHours === opt.hours;

                    return (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => onChangeDurationHours(opt.hours)}
                        className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                          isSelected
                            ? "border-[#141413] bg-amber-50/70 text-slate-950 font-black ring-1 ring-[#141413]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Time Slots Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-slate-500" />
                  <span>بازه زمانی شروع:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = timeSlot === slot.label;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => onChangeTimeSlot(slot.label)}
                        className={`py-2 px-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                          isSelected
                            ? "border-[#141413] bg-amber-50/70 text-slate-950 font-black ring-1 ring-[#141413]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="truncate">{slot.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-slate-950 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ========================================================================= */}
      {/* 3. BUDGET SECTION */}
      {/* ========================================================================= */}
      <section className="space-y-2.5 pt-3 border-t border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 rounded-full bg-slate-900 text-white items-center justify-center text-[10px] font-black">
              ۳
            </span>
            <h3 className="text-xs sm:text-sm font-black text-slate-950">
              بودجه و سطح متخصص
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            نرخ ساعتی: {formatPrice(effectiveRate)} ت
          </span>
        </div>

        {/* Text + Checkbox Smart Default Row */}
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
                ? "bg-[#141413] border-[#141413] text-slate-950 shadow-xs"
                : "border-slate-300 bg-white group-hover:border-slate-400"
            }`}
          >
            {isBudgetGoldenDefault && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-950 group-hover:text-amber-950 transition-colors">
                  نرخ استاندارد و پیشنهادی جار
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                    isBudgetGoldenDefault
                      ? "bg-amber-100/90 text-amber-950 border-amber-300/80"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  پیشنهادی
                </span>
              </div>
              <span className="text-xs sm:text-sm font-mono font-black text-amber-950">
                ۳,۶۰۰,۰۰۰ ت/ساعت
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
              تعادل طلایی بین کیفیت عالی و بیشترین سرعت پذیرش عکاس.
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
                          ? "border-[#141413] bg-amber-50/30 text-slate-950 ring-1 ring-[#141413]/25 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm font-black text-slate-950">
                            {tier.title}
                          </span>
                          {isSelected ? (
                            <span className="flex h-3.5 w-3.5 rounded-full bg-[#141413] text-slate-950 items-center justify-center">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="flex h-3.5 w-3.5 rounded-full border border-slate-300 bg-white" />
                          )}
                        </div>
                        <span
                          className={`block text-xs sm:text-sm font-mono ${
                            isSelected ? "font-black text-amber-950" : "font-bold text-slate-900"
                          }`}
                        >
                          {tier.shortRate}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <span className="block text-[10px] text-slate-500 leading-tight">
                          {tier.subtitle}
                        </span>
                        {tier.badge && (
                          <span
                            className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                              isSelected
                                ? "bg-amber-100/90 text-amber-950 border-amber-300/80"
                                : "bg-slate-100 text-slate-600 border-slate-200"
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
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-600 text-[11px] font-medium">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{currentBudgetStop.hint}</span>
              </div>

              {/* Advanced Slider Accordion Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSlider(!showAdvancedSlider)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer py-1"
                >
                  <SlidersHorizontal className="h-3 w-3 text-slate-400" />
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
                    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span className="text-slate-700">پایه (۹۰۰ هزار ت)</span>
                        <span className="text-amber-900 font-black">تعادل طلایی جار (۳.۶ م ت)</span>
                        <span className="text-slate-700">VIP (۱۸ م ت)</span>
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
                          <div className="relative h-2 w-full rounded-full bg-slate-200 shadow-inner overflow-hidden">
                            <div
                              className={`absolute top-0 right-0 h-full rounded-full bg-[#141413] ${
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
                                          ? "bg-[#141413] ring-2 ring-[#141413]/40 scale-125"
                                          : isPassedOrActive
                                          ? "bg-[#141413]"
                                          : "bg-slate-300"
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
                                }%`,
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
                                <div className="h-6 w-10 rounded-full bg-white border border-slate-300 hover:border-[#141413] shadow-sm flex items-center justify-center gap-0.5 cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-transform">
                                  <ChevronLeft className="h-3 w-3 text-slate-700" />
                                  <ChevronRight className="h-3 w-3 text-slate-700" />
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
                              className={`shrink-0 py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#141413] bg-amber-50/70 text-slate-950 font-black ring-1 ring-[#141413]"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 text-[11px]"
                              }`}
                            >
                              <span className="block text-[11px] font-mono font-bold leading-none">
                                {stop.shortLabel}
                              </span>
                              <span className="block text-[9px] text-slate-500 truncate mt-0.5">
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
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs border border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-white">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300">
                برآورد کل پروژه ({durationHours} ساعت آفیش)
              </div>
              <div className="text-[11px] text-slate-400">
                ساعتی {formatPrice(effectiveRate)} تومان • ثبت رایگان در رادار
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 self-end sm:self-auto">
            <span className="text-lg sm:text-xl font-black font-mono text-[#141413]">
              {formatPrice(totalEstimatedPrice)}
            </span>
            <span className="text-xs font-bold text-slate-400">تومان</span>
          </div>
        </div>
      </section>
    </div>
  );
}

