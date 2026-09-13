"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Lock,
  CheckCircle2,
  Link2,
  UploadCloud,
  X,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { CategoryIcon } from "@/components/order/steps/StepCategory";
import OrderBudgetAdjuster from "@/components/order/OrderBudgetAdjuster";
import {
  MIN_PROJECT_DESCRIPTION_LENGTH,
  PROJECT_DESCRIPTION_SOFT_GOOD,
} from "@/lib/orders/descriptionLimits";

export {
  MIN_PROJECT_DESCRIPTION_LENGTH,
  PROJECT_DESCRIPTION_SOFT_GOOD,
} from "@/lib/orders/descriptionLimits";


/** Strip digits and keep letters / spaces for person names. */
export function sanitizePersonName(value: string) {
  return value
    .replace(/[0-9۰-۹٠-٩]/g, "")
    .replace(
      /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-Z\s\u200c\u200dـ]/g,
      ""
    );
}

export function isValidPersonName(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  return !/[0-9۰-۹٠-٩]/.test(trimmed);
}

interface StepFinalizeProps {
  categoryTitle: string;
  categorySlug?: string;
  isFlexibleSchedule?: boolean;
  bookingDate: string;
  durationHours: number;
  locationLabel: string;
  contactName: string;
  onChangeContactName: (val: string) => void;
  projectDescription: string;
  onChangeProjectDescription: (val: string) => void;
  referenceLink: string;
  onChangeReferenceLink: (val: string) => void;
  moodboardUrls: string[];
  onChangeMoodboardUrls: (urls: string[]) => void;
  selectedBudgetIndex: number;
  onChangeBudgetIndex: (index: number) => void;
}

