"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Loader2,
  Users,
  CreditCard,
  XCircle,
} from "lucide-react";
import { formatJalaliDate } from "@/lib/date/jalali";
import { cancelOrderAction } from "@/app/actions/adminActionHandlers";
import { orderStatusPresentation } from "@/lib/orders/status";
import type { TriageOrderRow } from "@/components/admin/AdminOrderTriageQueue";

type Mode = "matching" | "payment";

export default function AdminFollowUpQueue({
  orders,
  mode,
}: {
  orders: TriageOrderRow[];
  mode: Mode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpenId, setCancelOpenId] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState("");

  const emptyCopy =
    mode === "matching"
      ? "سفارش گیرکرده‌ای در تطبیق نیست."
      : "سفارشی در انتظار پرداخت نیست.";

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
        {emptyCopy}
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}
      {orders.map((ord) => {
        const busy = busyId === ord.id && isPending;
        const status = orderStatusPresentation(ord.status);
        const ageHours = Math.max(
          0,
          Math.round((Date.now() - new Date(ord.createdAt).getTime()) / 36e5)
        );
        const applicants = ord.applicantCount ?? 0;

        return (
          <div
            key={ord.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">
                  {ord.categoryTitle || "پروژه"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {ord.contactName || "کارفرما"} ·{" "}
                  <span dir="ltr" className="font-mono">
                    {ord.contactPhone || "—"}
                  </span>{" "}
                  · {formatJalaliDate(new Date(ord.createdAt))} ·{" "}
                  {ageHours.toLocaleString("fa-IR")} ساعت
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {status.label}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 tabular-nums">
                    {ord.totalEstimatedPrice.toLocaleString("fa-IR")} تومان
                  </span>
                  {mode === "matching" && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        applicants === 0
                          ? "bg-amber-50 text-amber-800"
                          : "bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {applicants === 0
                        ? "بدون متقاضی"
                        : `${applicants.toLocaleString("fa-IR")} متقاضی`}
                    </span>
                  )}
                  {mode === "matching" && ord.noApplicantsAt && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                      پرچم بدون متقاضی (کرون)
                    </span>
                  )}
                  {mode === "matching" && ord.clientRemindedAt && (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200">
                      یادآوری انتخاب فرستاده شد
                    </span>
                  )}
                  {mode === "payment" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                      <CreditCard className="h-3 w-3" />
                      در انتظار پرداخت
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/Order/${ord.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                باز کردن سفارش
              </Link>
              {mode === "matching" && applicants > 0 && (
                <Link
                  href={`/admin/Order/${ord.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-bold text-emerald-900"
                >
                  <Users className="h-3.5 w-3.5" />
                  انتخاب متقاضی
                </Link>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setCancelOpenId(ord.id);
                  setCancelNote("");
                  setError(null);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-rose-800 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                لغو ادمین
              </button>
            </div>

            {cancelOpenId === ord.id && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2">
                <label className="block text-[11px] font-bold text-rose-900">
                  دلیل لغو (الزامی)
                </label>
                <textarea
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs"
                  placeholder="مثال: مشتری پاسخگو نیست / پروژه منقضی شده"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setCancelOpenId(null)}
                    className="h-8 rounded-lg px-3 text-[11px] font-bold text-slate-600"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    disabled={busy || !cancelNote.trim()}
                    onClick={() => {
                      setBusyId(ord.id);
                      startTransition(async () => {
                        const res = await cancelOrderAction({
                          orderId: ord.id,
                          reason: cancelNote.trim(),
                        });
                        setBusyId(null);
                        if (!res.success) {
                          setError(res.error || "خطا در لغو");
                          return;
                        }
                        setCancelOpenId(null);
                        setCancelNote("");
                        router.refresh();
                      });
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    تایید لغو
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
