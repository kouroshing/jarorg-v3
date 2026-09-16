"use client";

import React, { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { busyLevelFromHours } from "@/lib/orders/agendaShared";
import type { SpecialistAgendaEvent } from "@/lib/orders/agendaShared";
import { toEnglishDigits } from "@/lib/auth/phone";

export type CalendarDayCell = {
  dateKeyFa: string;
  dateKeyEn: string;
  weekdayShort: string;
  dayNum: string;
  isToday: boolean;
  isPast: boolean;
  busyLevel: 0 | 1 | 2 | 3;
  events: SpecialistAgendaEvent[];
};

const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function buildMonthGrid(events: SpecialistAgendaEvent[], daysAhead = 28): CalendarDayCell[] {
  const byEn = new Map<string, SpecialistAgendaEvent[]>();
  for (const ev of events) {
    const list = byEn.get(ev.dateKeyEn) || [];
    list.push(ev);
    byEn.set(ev.dateKeyEn, list);
  }

  const cells: CalendarDayCell[] = [];
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const fa = new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const en = toEnglishDigits(fa);
    const weekdayShort = new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(d);
    const dayNum = new Intl.DateTimeFormat("fa-IR", { day: "numeric" }).format(d);
    const dayEvents = byEn.get(en) || [];
    const hours = dayEvents.reduce((s, e) => s + e.durationHours, 0);
    cells.push({
      dateKeyFa: fa,
      dateKeyEn: en,
      weekdayShort,
      dayNum,
      isToday: i === 0,
      isPast: false,
      busyLevel: busyLevelFromHours(hours),
      events: dayEvents,
    });
  }
  return cells;
}

const LEVEL_CLASS: Record<0 | 1 | 2 | 3, string> = {
  0: "bg-white border-jar-border text-jar-muted hover:border-jar-primary/50 hover:bg-jar-canvas",
  1: "bg-amber-50 border-amber-200 text-amber-950",
  2: "bg-amber-100 border-amber-300 text-amber-950",
  3: "bg-rose-100 border-rose-300 text-rose-950 cursor-not-allowed",
};

function formatTimeRange(isoStart: string, hours: number): string {
  const start = new Date(isoStart);
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran",
    }).format(d);
  return `${fmt(start)} – ${fmt(end)}`;
}

interface SpecialistWorkCalendarProps {
  events: SpecialistAgendaEvent[];
  selectedDateFa: string | null;
  onSelectDate: (dateKeyFa: string, cell: CalendarDayCell) => void;
  daysAhead?: number;
  loading?: boolean;
  /** Optional: highlight the client's requested day (Persian date string). */
  clientDateFa?: string | null;
}

export default function SpecialistWorkCalendar({
  events,
  selectedDateFa,
  onSelectDate,
  daysAhead = 28,
  loading = false,
  clientDateFa = null,
}: SpecialistWorkCalendarProps) {
  const cells = useMemo(() => buildMonthGrid(events, daysAhead), [events, daysAhead]);
  const [focusEn, setFocusEn] = useState<string | null>(null);

  const selected =
    cells.find((c) => c.dateKeyFa === selectedDateFa) ||
    cells.find((c) => c.dateKeyEn === focusEn) ||
    null;

  return (
    <div className="space-y-3 rounded-2xl border border-jar-border bg-gradient-to-b from-jar-canvas to-white p-3.5 sm:p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-jar-border bg-white text-jar-logo shadow-sm">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs font-black text-jar-primary">تقویم کاری شما</p>
            <p className="text-[10px] text-jar-muted font-medium leading-relaxed">
              روزهای رنگی = پروژهٔ قطعی. در آن بازه پروژهٔ جدید به شما داده نمی‌شود.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 text-[9px] font-bold text-jar-muted">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-white border border-jar-border" />
            آزاد
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-200 border border-amber-300" />
            شلوغ
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-200 border border-rose-300" />
            پر / قفل
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1.5 animate-pulse">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-jar-border/35" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5" dir="rtl">
            {WEEKDAY_LABELS.map((w) => (
              <div
                key={w}
                className="text-center text-[10px] font-bold text-jar-muted/80 py-0.5"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5" dir="rtl">
            {cells.map((cell) => {
              const selectedCell = selectedDateFa === cell.dateKeyFa;
              const locked = cell.busyLevel >= 3;
              const isClientDay = Boolean(clientDateFa && clientDateFa === cell.dateKeyFa);
              return (
                <button
                  key={cell.dateKeyEn}
                  type="button"
                  disabled={locked}
                  title={
                    locked
                      ? "این روز پر است"
                      : cell.events.length
                        ? `${cell.events.length.toLocaleString("fa-IR")} پروژه قطعی`
                        : isClientDay
                          ? "زمان درخواستی کارفرما"
                          : "آزاد"
                  }
                  onClick={() => {
                    if (locked) return;
                    setFocusEn(cell.dateKeyEn);
                    onSelectDate(cell.dateKeyFa, cell);
                  }}
                  className={`relative aspect-square rounded-xl border text-center transition-all duration-150 ${
                    LEVEL_CLASS[cell.busyLevel]
                  } ${
                    selectedCell
                      ? "ring-2 ring-jar-primary ring-offset-1 ring-offset-white scale-[1.05] shadow-md"
                      : ""
                  } ${isClientDay && !selectedCell ? "outline outline-2 outline-offset-1 outline-jar-logo/50" : ""}`}
                >
                  {cell.isToday && (
                    <span className="absolute top-1 left-1 h-1.5 w-1.5 rounded-full bg-jar-logo" />
                  )}
                  <span className="block text-[9px] font-bold opacity-65 leading-none pt-1.5">
                    {cell.weekdayShort}
                  </span>
                  <span className="block text-[12px] font-black font-mono leading-none mt-0.5">
                    {cell.dayNum}
                  </span>
                  {cell.events.length > 0 && (
                    <span className="mx-auto mt-1 block h-1 w-3 rounded-full bg-current opacity-50" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selected && (
        <div className="rounded-2xl border border-jar-border bg-white p-3 text-right space-y-2 shadow-sm">
          <p className="text-[11px] font-black text-jar-primary">
            {selected.isToday ? "امروز" : selected.weekdayShort} · جزئیات روز
            {clientDateFa === selected.dateKeyFa ? " · زمان کارفرما" : ""}
          </p>
          {selected.events.length === 0 ? (
            <p className="text-[11px] text-jar-muted font-medium leading-relaxed">
              این روز در تقویم کاری‌تان خالی است — می‌توانید بازه پیشنهاد دهید.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {selected.events.map((ev) => (
                <li
                  key={ev.orderId}
                  className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-2.5 py-2 text-[11px]"
                >
                  <p className="font-bold text-rose-950">
                    {ev.categoryTitle || "پروژه قطعی"}
                  </p>
                  <p className="text-rose-800/90 font-medium mt-0.5 font-mono">
                    {formatTimeRange(ev.scheduledAt, ev.durationHours)} ·{" "}
                    {ev.durationHours.toLocaleString("fa-IR")} ساعت
                  </p>
                  <p className="text-[10px] text-rose-700/85 mt-1 leading-relaxed">
                    در این بازه پروژهٔ جدید به شما داده نمی‌شود و انتخاب بازهٔ هم‌پوشان ممکن نیست.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
