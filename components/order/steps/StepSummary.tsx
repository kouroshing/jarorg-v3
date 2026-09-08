"use client";

import React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  User,
  Phone,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { formatPrice } from "@/components/order/BudgetSlider";
import { CategoryIcon } from "@/components/order/steps/StepCategory";

interface StepSummaryProps {
  categoryTitle: string;
  categorySlug?: string;
  isFlexibleSchedule?: boolean;
  bookingDate: string;
  timeSlot: string;
  durationHours: number;
  hourlyRate: number;
  locationLabel: string;
  contactName: string;
  onChangeContactName: (val: string) => void;
  contactPhone: string;
  onChangeContactPhone: (val: string) => void;
  projectDescription?: string;
  onChangeProjectDescription?: (val: string) => void;
}

export default function StepSummary({
  categoryTitle,
  categorySlug,
  isFlexibleSchedule = false,
  bookingDate,
  timeSlot,
  durationHours,
  hourlyRate,
  locationLabel,
  contactName,
  onChangeContactName,
  contactPhone,
  onChangeContactPhone,
  projectDescription,
  onChangeProjectDescription,
}: StepSummaryProps) {
  const totalEstimatedPrice = hourlyRate * durationHours;

  const isPhoneValid = contactPhone.replace(/\D/g, "").length >= 10;
  const isNameValid = contactName.trim().length >= 2;

  return (
    <div className="space-y-3.5 pt-4 border-t border-jar-border" dir="rtl">
      {/* Section Subtitle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-jar-logo" />
          <h3 className="text-xs sm:text-sm font-black text-jar-primary">
            پیش‌فاکتور و اطلاعات تماس کارفرما
          </h3>
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
          ثبت اولیه ۱۰۰٪ رایگان
        </span>
      </div>

      {/* Compact Invoice Summary Card */}
      <div className="rounded-2xl border border-jar-border bg-jar-surface p-3 sm:p-4 space-y-2.5 shadow-2xs">
        {/* Specification Chips Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-jar-border pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {categorySlug && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-jar-canvas text-jar-primary border border-jar-border shadow-2xs">
                <CategoryIcon slug={categorySlug} className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
            )}
            <span className="text-xs sm:text-sm font-black text-jar-primary truncate">
              {categoryTitle || "سفارش عکاسی و فیلمبرداری"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-jar-muted">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-jar-canvas border border-jar-border">
              <Calendar className="h-3 w-3 text-[#A8A29A]" />
              <span>{isFlexibleSchedule ? "زمان منعطف" : bookingDate}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-jar-canvas border border-jar-border">
              <Clock className="h-3 w-3 text-[#A8A29A]" />
              <span>{durationHours} ساعت</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-jar-canvas border border-jar-border truncate max-w-[140px] sm:max-w-[200px]">
              <MapPin className="h-3 w-3 text-[#A8A29A]" />
              <span className="truncate">{locationLabel}</span>
            </span>
          </div>
        </div>

        {/* Financial Numbers Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-center">
          <div className="space-y-0.5">
            <span className="text-[10px] text-jar-muted block font-medium">نرخ مصوب انتخابی</span>
            <span className="text-xs sm:text-sm font-black font-mono text-jar-primary">
              {formatPrice(hourlyRate)} <span className="text-[10px] font-sans text-jar-muted font-normal">ت/ساعت</span>
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-jar-muted block font-medium">برآورد کل پروژه</span>
            <span className="text-xs sm:text-sm font-black font-mono text-jar-primary">
              {formatPrice(totalEstimatedPrice)} <span className="text-[10px] font-sans text-jar-muted font-normal">تومان</span>
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-right sm:text-left flex sm:flex-col justify-between sm:justify-center items-center sm:items-start">
            <span className="text-[10px] text-emerald-800 font-bold block">مرحله فعلی</span>
            <span className="text-xs sm:text-sm font-black text-emerald-950">
              ثبت رایگان درخواست
            </span>
          </div>
        </div>
      </div>

      {/* Symmetrical Contact Input Fields */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Name Field */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-jar-primary flex items-center justify-between">
              <span>نام و نام خانوادگی کارفرما</span>
              {isNameValid && (
                <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                  تأیید
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={contactName}
                onChange={(e) => onChangeContactName(e.target.value)}
                placeholder="مثلاً: علی رضایی"
                className="w-full h-10 sm:h-11 px-3.5 pr-9 rounded-xl border border-jar-border bg-jar-surface text-xs sm:text-sm font-medium text-jar-primary placeholder:text-[#A8A29A] focus:outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-all shadow-2xs"
              />
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29A]" />
            </div>
          </div>

          {/* Phone Field */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-jar-primary flex items-center justify-between">
              <span>شماره همراه (جهت هماهنگی پیامکی)</span>
              {isPhoneValid && (
                <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                  معتبر
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="tel"
                dir="ltr"
                value={contactPhone}
                onChange={(e) => onChangeContactPhone(e.target.value)}
                placeholder="0912..."
                className="w-full h-10 sm:h-11 px-3.5 pr-9 text-left rounded-xl border border-jar-border bg-jar-surface text-xs sm:text-sm font-mono font-medium text-jar-primary placeholder:text-[#A8A29A] focus:outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-all shadow-2xs"
              />
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29A]" />
            </div>
          </div>
        </div>

        {/* Optional Project Description Textarea */}
        {onChangeProjectDescription && (
          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-bold text-jar-primary">
              توضیحات و نکات تکمیلی پروژه (اختیاری)
            </label>
            <textarea
              value={projectDescription || ""}
              onChange={(e) => onChangeProjectDescription(e.target.value)}
              placeholder="اگر نکته، ترجیح یا توضیح خاصی برای پروژه دارید اینجا بنویسید..."
              rows={2}
              className="w-full p-3 rounded-xl border border-jar-border bg-jar-surface text-xs font-medium text-jar-primary placeholder:text-[#A8A29A] focus:outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-all shadow-2xs resize-none"
            />
          </div>
        )}

        {/* Masking & Security Callout */}
        <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-jar-muted font-medium">
          <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>اطلاعات شما با امنیت کامل ثبت شده و جهت هماهنگی توسط تیم جار استفاده می‌شود.</span>
        </div>
      </div>
    </div>
  );
}
