"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import type { CustomInputProps } from "@premieroctet/next-admin";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, User } from "lucide-react";
import {
  adminSelectInterestAction,
  getOrderInterestsForAdmin,
} from "@/app/actions/adminActionHandlers";
import { formatPrice } from "@/lib/format/price";

type InterestRow = {
  id: string;
  status: string;
  proposedPrice: number | null;
  travelFee: number | null;
  message: string | null;
  createdAt: string;
  specialist: {
    id: string;
    displayName: string | null;
    phone: string | null;
    city: string | null;
  };
};

export default function OrderApplicantsAdminWidget({ item }: CustomInputProps) {
  const router = useRouter();
  const orderId = item?.id as string | undefined;
  const [rows, setRows] = useState<InterestRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    const res = await getOrderInterestsForAdmin(orderId);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "خطا در بارگذاری متقاضیان");
      return;
    }
    setRows(res.interests);
    setSelectedId(res.selectedSpecialistId);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!orderId) {
    return (
      <p className="text-xs text-slate-500" dir="rtl">
        پس از ذخیره اولیه سفارش، متقاضیان اینجا دیده می‌شوند.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-800">متقاضیان این سفارش</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[10px] font-bold text-indigo-600"
        >
          بروزرسانی
        </button>
      </div>

      {error && (
        <p className="text-[11px] font-bold text-rose-700">{error}</p>
      )}
      {notice && (
        <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {notice}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-2">هنوز کسی اعلام آمادگی نکرده.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const isSelected = selectedId === row.specialist.id;
            const total =
              (row.proposedPrice || 0) + (row.travelFee || 0);
            const busy = busyId === row.id && isPending;
            return (
              <li
                key={row.id}
                className={`rounded-lg border bg-white p-3 ${
                  isSelected ? "border-emerald-300" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">
                        {row.specialist.displayName || "متخصص"}
                        {isSelected && (
                          <span className="mr-1 text-[10px] text-emerald-700">
                            (انتخاب‌شده)
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {row.specialist.city || "—"} ·{" "}
                        <span dir="ltr" className="font-mono">
                          {row.specialist.phone || "—"}
                        </span>{" "}
                        · {row.status}
                      </p>
                      <p className="text-[10px] font-bold text-slate-700 mt-1">
                        جمع {formatPrice(total)} ت
                        {row.message ? ` — ${row.message}` : ""}
                      </p>
                    </div>
                  </div>
                  {!isSelected && row.status !== "WITHDRAWN" && row.status !== "CANCELLED" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setNotice(null);
                        setError(null);
                        setBusyId(row.id);
                        startTransition(async () => {
                          const res = await adminSelectInterestAction({
                            orderId,
                            interestId: row.id,
                          });
                          setBusyId(null);
                          if (!res.success) {
                            setError(res.error || "خطا");
                            return;
                          }
                          setNotice(res.message || "انتخاب شد");
                          setSelectedId(row.specialist.id);
                          router.refresh();
                          void load();
                        });
                      }}
                      className="shrink-0 h-8 px-2.5 rounded-lg bg-slate-900 text-[10px] font-bold text-white disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "انتخاب"
                      )}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
