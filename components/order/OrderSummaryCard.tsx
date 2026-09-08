"use client";

import React from "react";
import {
  ShieldCheck,
  CreditCard,
  Lock,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  User,
  Phone
} from "lucide-react";
import { formatPrice } from "./BudgetSlider";

interface OrderSummaryCardProps {
  categoryTitle: string;
  bookingDate: string;
  timeSlot: string;
  durationHours: number;
  hourlyRate: number;
  locationLabel: string;
  contactName: string;
  onChangeContactName: (val: string) => void;
  contactPhone: string;
  onChangeContactPhone: (val: string) => void;
  isSubmitting: boolean;
  onSubmitOrder: () => void;
  submitError?: string | null;
}

export default function OrderSummaryCard({
  categoryTitle,
  bookingDate,
  timeSlot,
  durationHours,
  hourlyRate,
  locationLabel,
  contactName,
  onChangeContactName,
  contactPhone,
  onChangeContactPhone,
  isSubmitting,
  onSubmitOrder,
  submitError,
}: OrderSummaryCardProps) {
  const totalEstimatedPrice = hourlyRate * durationHours;
  const depositAmount = Math.round(totalEstimatedPrice / 2);

  return (
    <div className="rounded-[32px] border border-jar-border bg-jar-surface p-6 sm:p-8 shadow-xs space-y-6 sticky top-24" dir="rtl">
      
      {/* Header */}
      <div className="border-b border-jar-border pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-jar-logo bg-jar-logo/10 px-3 py-1 rounded-full border border-jar-logo/20 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-jar-logo" />
            <span>پیش‌فاکتور رسمی و تضمین وجه جار</span>
          </span>
          <span className="text-[11px] font-bold text-[#A8A29A]">سفارش آنی</span>
        </div>
        <h4 className="text-lg font-black text-jar-primary mt-2">
          {categoryTitle || "پروژه عکاسی و فیلمبرداری"}
        </h4>
      </div>

      {/* Project Meta Snapshot */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-jar-canvas border border-jar-border text-jar-primary font-bold">
          <Calendar className="h-4 w-4 text-jar-primary shrink-0" />
          <span className="truncate">{bookingDate || "تاریخ نامشخص"}</span>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-jar-canvas border border-jar-border text-jar-primary font-bold">
          <Clock className="h-4 w-4 text-jar-primary shrink-0" />
          <span className="truncate">{timeSlot || "ساعت نامشخص"}</span>
        </div>

        <div className="col-span-2 flex items-center gap-2 p-2.5 rounded-xl bg-jar-canvas border border-jar-border text-jar-primary font-bold">
          <MapPin className="h-4 w-4 text-jar-primary shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </div>
      </div>

      {/* Contact Details Fields */}
      <div className="space-y-3 pt-2 border-t border-jar-border">
        <span className="text-xs font-black text-jar-primary block">
          اطلاعات تماس جهت هماهنگی نهایی:
        </span>
        
        <div className="space-y-2">
          <div className="relative flex items-center">
            <input
              type="text"
              value={contactName}
              onChange={(e) => onChangeContactName(e.target.value)}
              placeholder="نام و نام‌خانوادگی کارفرما"
              className="w-full h-11 pr-10 pl-3.5 rounded-xl border border-jar-border bg-jar-surface text-xs font-bold text-jar-primary placeholder:text-[#A8A29A] outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-colors"
            />
            <User className="absolute right-3.5 h-4 w-4 text-[#A8A29A] pointer-events-none" />
          </div>

          <div className="relative flex items-center">
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => onChangeContactPhone(e.target.value)}
              placeholder="شماره موبایل (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)"
              dir="ltr"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-jar-border bg-jar-surface text-xs font-bold text-jar-primary font-mono placeholder:text-[#A8A29A] outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-colors"
            />
            <Phone className="absolute left-3.5 h-4 w-4 text-[#A8A29A] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Financial Calculation Breakdown */}
      <div className="space-y-3 pt-3 border-t border-jar-border">
        <div className="flex items-center justify-between text-xs text-jar-muted font-medium">
          <span>مدت زمان پروژه:</span>
          <span className="font-bold text-jar-primary">{durationHours} ساعت</span>
        </div>

        <div className="flex items-center justify-between text-xs text-jar-muted font-medium">
          <span>نرخ هر ساعت انتخابی:</span>
          <span className="font-bold text-jar-primary font-mono">{formatPrice(hourlyRate)} تومان</span>
        </div>

        <div className="flex items-center justify-between text-sm font-bold text-jar-primary pt-2 border-t border-dashed border-jar-border">
          <span>جمع کل برآورد پروژه:</span>
          <span className="font-black text-jar-primary font-mono">{formatPrice(totalEstimatedPrice)} تومان</span>
        </div>

        {/* 50% Deposit Line */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-jar-canvas border border-jar-border text-jar-primary">
          <div>
            <span className="block text-xs font-black">پیش‌پرداخت جهت رزرو و واریز امن (۵۰٪):</span>
            <span className="text-[10px] text-jar-muted">نگهداری در صندوق امانی پلتفرم جار</span>
          </div>
          <span className="text-base font-black text-jar-primary font-mono">
            {formatPrice(depositAmount)} <span className="text-xs font-normal text-jar-muted">تومان</span>
          </span>
        </div>
      </div>

      {/* Mandatory Transparent Guidance Note */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-jar-canvas border border-jar-border p-3.5 text-jar-muted text-right">
        <AlertCircle className="h-4 w-4 text-jar-muted shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed font-medium">
          «مبلغ فوق علی‌الحساب است؛ تسویه ۵۰٪ باقیمانده و هزینه‌های احتمالی ایاب‌وذهاب قبل از تحویل فایل‌ها انجام می‌شود.»
        </p>
      </div>

      {submitError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
          {submitError}
        </div>
      )}

      {/* Primary Submit & Pay Button */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onSubmitOrder}
        className="group flex h-13 sm:h-14 w-full items-center justify-center gap-2.5 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white font-medium text-sm sm:text-base shadow-none transition-colors duration-200 cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>در حال پردازش و ثبت سفارش...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            <span>ثبت نهایی و پرداخت پیش‌پرداخت ({formatPrice(depositAmount)} تومان)</span>
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </>
        )}
      </button>

      {/* Trust & Guarantee Badges */}
      <div className="space-y-2 pt-2 text-center text-slate-500 text-[11px] font-medium">
        <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>ضمانت ۱۰۰٪ بازگشت وجه در صورت نارضایتی کارفرما</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px]">
          <Lock className="h-3 w-3" />
          <span>پرداخت امن متصل به شبکه شتاب و درگاه شاپرک</span>
        </div>
      </div>

    </div>
  );
}
