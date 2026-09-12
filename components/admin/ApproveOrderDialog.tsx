"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { approveOrderAction } from "@/app/actions/adminActionHandlers";
import { CheckCircle2 } from "lucide-react";

interface ApproveOrderDialogProps {
  resourceIds?: string[];
  onClose?: () => void;
}

export default function ApproveOrderDialog({
  resourceIds = [],
  onClose,
}: ApproveOrderDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderId = resourceIds[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await approveOrderAction({ orderId });
      if (!res.success) {
        setError(res.error || "خطا در تایید");
        setLoading(false);
        return;
      }
      onClose?.();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "خطای سرور");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-xl text-right" dir="rtl">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            تایید و انتشار سفارش
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{orderId}</p>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
        با تایید، سفارش وارد مرحله جستجوی متخصص می‌شود و در برد متخصصان نمایش داده می‌شود.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
        >
          {loading ? "در حال تایید..." : "تایید و انتشار"}
        </button>
      </form>
    </div>
  );
}
