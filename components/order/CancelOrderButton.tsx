"use client";

import React, { useState, useEffect, useTransition } from "react";
import { XCircle, Loader2, Lock, Clock, AlertTriangle } from "lucide-react";
import { cancelOrderByClientAction } from "@/app/actions/marketplaceActions";
import { useRouter } from "next/navigation";
import { isClientCancellable } from "@/lib/orders/status";

interface CancelOrderButtonProps {
  orderId: string;
  orderStatus: string;
  createdAt: string | Date;
  hasSelectedSpecialist: boolean;
  isOwnerOrAdmin: boolean;
}

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

function toPersianDigits(num: number | string): string {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num
    .toString()
    .replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
}

export default function CancelOrderButton({
  orderId,
  orderStatus,
  createdAt,
  hasSelectedSpecialist,
  isOwnerOrAdmin,
}: CancelOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Time tracking
  const createdTimestamp = new Date(createdAt).getTime();
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

  const isEligibleStatus =
    isOwnerOrAdmin &&
    isClientCancellable(orderStatus) &&
    !hasSelectedSpecialist;

  if (!isEligibleStatus) {
    return null;
  }

  const is72HoursPassed = remainingMs <= 0;

  // Breakdown hours, minutes, seconds
  const hoursLeft = Math.floor(remainingMs / (3600 * 1000));
  const minutesLeft = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
  const secondsLeft = Math.floor((remainingMs % (60 * 1000)) / 1000);

  const handleCancel = () => {
    setError(null);
    const confirmed = window.confirm(
      "۷۲ ساعت از زمان ثبت سفارش شما گذشته است. آیا مطمئن هستید که می‌خواهید سفارش را لغو کنید؟ پس از لغو، فرآیند جستجو و معرفی متخصصان متوقف خواهد شد."
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await cancelOrderByClientAction(orderId);
      if (!res.success) {
        setError(res.error || "خطا در لغو سفارش.");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="pt-3 border-t border-[#E5E0D8] space-y-2.5" dir="rtl">
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
          {error}
        </div>
      )}

      {/* 72h Rule Notice & Timer Box */}
      {!is72HoursPassed ? (
        <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E5E0D8] text-right space-y-2">
          <div className="flex items-center gap-1.5 text-[#141413] font-black text-xs">
            <Clock className="h-4 w-4 text-[#141413] shrink-0" />
            <span>قوانین لغو سفارش (فعال‌سازی پس از ۷۲ ساعت):</span>
          </div>

          <p className="text-[11px] text-[#66605B] leading-relaxed font-medium">
            جهت حفظ تعهد و هماهنگی متخصصین، امکان لغو سفارش تا ۷۲ ساعت پس از ثبت اولیه غیرفعال است.
          </p>

          <div className="p-2.5 rounded-xl bg-white border border-[#E5E0D8] flex items-center justify-between gap-2 shadow-2xs min-h-[44px]">
            <span className="text-[11px] text-[#66605B] font-bold">زمان باقیمانده تا امکان لغو:</span>
            {mounted ? (
              <span className="text-xs sm:text-sm font-black text-[#141413] font-mono tracking-wider flex items-center gap-1">
                <span>{toPersianDigits(hoursLeft)}</span>
                <span className="text-[10px] text-[#A8A29A]">ساعت و</span>
                <span>{toPersianDigits(minutesLeft)}</span>
                <span className="text-[10px] text-[#A8A29A]">دقیقه و</span>
                <span>{toPersianDigits(secondsLeft)}</span>
                <span className="text-[10px] text-[#A8A29A]">ثانیه</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-[#66605B] font-mono">در حال محاسبه...</span>
            )}
          </div>

          <button
            type="button"
            disabled
            className="w-full h-10 rounded-full bg-[#FAF9F5] border border-[#E5E0D8] text-[#A8A29A] text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
          >
            <Lock className="h-3.5 w-3.5 text-[#A8A29A]" />
            <span>انصراف و لغو سفارش (قفل است)</span>
          </button>
        </div>
      ) : (
        /* Unlocked Cancellation State After 72 Hours */
        <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 text-right space-y-2.5">
          <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>مهلت ۷۲ ساعته سپری شده است.</span>
          </div>
          <p className="text-[11px] text-rose-900/80 leading-relaxed font-medium">
            در صورت عدم تمایل به ادامه فرآیند یا هماهنگی، اکنون می‌توانید سفارش را مستقیماً لغو نمایید.
          </p>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 w-full h-11 px-4 rounded-full border border-rose-300 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <XCircle className="h-4 w-4 text-white" />
            )}
            <span>{isPending ? "در حال ثبت لغو سفارش..." : "انصراف و لغو قطعی سفارش"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
