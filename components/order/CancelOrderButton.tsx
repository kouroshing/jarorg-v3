"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  XCircle,
  Loader2,
  Phone,
  ArrowRight,
  MoreVertical,
  X,
} from "lucide-react";
import { cancelOrderByClientAction } from "@/app/actions/marketplaceActions";
import { useRouter } from "next/navigation";
import { isClientCancellable, parseOrderStatus } from "@/lib/orders/status";
import {
  SUPPORT_PHONE_DIGITS,
  SUPPORT_PHONE_TEL,
} from "@/lib/support/contact";
import {
  CLIENT_CANCEL_REASONS,
  type ClientCancelReasonId,
} from "@/lib/orders/cancelReasons";

interface CancelOrderButtonProps {
  orderId: string;
  orderStatus: string;
  isOwnerOrAdmin: boolean;
  /**
   * `default` — inline cancel on profile lists
   * `headerMenu` — kebab in the order sticky header (preferred on booking page)
   */
  variant?: "default" | "headerMenu";
}

type Step = "idle" | "menu" | "reasons" | "support";

export default function CancelOrderButton({
  orderId,
  orderStatus,
  isOwnerOrAdmin,
  variant = "default",
}: CancelOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [reasonId, setReasonId] = useState<ClientCancelReasonId | null>(null);
  const [extraNote, setExtraNote] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step !== "menu") return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setStep("idle");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [step]);

  if (!isOwnerOrAdmin) {
    return null;
  }

  const status = parseOrderStatus(orderStatus);
  const headerMenu = variant === "headerMenu";

  if (status === "COMPLETED" || status === "CANCELLED") {
    return null;
  }

  const openSupport = () => {
    setStep("support");
  };

  if (status === "CONFIRMED" || !isClientCancellable(orderStatus)) {
    if (!headerMenu) {
      return status === "CONFIRMED" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-950 font-medium leading-relaxed" dir="rtl">
          این پروژه قطعی شده است. برای لغو با پشتیبانی جار تماس بگیرید:
          <a
            href={SUPPORT_PHONE_TEL}
            className="mt-1.5 inline-flex items-center justify-center gap-1 font-bold text-[#141413]"
            dir="ltr"
          >
            <Phone className="h-3.5 w-3.5" />
            {SUPPORT_PHONE_DIGITS}
          </a>
        </div>
      ) : (
        <p className="text-center text-xs text-neutral-500 font-medium" dir="rtl">
          در این وضعیت امکان لغو مستقیم وجود ندارد. با پشتیبانی جار هماهنگ کنید.
        </p>
      );
    }
  }

  const runCancel = () => {
    if (!reasonId) {
      setError("لطفاً علت لغو را انتخاب کنید.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await cancelOrderByClientAction(orderId, reasonId, extraNote);
        if (!res.success) {
          setError(res.error || "خطا در لغو سفارش.");
          return;
        }
        setStep("idle");
        router.replace(`/order/${orderId}`);
        router.refresh();
      } catch {
        setError("ارتباط با سرور قطع شد. لطفاً دوباره تلاش کنید.");
      }
    });
  };

  const openReasons = () => {
    setError(null);
    setReasonId(null);
    setExtraNote("");
    setStep("reasons");
  };

  const reasonsSheet = step === "reasons" && (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4" dir="rtl">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-reason-title"
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-neutral-200 bg-white shadow-2xl max-h-[88dvh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-100 bg-white px-5 py-4 rounded-t-3xl">
          <h3 id="cancel-reason-title" className="text-sm font-black text-neutral-900">
            چرا می‌خواهید لغو کنید؟
          </h3>
          <button
            type="button"
            onClick={() => setStep("idle")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
            انتخاب علت الزامی است. بعد از لغو می‌توانید دوباره رزرو ثبت کنید.
          </p>

          <div className="space-y-2">
            {CLIENT_CANCEL_REASONS.map((reason) => {
              const on = reasonId === reason.id;
              return (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => setReasonId(reason.id)}
                  className={`w-full rounded-2xl border px-3.5 py-3 text-right text-xs font-bold transition-colors ${
                    on
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  {reason.label}
                </button>
              );
            })}
          </div>

          {(reasonId === "OTHER" || reasonId) && (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold text-neutral-700">
                {reasonId === "OTHER" ? "توضیح (الزامی)" : "توضیح بیشتر (اختیاری)"}
              </span>
              <textarea
                rows={3}
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="اگر نکته‌ای دارید بنویسید…"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-3.5 py-3 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
              />
            </label>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setStep("idle")}
              disabled={isPending}
              className="flex-1 h-11 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-neutral-700"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={runCancel}
              disabled={isPending || !reasonId}
              className="flex-[1.2] h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              {isPending ? "در حال لغو..." : "تایید لغو رزرو"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const supportSheet = step === "support" && (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/45 p-4" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-5 space-y-4 shadow-2xl">
        <h3 className="text-sm font-black text-neutral-900">تماس با پشتیبانی</h3>
        <p className="text-xs text-neutral-600 font-medium leading-relaxed">
          این رزرو قطعی شده یا در وضعیتی است که لغو خودکار ممکن نیست. با پشتیبانی هماهنگ کنید.
        </p>
        <a
          href={SUPPORT_PHONE_TEL}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white text-sm font-bold"
          dir="ltr"
        >
          <Phone className="h-4 w-4" />
          {SUPPORT_PHONE_DIGITS}
        </a>
        <button
          type="button"
          onClick={() => setStep("idle")}
          className="w-full h-10 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700"
        >
          بستن
        </button>
      </div>
    </div>
  );

  if (headerMenu) {
    const canSelfCancel = isClientCancellable(orderStatus) && status !== "CONFIRMED";
    return (
      <div className="relative" ref={menuRef} dir="rtl">
        <button
          type="button"
          onClick={() => setStep(step === "menu" ? "idle" : "menu")}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
          aria-label="گزینه‌های بیشتر"
          aria-expanded={step === "menu"}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {step === "menu" && (
          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lg">
            {canSelfCancel ? (
              <button
                type="button"
                onClick={openReasons}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-xs font-bold text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="h-4 w-4 shrink-0" />
                لغو این رزرو
              </button>
            ) : (
              <button
                type="button"
                onClick={openSupport}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-xs font-bold text-neutral-800 hover:bg-neutral-50"
              >
                <Phone className="h-4 w-4 shrink-0" />
                تماس با پشتیبانی
              </button>
            )}
            <Link
              href="/profile"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-xs font-bold text-neutral-700 hover:bg-neutral-50"
            >
              <ArrowRight className="h-4 w-4 shrink-0" />
              بازگشت به پروفایل
            </Link>
          </div>
        )}

        {reasonsSheet}
        {supportSheet}
      </div>
    );
  }

  // Inline (profile list): still hide behind a discreet control + reason sheet
  return (
    <div className="space-y-2 w-full" dir="rtl">
      {error && step === "idle" && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={openReasons}
        disabled={isPending || !isClientCancellable(orderStatus)}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 hover:text-rose-600 transition-colors disabled:opacity-40"
      >
        <MoreVertical className="h-3.5 w-3.5" />
        گزینه‌های بیشتر · لغو رزرو
      </button>

      {reasonsSheet}
      {supportSheet}
    </div>
  );
}
