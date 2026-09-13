"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  reportDeliveryAction,
  confirmDeliveryAction,
  raiseDisputeAction,
  requestRevisionAction,
  adminReleaseEscrowAction,
  resolveDisputeAction,
} from "@/app/actions/deliveryActions";
import { formatJalaliDate } from "@/lib/date/jalali";

/** Must stay in sync with lib/orders/settlement.ts AUTO_RELEASE_DAYS */
const AUTO_RELEASE_DAYS = 7;

export type DeliveryOrderSnapshot = {
  id: string;
  paidAt: string | null;
  deliveredAt: string | null;
  settledAt: string | null;
  disputedAt: string | null;
  disputeReason: string | null;
  disputeResolvedAt: string | null;
  revisionCount: number;
  revisionNote: string | null;
  categoryTitle: string | null;
};

export default function OrderDeliveryPanel({
  order,
  role,
}: {
  order: DeliveryOrderSnapshot;
  role: "client" | "specialist" | "admin";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"idle" | "revision" | "dispute" | "admin-refund">(
    "idle"
  );

  const run = (fn: () => Promise<{ success: boolean; error?: string; message?: string }>) => {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error || "خطا");
        return;
      }
      setOk(res.message || "انجام شد");
      setMode("idle");
      setNote("");
      router.refresh();
    });
  };

  if (!order.paidAt) return null;

  if (order.settledAt) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-2" dir="rtl">
        <div className="flex items-center gap-2 text-emerald-900">
          <CheckCircle2 className="h-5 w-5" />
          <h2 className="text-sm font-black">پروژه تسویه شد</h2>
        </div>
        <p className="text-xs text-emerald-800/90 leading-relaxed">
          مبلغ متخصص آزاد شده است
          {order.settledAt
            ? ` · ${formatJalaliDate(new Date(order.settledAt))}`
            : ""}
          .
        </p>
      </div>
    );
  }

  if (order.disputedAt && !order.disputeResolvedAt) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3" dir="rtl">
        <div className="flex items-center gap-2 text-amber-950">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-sm font-black">اعتراض در بررسی جار</h2>
        </div>
        <p className="text-xs text-amber-900/90 leading-relaxed">
          تسویه تا تصمیم ادمین متوقف است.
          {order.disputeReason ? ` دلیل: ${order.disputeReason}` : ""}
        </p>
        {role === "admin" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => resolveDisputeAction(order.id, "RELEASED"))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              آزاد کردن مبلغ برای متخصص
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode("admin-refund")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-rose-800 disabled:opacity-50"
            >
              پذیرش اعتراض + لغو/عودت
            </button>
          </div>
        )}
        {mode === "admin-refund" && role === "admin" && (
          <div className="space-y-2 rounded-xl border border-rose-200 bg-white p-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              placeholder="یادداشت ادمین (اختیاری)"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(() => resolveDisputeAction(order.id, "REFUNDED", note.trim() || undefined))
              }
              className="h-9 rounded-lg bg-rose-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"
            >
              تایید عودت دستی
            </button>
          </div>
        )}
        {error && <p className="text-xs font-bold text-rose-700">{error}</p>}
        {ok && <p className="text-xs font-bold text-emerald-800">{ok}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-neutral-900 flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-neutral-700" />
            بستن پروژه و تسویه
          </h2>
          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
            {order.deliveredAt
              ? `تحویل ثبت شده · در صورت عدم پاسخ کارفرما، حداکثر ${AUTO_RELEASE_DAYS} روز بعد تسویه خودکار می‌شود.`
              : "بعد از اتمام کار، متخصص تحویل را ثبت می‌کند؛ کارفرما تایید یا اصلاح/اعتراض می‌کند."}
          </p>
        </div>
      </div>

      {order.revisionNote && !order.deliveredAt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
          <span className="font-bold">درخواست اصلاح قبلی: </span>
          {order.revisionNote}
          {order.revisionCount > 0
            ? ` (${order.revisionCount.toLocaleString("fa-IR")} بار)`
            : ""}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          {ok}
        </div>
      )}

      {(role === "specialist" || role === "admin") && !order.deliveredAt && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => reportDeliveryAction(order.id))}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
          ثبت تحویل پروژه
        </button>
      )}

      {(role === "client" || role === "admin") && order.deliveredAt && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => confirmDeliveryAction(order.id))}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            تایید تحویل و تسویه متخصص
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode(mode === "revision" ? "idle" : "revision")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 text-[11px] font-bold text-amber-950 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              درخواست اصلاح
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode(mode === "dispute" ? "idle" : "dispute")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-bold text-rose-900 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              ثبت اعتراض
            </button>
          </div>

          {mode === "revision" && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs"
                placeholder="دقیقاً چه چیزی باید اصلاح شود؟"
              />
              <button
                type="button"
                disabled={isPending || note.trim().length < 10}
                onClick={() => run(() => requestRevisionAction(order.id, note))}
                className="h-9 rounded-lg bg-amber-700 px-3 text-[11px] font-bold text-white disabled:opacity-50"
              >
                ارسال درخواست اصلاح
              </button>
            </div>
          )}

          {mode === "dispute" && (
            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
              <p className="text-[10px] text-rose-800 leading-relaxed">
                اعتراض تسویه را متوقف می‌کند و جار بررسی می‌کند. برای اصلاح جزئی، «درخواست اصلاح» بهتر است.
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs"
                placeholder="حداقل ۱۵ کاراکتر — مشکل را بنویسید"
              />
              <button
                type="button"
                disabled={isPending || note.trim().length < 15}
                onClick={() => run(() => raiseDisputeAction(order.id, note))}
                className="h-9 rounded-lg bg-rose-700 px-3 text-[11px] font-bold text-white disabled:opacity-50"
              >
                ثبت اعتراض
              </button>
            </div>
          )}
        </div>
      )}

      {role === "admin" && order.paidAt && !order.settledAt && !order.disputedAt && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => adminReleaseEscrowAction(order.id))}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-800 disabled:opacity-50"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          آزادسازی ادمین (بدون تایید مشتری)
        </button>
      )}

      {(role === "specialist" || role === "admin") && order.deliveredAt && !order.settledAt && (
        <p className="text-[11px] text-neutral-500 text-center">
          منتظر تایید کارفرما هستید
          {order.deliveredAt
            ? ` · تحویل: ${formatJalaliDate(new Date(order.deliveredAt))}`
            : ""}
        </p>
      )}
    </div>
  );
}
