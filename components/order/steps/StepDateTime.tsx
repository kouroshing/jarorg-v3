"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Zap, Check } from "lucide-react";

export interface UpcomingDay {
  dateStr: string;
  weekday: string;
  formattedJalali: string;
  fullLabel: string;
  relativeTag?: string;
  isFriday: boolean;
}

// Generate next 14 days in Persian calendar
export function getUpcoming14Days(): UpcomingDay[] {
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

export const DURATION_OPTIONS = [
  { hours: 1, label: "۱ ساعت" },
  { hours: 2, label: "۲ ساعت (استاندارد)", isPopular: true },
  { hours: 3, label: "۳ ساعت" },
  { hours: 4, label: "۴ ساعت (نیم‌روز)" },
  { hours: 6, label: "۶ ساعت" },
  { hours: 8, label: "۸ ساعت (تمام‌روز)" },
];

export const TIME_SLOTS = [
  { id: "morning", label: "۱۰:۰۰ الی ۱۲:۰۰ (صبح)" },
  { id: "noon", label: "۱۲:۰۰ الی ۱۴:۰۰ (ظهر)" },
  { id: "afternoon", label: "۱۴:۰۰ الی ۱۶:۰۰ (عصر)" },
  { id: "sunset", label: "۱۶:۰۰ الی ۱۸:۰۰ (غروب)" },
  { id: "early-night", label: "۱۸:۰۰ الی ۲۰:۰۰ (سرشب)" },
  { id: "night", label: "۲۰:۰۰ الی ۲۲:۰۰ (شب)" },
];

export interface StepDateTimeProps {
  isFlexibleSchedule: boolean;
  onChangeFlexibleSchedule: (val: boolean) => void;
  bookingDate: string;
  onChangeBookingDate: (date: string) => void;
  durationHours: number;
  onChangeDurationHours: (hours: number) => void;
  timeSlot: string;
  onChangeTimeSlot: (slot: string) => void;
}

export default function StepDateTime({
  isFlexibleSchedule,
  onChangeFlexibleSchedule,
  bookingDate,
  onChangeBookingDate,
  durationHours,
  onChangeDurationHours,
  timeSlot,
  onChangeTimeSlot,
}: StepDateTimeProps) {
  const upcomingDays = useMemo(() => getUpcoming14Days(), []);
  const isScheduleDefault = isFlexibleSchedule;

  return (
    <div className="space-y-6 sm:space-y-7" dir="rtl">
      {/* Editorial Header */}
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-jar-primary tracking-tight">
          زمان‌بندی پروژه‌ات را مشخص کن
        </h2>
      </div>

      {/* 2. SCHEDULING SECTION */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-jar-primary">
            زمان و تاریخ پروژه
          </h3>
          <span className="text-[11px] text-[#A8A29A] font-mono">
            {isScheduleDefault ? "هماهنگی توافقی" : (bookingDate ? `${bookingDate}` : "انتخاب تاریخ")}
          </span>
        </div>

        {/* Text + Checkbox Smart Default Row (No Boxes) */}
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
                ? "bg-jar-primary border-jar-primary text-white shadow-none"
                : "border-jar-border bg-jar-surface group-hover:border-jar-primary/40"
            }`}
          >
            {isScheduleDefault && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-jar-primary transition-colors">
                  سریع‌ترین زمان با هماهنگی توافقی
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                    isScheduleDefault
                      ? "bg-jar-logo/10 text-jar-logo border-jar-logo/20"
                      : "bg-jar-canvas text-jar-muted border-jar-border"
                  }`}
                >
                  پیشنهادی
                </span>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-jar-muted leading-relaxed">
              روز و ساعت دقیق، پس از ثبت سفارش به صورت توافقی بین شما و عکاس هماهنگ می‌شود.
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
              {/* 1. Jalali Date Chips (Claude Editorial Pill Style) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-jar-primary">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-jar-muted" />
                    <span>روز برگزاری پروژه:</span>
                    {bookingDate && (
                      <span className="text-jar-primary font-mono text-[11px] bg-jar-canvas px-2 py-0.2 rounded-full border border-jar-border">
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
                            ? "border-2 border-jar-primary bg-jar-surface text-jar-primary font-bold shadow-xs"
                            : day.isFriday
                            ? "border-jar-border bg-jar-canvas text-jar-muted hover:border-jar-primary/40"
                            : "border-jar-border bg-jar-surface text-jar-primary hover:border-jar-primary/40 hover:bg-jar-soft/40"
                        }`}
                      >
                        <span className="text-[11px] font-bold">{day.weekday}</span>
                        <span className="text-sm font-black font-mono">
                          {day.formattedJalali.split(" ")[0]}
                        </span>
                        <span className={`text-[9px] font-medium ${isSelected ? "text-jar-primary" : "text-[#A8A29A]"}`}>
                          {day.relativeTag || day.formattedJalali.split(" ")[1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-jar-primary flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-jar-muted" />
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
                        className={`py-2 px-3 rounded-full border text-right transition-all cursor-pointer flex items-center justify-between text-xs font-bold ${
                          isSelected
                            ? "border-2 border-jar-primary bg-jar-surface text-jar-primary font-bold shadow-xs"
                            : "border-jar-border bg-jar-surface text-jar-primary hover:border-jar-primary/40 hover:bg-jar-soft/50"
                        }`}
                      >
                        <span className="truncate">{slot.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-jar-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 2. DURATION SECTION - Independent & Always Visible Below Scheduling */}
      <section className="space-y-3 pt-3 border-t border-jar-border">
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-bold text-jar-primary flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-jar-muted" />
            <span>مدت زمان آفیش (ساعت کار)</span>
          </label>
          <span className="text-xs font-bold text-jar-primary bg-jar-canvas px-2.5 py-0.5 rounded-full border border-jar-border font-mono">
            {durationHours} ساعت
          </span>
        </div>

        <p className="text-[11px] sm:text-xs text-jar-muted">
          تخمین حدودی زمان مورد نیاز برای عکاسی یا فیلمبرداری پروژه را انتخاب کنید:
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {DURATION_OPTIONS.map((opt) => {
            const isSelected = durationHours === opt.hours;

            return (
              <button
                key={opt.hours}
                type="button"
                onClick={() => onChangeDurationHours(opt.hours)}
                className={`py-2.5 px-2 rounded-full border text-center transition-all cursor-pointer text-xs font-bold flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? "border-2 border-jar-primary bg-jar-surface text-jar-primary font-bold shadow-xs"
                    : "border-jar-border bg-jar-surface text-jar-primary hover:border-jar-primary/40 hover:bg-jar-soft"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="font-mono text-sm">{opt.hours}</span>
                  <span className="text-[11px]">ساعت</span>
                </div>
                {opt.isPopular && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                      isSelected
                        ? "bg-jar-logo/10 text-jar-logo border-jar-logo/20"
                        : "bg-jar-canvas text-jar-muted border-jar-border"
                    }`}
                  >
                    استاندارد
                  </span>
                )}
                {opt.hours === 4 && (
                  <span className={`text-[9px] ${isSelected ? "text-jar-primary" : "text-[#A8A29A]"}`}>نیم‌روز</span>
                )}
                {opt.hours === 8 && (
                  <span className={`text-[9px] ${isSelected ? "text-jar-primary" : "text-[#A8A29A]"}`}>تمام‌روز</span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
