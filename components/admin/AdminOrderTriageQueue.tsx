"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  PencilLine,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { formatJalaliDate } from "@/lib/date/jalali";
import {
  approveOrderAction,
  requestOrderEditAction,
  cancelOrderAction,
} from "@/app/actions/adminActionHandlers";
import { orderStatusPresentation } from "@/lib/orders/status";

export type TriageOrderRow = {
  id: string;
  categoryTitle: string | null;
  status: string;
  totalEstimatedPrice: number;
  createdAt: string;
  contactName: string | null;
  contactPhone: string | null;
  applicantCount?: number;
};

export default function AdminOrderTriageQueue({
  orders,
}: {
  orders: TriageOrderRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpenId, setEditOpenId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [cancelOpenId, setCancelOpenId] = useState<string | null>(null);
  const [cancelNote, setCancelNote] = useState("");

  const run = (orderId: string, fn: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    setBusyId(orderId);
    startTransition(async () => {
      const res = await fn();
      setBusyId(null);
      if (!res.success) {
        setError(res.error || "خطا در انجام عملیات");
        return;
      }
      setEditOpenId(null);
      setCancelOpenId(null);
      setEditNote("");
      setCancelNote("");
      router.refresh();
    });
  };

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
        سفارشی در صف تایید نیست.
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
        const st = orderStatusPresentation(ord.status);
        const busy = busyId === ord.id || (isPending && busyId === ord.id);
        const canApprove =
          ord.status === "PENDING_REVIEW" || ord.status === "NEEDS_CLIENT_EDIT";

        return (
          <div
            key={ord.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    {ord.categoryTitle || "پروژه"}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${st.badgeBg}`}
                  >
                    {st.adminLabel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {ord.contactName || "—"} ·{" "}
                  <span dir="ltr" className="font-mono">
                    {ord.contactPhone || "—"}
                  </span>{" "}
                  · {formatJalaliDate(new Date(ord.createdAt))} ·{" "}
                  {ord.totalEstimatedPrice.toLocaleString("fa-IR")} ت
                  {typeof ord.applicantCount === "number" && (
                    <> · {ord.applicantCount.toLocaleString("fa-IR")} متقاضی</>
                  )}
                </p>
              </div>
              <Link
                href={`/admin/Order/${ord.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                جزئیات
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {editOpenId === ord.id ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                  placeholder="پیام برای کارفرما: چه چیزی باید اصلاح شود؟"
                  className="w-full rounded-lg border border-amber-200 bg-white p-2 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy || editNote.trim().length < 5}
                    onClick={() =>
                      run(ord.id, () =>
                        requestOrderEditAction({ orderId: ord.id, note: editNote.trim() })
                      )
                    }
                    className="h-9 flex-1 rounded-lg bg-amber-600 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "ارسال درخواست ویرایش"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOpenId(null)}
                    className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            ) : cancelOpenId === ord.id ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
                <textarea
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  rows={2}
                  placeholder="علت لغو اداری"
                  className="w-full rounded-lg border border-rose-200 bg-white p-2 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy || !cancelNote.trim()}
                    onClick={() =>
                      run(ord.id, () =>
                        cancelOrderAction({ orderId: ord.id, reason: cancelNote.trim() })
                      )
                    }
                    className="h-9 flex-1 rounded-lg bg-rose-600 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "لغو قطعی"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelOpenId(null)}
                    className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {canApprove && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(ord.id, () => approveOrderAction({ orderId: ord.id }))
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    تایید و انتشار
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setCancelOpenId(null);
                    setEditOpenId(ord.id);
                    setEditNote("");
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[11px] font-bold text-amber-900 disabled:opacity-50"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  درخواست ویرایش
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditOpenId(null);
                    setCancelOpenId(ord.id);
                    setCancelNote("");
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-rose-800 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  لغو
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
