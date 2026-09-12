"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { updateWithdrawalStatus } from "@/app/actions/financeActions";
import { formatJalaliDate } from "@/lib/date/jalali";

export type WithdrawalRow = {
  id: string;
  amount: number;
  shabaNumber: string;
  createdAt: string;
  displayName: string | null;
  phone: string | null;
};

export default function AdminWithdrawalQueue({
  requests,
}: {
  requests: WithdrawalRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackingById, setTrackingById] = useState<Record<string, string>>({});

  const run = (
    id: string,
    status: "APPROVED" | "REJECTED",
    trackingCode?: string
  ) => {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await updateWithdrawalStatus(id, status, trackingCode);
      setBusyId(null);
      if (!res.success) {
        setError(res.error || "خطا در بروزرسانی تسویه");
        return;
      }
      router.refresh();
    });
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
        درخواست تسویه معلقی نیست.
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
      {requests.map((row) => {
        const busy = busyId === row.id && isPending;
        return (
          <div
            key={row.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900">
                  {row.displayName || "متخصص"} ·{" "}
                  {row.amount.toLocaleString("fa-IR")} تومان
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  <span dir="ltr" className="font-mono">
                    {row.phone || "—"}
                  </span>{" "}
                  · شبا{" "}
                  <span dir="ltr" className="font-mono">
                    {row.shabaNumber}
                  </span>{" "}
                  · {formatJalaliDate(new Date(row.createdAt))}
                </p>
              </div>
            </div>
            <input
              type="text"
              value={trackingById[row.id] || ""}
              onChange={(e) =>
                setTrackingById((prev) => ({ ...prev, [row.id]: e.target.value }))
              }
              placeholder="کد رهگیری واریز (اختیاری برای تایید)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              dir="ltr"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(row.id, "APPROVED", trackingById[row.id]?.trim())}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                تایید تسویه
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    !window.confirm(
                      "رد تسویه باعث بازگشت مبلغ به کیف پول متخصص می‌شود. ادامه؟"
                    )
                  ) {
                    return;
                  }
                  run(row.id, "REJECTED");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-rose-800 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                رد + بازگشت به کیف پول
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
