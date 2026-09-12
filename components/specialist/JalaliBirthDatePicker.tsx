"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  JALALI_MONTHS_FA,
  formatJalaliYmd,
  formatJalaliYmdFa,
  jalaliMonthLength,
  jalaliToGregorian,
  parseJalaliYmd,
  todayJalali,
  toPersianDigits,
} from "@/lib/date/jalali";

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

/** Birth-year window (roughly ages 15–80). */
function yearOptions(maxJy: number): number[] {
  const end = Math.max(1300, maxJy - 15);
  const start = Math.max(1300, maxJy - 80);
  const years: number[] = [];
  for (let y = end; y >= start; y -= 1) years.push(y);
  return years;
}

/** Weekday of Jalali 1st: 0=Sat … 6=Fri. */
function firstWeekdayOffset(jy: number, jm: number): number {
  const g = jalaliToGregorian(jy, jm, 1);
  const utc = Date.UTC(g.gy, g.gm - 1, g.gd);
  const sunFirst = new Date(utc).getUTCDay();
  return (sunFirst + 1) % 7;
}

type Props = {
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  id?: string;
};

export default function JalaliBirthDatePicker({ value, onChange, disabled, id }: Props) {
  const today = useMemo(() => todayJalali(), []);
  const parsed = parseJalaliYmd(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.jy ?? 1370);
  const [viewMonth, setViewMonth] = useState(parsed?.jm ?? 1);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (parsed) {
      setViewYear(parsed.jy);
      setViewMonth(parsed.jm);
    }
  }, [open, parsed?.jy, parsed?.jm]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const daysInMonth = jalaliMonthLength(viewYear, viewMonth);
  const offset = firstWeekdayOffset(viewYear, viewMonth);
  const years = yearOptions(today.jy);

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    if (y < years[years.length - 1] || y > years[0]) return;
    setViewYear(y);
    setViewMonth(m);
  };

  const pickDay = (jd: number) => {
    onChange(formatJalaliYmd(viewYear, viewMonth, jd));
    setOpen(false);
  };

  const display = value ? formatJalaliYmdFa(value) : "";

  return (
    <div ref={rootRef} className="relative" dir="rtl">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full h-11 items-center justify-between gap-2 px-3 rounded-xl border border-jar-border bg-jar-canvas text-sm text-jar-primary outline-none focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20 disabled:opacity-50"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={display ? "font-medium" : "text-jar-muted"}>
          {display || "انتخاب تاریخ از تقویم فارسی"}
        </span>
        <CalendarDays className="h-4 w-4 text-jar-logo shrink-0" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="تقویم شمسی تاریخ تولد"
          className="absolute z-40 mt-2 w-full min-w-[280px] rounded-2xl border border-jar-border bg-jar-surface p-3 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-jar-border text-jar-muted hover:bg-jar-soft"
              aria-label="ماه بعد"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="flex-1 h-8 rounded-lg border border-jar-border bg-jar-canvas px-2 text-xs font-bold text-jar-primary"
            >
              {JALALI_MONTHS_FA.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="w-[5.5rem] h-8 rounded-lg border border-jar-border bg-jar-canvas px-2 text-xs font-bold text-jar-primary"
              dir="ltr"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {toPersianDigits(y)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-jar-border text-jar-muted hover:bg-jar-soft"
              aria-label="ماه قبل"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="h-7 flex items-center justify-center text-[11px] font-bold text-jar-muted"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`e-${i}`} className="h-9" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((jd) => {
              const selected =
                parsed &&
                parsed.jy === viewYear &&
                parsed.jm === viewMonth &&
                parsed.jd === jd;
              return (
                <button
                  key={jd}
                  type="button"
                  onClick={() => pickDay(jd)}
                  className={`h-9 rounded-xl text-xs font-bold transition-colors ${
                    selected
                      ? "bg-jar-primary text-white"
                      : "text-jar-primary hover:bg-jar-soft"
                  }`}
                >
                  {toPersianDigits(jd)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
