"use client";

import { CheckCircle, ShieldCheck, Users, Clock, Award } from "lucide-react";

export function StatsBar() {
  return (
    <div id="details" className="w-full pt-16 pb-8 sm:pt-24 sm:pb-12 select-none scroll-mt-24 md:scroll-mt-28" dir="rtl">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-around gap-y-3 gap-x-4 rounded-3xl sm:rounded-full border border-jar-border bg-jar-surface/95 px-6 sm:px-8 py-4 shadow-xs backdrop-blur-xl">
          
          {/* Metric 1 */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-jar-canvas text-jar-primary border border-jar-border">
              <Award className="h-4 w-4" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-jar-muted">پروژه‌های موفق:</span>
                <span className="text-sm font-bold text-jar-primary font-mono">+۱,۴۰۰</span>
              </div>
            </div>
          </div>

          <span className="hidden md:inline h-6 w-px bg-jar-border" />

          {/* Metric 2 */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-jar-canvas text-jar-primary border border-jar-border">
              <Users className="h-4 w-4" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-jar-muted">متخصصین تاییدشده:</span>
                <span className="text-sm font-bold text-jar-primary font-mono">+۵۲۰ نفر</span>
              </div>
            </div>
          </div>

          <span className="hidden md:inline h-6 w-px bg-jar-border" />

          {/* Metric 3 */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-jar-muted">ضمانت مالی:</span>
                <span className="text-sm font-bold text-emerald-800">۱۰۰٪ امن</span>
              </div>
            </div>
          </div>

          <span className="hidden md:inline h-6 w-px bg-jar-border" />

          {/* Metric 4 */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-jar-canvas text-jar-primary border border-jar-border">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-jar-muted">پشتیبانی:</span>
                <span className="text-sm font-bold text-jar-primary">۷ روز هفته</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
