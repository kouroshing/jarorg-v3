"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  PhoneCall,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Calendar,
  MapPin,
  AlertCircle,
  Radio,
} from "lucide-react";
import { SUPPORT_PHONE_TEL } from "@/lib/support/contact";

interface OrderWaitingHeroProps {
  order: {
    id: string;
    createdAt: string | Date;
    categoryTitle?: string | null;
    durationHours: number;
    locationType: string;
    districtOrCity?: string | null;
    isFlexibleSchedule: boolean;
    bookingDate?: string | null;
    timeSlot?: string | null;
    totalEstimatedPrice: number;
    contactPhone?: string | null;
    contactName?: string | null;
    status: string;
  };
}

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

function toPersianDigits(num: number | string): string {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
}

export default function OrderWaitingHero({ order }: OrderWaitingHeroProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  const createdTimestamp = new Date(order.createdAt).getTime();

  const [remainingMs, setRemainingMs] = useState<number>(() => {
    const elapsed = Date.now() - createdTimestamp;
    return Math.max(0, SEVENTY_TWO_HOURS_MS - elapsed);
  });

  useEffect(() => {
    setMounted(true);
    const updateCountdown = () => {
      const elapsed = Date.now() - createdTimestamp;
      const left = Math.max(0, SEVENTY_TWO_HOURS_MS - elapsed);
      setRemainingMs(left);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [createdTimestamp]);

  const elapsedMs = Math.min(SEVENTY_TWO_HOURS_MS, Math.max(0, Date.now() - createdTimestamp));
  const progressPercent = Math.min(100, Math.max(2, Math.round((elapsedMs / SEVENTY_TWO_HOURS_MS) * 100)));

  const hoursLeft = Math.floor(remainingMs / (3600 * 1000));
  const minutesLeft = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
  const secondsLeft = Math.floor((remainingMs % (60 * 1000)) / 1000);

  const is72HoursPassed = remainingMs <= 0;

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="rounded-[32px] border border-[#E5E0D8] bg-white p-6 sm:p-9 shadow-xs relative overflow-hidden text-[#141413]" dir="rtl">
      {/* Background glowing ambient light */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#CC785C]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-500/5 blur-3xl" />

      <div className="relative z-10 space-y-7">
        
        {/* Top Header Badge & Live Radar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E0D8] pb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#CC785C]/10 border border-[#CC785C]/25 text-[#CC785C] shrink-0">
              <Clock className="h-7 w-7 sm:h-8 sm:w-8 animate-pulse text-[#CC785C]" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC785C] opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#CC785C]" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#CC785C]/25 bg-[#CC785C]/10 text-xs font-bold text-[#CC785C]">
                <Radio className="h-3 w-3 animate-pulse text-[#CC785C]" />
                <span>صفحه انتظار هماهنگی پروژه (مهلت ۷۲ ساعت)</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#141413] tracking-tight">
                سفارش شما در صف بررسی کارشناسان جار قرار گرفت
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border border-[#E5E0D8] bg-[#FAF9F5] hover:bg-[#F3F1EC] text-xs font-medium text-[#66605B] transition-colors cursor-pointer"
              title="کپی لینک سفارش"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">لینک کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-[#66605B]" />
                  <span>کپی لینک رهگیری</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 72-Hour Live Countdown Banner */}
        <div className="rounded-3xl bg-[#FAF9F5] border border-[#E5E0D8] p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#CC785C]" />
                <h3 className="text-sm sm:text-base font-black text-[#141413]">
                  مهلت بررسی اولیه و تماس پشتیبانی
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#66605B] leading-relaxed">
                همکاران ما در واحد هماهنگی پروژه‌ها حداکثر ظرف ۷۲ ساعت آینده، نیازمندی‌ها را سنجیده و جهت تأیید متخصص و زمان نهایی با شما تماس می‌گیرند.
              </p>
            </div>

            {/* Countdown Digits Display */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 bg-white border border-[#E5E0D8] p-3 sm:p-4 rounded-2xl shadow-2xs">
              {mounted ? (
                !is72HoursPassed ? (
                  <div className="flex items-center gap-2 sm:gap-3 text-center" dir="ltr">
                    {/* Hours */}
                    <div className="min-w-[58px] sm:min-w-[64px] bg-[#FAF9F5] border border-[#E5E0D8] rounded-xl py-2 px-2.5">
                      <span className="block text-lg sm:text-2xl font-black text-[#141413] font-mono leading-none">
                        {toPersianDigits(hoursLeft)}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#66605B] mt-1 block">
                        ساعت
                      </span>
                    </div>

                    <span className="text-lg font-black text-[#CC785C] pb-3">:</span>

                    {/* Minutes */}
                    <div className="min-w-[58px] sm:min-w-[64px] bg-[#FAF9F5] border border-[#E5E0D8] rounded-xl py-2 px-2.5">
                      <span className="block text-lg sm:text-2xl font-black text-[#141413] font-mono leading-none">
                        {toPersianDigits(minutesLeft)}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#66605B] mt-1 block">
                        دقیقه
                      </span>
                    </div>

                    <span className="text-lg font-black text-[#CC785C] pb-3">:</span>

                    {/* Seconds */}
                    <div className="min-w-[58px] sm:min-w-[64px] bg-[#CC785C]/10 border border-[#CC785C]/25 rounded-xl py-2 px-2.5">
                      <span className="block text-lg sm:text-2xl font-black text-[#CC785C] font-mono leading-none">
                        {toPersianDigits(secondsLeft)}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#CC785C] mt-1 block">
                        ثانیه
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-700 py-2 px-3 text-xs font-bold">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>مهلت ۷۲ ساعته اولیه به پایان رسید. در صورت عدم تماس، با پشتیبانی در ارتباط باشید.</span>
                  </div>
                )
              ) : (
                <div className="text-xs font-bold text-[#66605B] py-2 px-4">
                  در حال آماده‌سازی تایمر...
                </div>
              )}
            </div>
          </div>

          {/* Progress Timeline Bar */}
          <div className="space-y-2 pt-2 border-t border-[#E5E0D8]/80">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#66605B]">
              <span>پیشرفت فرآیند انتظار و هماهنگی:</span>
              <span className="font-mono text-[#141413]">{toPersianDigits(progressPercent)}٪ سپری شده</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E0D8]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#CC785C] to-[#141413] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3-Step Visual Process Journey */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-[#66605B] uppercase tracking-wider">
            مراحل پیگیری و اجرای پروژه شما در جار
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                ✓
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-black text-[#141413]">۱. ثبت سفارش در سامانه</h5>
                <p className="text-[11px] text-[#66605B] leading-relaxed">
                  اطلاعات پروژه ذخیره شد و پیامک آن برای واحد مدیریت ارسال گردید.
                </p>
              </div>
            </div>

            {/* Step 2 (Active Waiting) */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#CC785C]/10 border border-[#CC785C]/30 shadow-xs relative">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#CC785C] text-white font-black text-xs animate-pulse">
                ۲
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <h5 className="text-xs font-black text-[#141413]">۲. بررسی و انتخاب متخصص</h5>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#CC785C] animate-ping" />
                </div>
                <p className="text-[11px] text-[#66605B] leading-relaxed font-medium">
                  کارشناسان در حال بررسی شرایط و تطبیق بهترین عکاس با سبک مدنظر شما هستند (ظرف ۷۲ ساعت).
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E5E0D8] opacity-75 shadow-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FAF9F5] border border-[#E5E0D8] text-[#A8A29A] font-bold text-xs">
                ۳
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-[#141413]">۳. تماس و اعزام متخصص</h5>
                <p className="text-[11px] text-[#66605B] leading-relaxed">
                  تماس تلفنی جهت هماهنگی ساعت دقیق، تجهیزات و آغاز آفیش عکاسی.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact info snapshot & Support Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8]">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#66605B]">
            {order.contactPhone && (
              <span className="flex items-center gap-1.5">
                <PhoneCall className="h-3.5 w-3.5 text-[#CC785C]" />
                شماره تماس هماهنگی:
                <strong className="text-[#141413] font-mono font-bold" dir="ltr">
                  {order.contactPhone}
                </strong>
              </span>
            )}
            {order.contactName && (
              <span>
                نام کارفرما: <strong className="text-[#141413]">{order.contactName}</strong>
              </span>
            )}
            {order.districtOrCity && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#66605B]" />
                محدوده: <strong className="text-[#141413]">{order.districtOrCity}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-[#141413] hover:bg-[#282725] text-white text-xs font-bold transition-colors shadow-xs"
            >
              <span>مشاهده در داشبورد من</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>

            <a
              href={SUPPORT_PHONE_TEL}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border border-[#E5E0D8] bg-white hover:bg-[#F3F1EC] text-xs font-bold text-[#141413] transition-colors shadow-xs"
              title="پشتیبانی تلفنی"
            >
              <PhoneCall className="h-3.5 w-3.5 text-[#CC785C]" />
              <span>تماس با پشتیبانی</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