export default function StepFinalize({
  categoryTitle,
  categorySlug,
  isFlexibleSchedule = false,
  bookingDate,
  durationHours,
  locationLabel,
  contactName,
  onChangeContactName,
  projectDescription,
  onChangeProjectDescription,
  referenceLink,
  onChangeReferenceLink,
  moodboardUrls,
  onChangeMoodboardUrls,
  selectedBudgetIndex,
  onChangeBudgetIndex,
}: StepFinalizeProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isNameValid = isValidPersonName(contactName);
  const descLen = projectDescription.trim().length;
  const isDescValid = descLen >= MIN_PROJECT_DESCRIPTION_LENGTH;
  const isDescRich = descLen > PROJECT_DESCRIPTION_SOFT_GOOD;
  const descMeterClass =
    descLen === 0
      ? "text-jar-muted"
      : !isDescValid
        ? "text-rose-600"
        : isDescRich
          ? "text-emerald-600"
          : "text-rose-600";
  const descHint =
    descLen === 0
      ? null
      : !isDescValid
        ? `حداقل ${MIN_PROJECT_DESCRIPTION_LENGTH} حرف لازم است (${MIN_PROJECT_DESCRIPTION_LENGTH - descLen} حرف دیگر).`
        : isDescRich
          ? "توضیحات خوب — شانس پذیرش متخصص بالاتر می‌رود."
          : `توضیحات کوتاه است؛ بالای ${PROJECT_DESCRIPTION_SOFT_GOOD} حرف معمولاً پذیرش بهتری دارد.`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const remainingSlots = 3 - moodboardUrls.length;
    if (remainingSlots <= 0) {
      setUploadError("حداکثر ۳ تصویر نمونه می‌توانید اضافه کنید.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    const newUrls = [...moodboardUrls];

    for (const file of filesToUpload) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`فایل ${file.name} بیشتر از ۱۰ مگابایت است.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/order/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          newUrls.push(data.url);
        } else {
          setUploadError(data.error || "خطا در آپلود عکس.");
        }
      } catch {
        setUploadError("خطای شبکه در ارسال فایل.");
      }
    }

    onChangeMoodboardUrls(newUrls);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-5 sm:space-y-6" dir="rtl">
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-black text-jar-primary tracking-tight">
          جزئیات نهایی درخواست
        </h2>
        <p className="text-xs sm:text-sm text-jar-muted leading-relaxed">
          خلاصه پروژه را تأیید کنید و بودجه پیشنهادی را با اسلایدر تنظیم کنید.
        </p>
      </div>

      {/* Compact project chips — no money */}
      <div className="rounded-2xl border border-jar-border bg-jar-surface p-3 sm:p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {categorySlug && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-jar-canvas text-jar-primary border border-jar-border">
                <CategoryIcon slug={categorySlug} className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
            )}
            <span className="text-sm font-black text-jar-primary truncate">
              {categoryTitle}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-jar-muted">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-jar-canvas border border-jar-border">
              <Calendar className="h-3 w-3 text-[#A8A29A]" />
              {isFlexibleSchedule ? "زمان منعطف" : bookingDate}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-jar-canvas border border-jar-border">
              <Clock className="h-3 w-3 text-[#A8A29A]" />
              {durationHours} ساعت
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-jar-canvas border border-jar-border max-w-[160px] truncate">
              <MapPin className="h-3 w-3 text-[#A8A29A] shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Budget slider — rates from lib/pricing/budgetStops (dashboard-ready) */}
      <OrderBudgetAdjuster
        selectedIndex={selectedBudgetIndex}
        onSelectIndex={onChangeBudgetIndex}
        durationHours={durationHours}
      />

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-jar-primary flex items-center justify-between">
          <span>نام و نام خانوادگی</span>
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
            inputMode="text"
            autoComplete="name"
            value={contactName}
            onChange={(e) => onChangeContactName(sanitizePersonName(e.target.value))}
            placeholder="مثلاً: علی رضایی"
            className="w-full h-11 px-3.5 pr-9 rounded-xl border border-jar-border bg-jar-surface text-sm font-medium text-jar-primary placeholder:text-[#A8A29A] focus:outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-all shadow-2xs"
          />
          <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29A]" />
        </div>
        <p className="text-[10px] text-jar-muted">فقط حروف؛ وارد کردن عدد مجاز نیست.</p>
      </div>

      {/* Required description — hard min 30; soft green/red cue around 60 */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-jar-primary flex items-center justify-between gap-2">
          <span>توضیحات پروژه</span>
          <span className={`text-[10px] font-mono tabular-nums ${descMeterClass}`}>
            {descLen.toLocaleString("fa-IR")} حرف
            {isDescRich ? " · خوب" : isDescValid ? " · کوتاه" : ""}
          </span>
        </label>
        <textarea
          value={projectDescription}
          onChange={(e) => onChangeProjectDescription(e.target.value)}
          placeholder="سبک، فضا، لباس، تعداد نفرات، انتظار از خروجی و هر نکته‌ای که عکاس باید بداند را بنویسید..."
          rows={4}
          className={`w-full p-3 rounded-xl border bg-jar-surface text-xs sm:text-sm font-medium text-jar-primary placeholder:text-[#A8A29A] focus:outline-none focus:ring-1 transition-all shadow-2xs resize-none min-h-[110px] ${
            descLen === 0
              ? "border-jar-border focus:border-jar-logo focus:ring-jar-logo"
              : !isDescValid || !isDescRich
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-400/40"
                : "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-400/40"
          }`}
        />
        {descHint && (
          <p
            className={`text-[10px] font-medium ${
              isDescRich ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {descHint}
          </p>
        )}
      </div>

      {/* Optional content samples */}
      <div className="space-y-3 rounded-2xl border border-dashed border-jar-border bg-jar-surface/60 p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-jar-muted" />
            <h3 className="text-xs sm:text-sm font-black text-jar-primary">
              نمونه‌های محتوایی مدنظر
            </h3>
          </div>
          <span className="text-[10px] font-bold text-jar-muted bg-jar-canvas border border-jar-border px-2 py-0.5 rounded-md">
            اختیاری
          </span>
        </div>
        <p className="text-[11px] text-jar-muted leading-relaxed">
          لینک اینستاگرام / پینترست یا تا ۳ تصویر نمونه سبک بگذارید تا هماهنگی دقیق‌تر شود.
        </p>

        <div className="relative">
          <input
            type="url"
            value={referenceLink}
            onChange={(e) => onChangeReferenceLink(e.target.value)}
            placeholder="https://instagram.com/... یا pinterest.com/..."
            dir="ltr"
            className="w-full h-10 pl-9 pr-3 text-left rounded-xl border border-jar-border bg-jar-canvas text-xs font-mono text-jar-primary placeholder:text-[#A8A29A] focus:outline-none focus:border-jar-logo focus:ring-1 focus:ring-jar-logo transition-all"
          />
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29A] pointer-events-none" />
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {moodboardUrls.map((url, idx) => (
            <div
              key={url}
              className="group relative aspect-square rounded-xl overflow-hidden border border-jar-border bg-jar-canvas"
            >
              <Image
                src={url}
                alt={`نمونه ${idx + 1}`}
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  onChangeMoodboardUrls(moodboardUrls.filter((_, i) => i !== idx))
                }
                className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-jar-primary/80 text-white hover:bg-rose-600 transition-colors"
                aria-label="حذف تصویر"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {moodboardUrls.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-jar-border bg-jar-canvas hover:border-jar-primary hover:bg-jar-soft transition-all cursor-pointer disabled:opacity-60"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              {isUploading ? (
                <Loader2 className="h-5 w-5 text-jar-primary animate-spin" />
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 text-jar-primary mb-1" />
                  <span className="text-[10px] font-bold text-jar-primary">افزودن</span>
                </>
              )}
            </button>
          )}
        </div>

        {uploadError && (
          <p className="text-[11px] text-rose-600 font-bold">{uploadError}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-jar-muted font-medium">
        <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        <span>ثبت درخواست در این مرحله رایگان است؛ شماره همراه از حساب شما گرفته می‌شود.</span>
      </div>
    </div>
  );
}
