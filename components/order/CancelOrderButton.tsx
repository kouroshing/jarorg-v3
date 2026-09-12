"use client";

import React, { useState, useTransition } from "react";
import { XCircle, Loader2, Phone } from "lucide-react";
import { cancelOrderByClientAction } from "@/app/actions/marketplaceActions";
import { useRouter } from "next/navigation";
import { isClientCancellable, parseOrderStatus } from "@/lib/orders/status";

interface CancelOrderButtonProps {
  orderId: string;
  orderStatus: string;
  isOwnerOrAdmin: boolean;
  /** Stronger visual for reservation status page */
  variant?: "default" | "booking";
}

export default function CancelOrderButton({
  orderId,
  orderStatus,
  isOwnerOrAdmin,
  variant = "default",
}: CancelOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!isOwnerOrAdmin) {
    return null;
  }

  const status = parseOrderStatus(orderStatus);

  if (status === "CONFIRMED") {
    return (
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-950 font-medium leading-relaxed"
        dir="rtl"
      >
        این پروژه قطعی شده است. برای لغو با پشتیبانی جار تماس بگیرید:
        <a
          href="tel:09100138383"
          className="mt-1.5 inline-flex items-center justify-center gap-1 font-bold text-[#141413]"
          dir="ltr"
        >
          <Phone className="h-3.5 w-3.5" />
          09100138383
        </a>
      </div>
    );
  }

  if (status === "COMPLETED" || status === "CANCELLED") {
    return null;
  }

  if (!isClientCancellable(orderStatus)) {
    return (
      <p className="text-center text-xs text-neutral-500 font-medium" dir="rtl">
        در این وضعیت امکان لغو مستقیم وجود ندارد. با پشتیبانی جار هماهنگ کنید.
      </p>
    );
  }

  const runCancel = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await cancelOrderByClientAction(orderId);
        if (!res.success) {
          setError(res.error || "خطا در لغو سفارش.");
          setConfirmOpen(false);
          return;
        }
        setConfirmOpen(false);
        router.replace(`/order/${orderId}`);
        router.refresh();
      } catch {
        setError("ارتباط با سرور قطع شد. لطفاً دوباره تلاش کنید.");
        setConfirmOpen(false);
      }
    });
  };

  const booking = variant === "booking";

  return (
    <div className="space-y-2.5 w-full" dir="rtl">
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
          {error}
        </div>
      )}

      {!confirmOpen ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          className={
            booking
              ? "flex items-center justify-center gap-1.5 w-full h-12 px-4 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-sm font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              : "flex items-center justify-center gap-1.5 w-full h-11 px-4 rounded-full border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          }
        >
          <XCircle className="h-4 w-4" />
          <span>لغو این رزرو</span>
        </button>
      ) : (
        <div
          className={
            booking
              ? "rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3"
              : "rounded-2xl border border-rose-200 bg-rose-50 p-3.5 space-y-3"
          }
        >
          <p className="text-xs sm:text-sm font-bold text-rose-900 text-center leading-relaxed">
            رزرو لغو شود؟ بعد از لغو می‌توانید دوباره سفارش ثبت کنید.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
              className="flex-1 h-11 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={runCancel}
              disabled={isPending}
              className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? "در حال لغو..." : "بله، لغو کن"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
