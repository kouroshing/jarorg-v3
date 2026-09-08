"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelOrderAction } from "@/app/actions/adminActionHandlers";
import { XCircle, AlertTriangle } from "lucide-react";

interface CancelOrderDialogProps {
  resource?: string;
  resourceIds?: string[];
  onClose?: () => void;
  data?: any[];
}

export default function CancelOrderDialog({
  resourceIds = [],
  onClose,
  data,
}: CancelOrderDialogProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderId = resourceIds[0];
  const orderData = Array.isArray(data) ? data[0] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    if (!note.trim()) {
      setError("لطفاً دلیل لغو سفارش را وارد کنید.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await cancelOrderAction({ orderId, reason: note.trim() });
      if (!res.success) {
        setError(res.error || "خطا در ثبت لغو سفارش");
        setLoading(false);
        return;
      }
      if (onClose) onClose();
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "خطای غیرمنتظره در ارتباط با سرور");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 rounded-xl text-right font-sans" dir="rtl">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <XCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            لغو سفارش و ثبت یادداشت اداری
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            شناسه سفارش: <span className="font-mono text-slate-700 dark:text-slate-300">{orderId}</span>
          </p>
        </div>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 text-xs leading-5 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <span>
          با تایید این اکشن، وضعیت سفارش به <strong>CANCELLED</strong> تغییر یافته و پروژه از چرخه رادار متخصصان خارج می‌شود. این فرآیند صرفاً رکورد داخلی است و به درگاه پرداخت متصل نمی‌باشد.
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cancel-note" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            علت لغو سفارش <span className="text-red-500">*</span>
          </label>
          <textarea
            id="cancel-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            required
            placeholder="مثال: لغو به درخواست کارفرما به دلیل تغییر تاریخ مراسم. هماهنگی تلفنی انجام شد."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={loading || !note.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            {loading ? "در حال ثبت..." : "تایید و لغو قطعی سفارش"}
          </button>
        </div>
      </form>
    </div>
  );
}
