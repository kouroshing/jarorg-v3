"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { requestOrderEditAction } from "@/app/actions/adminActionHandlers";
import { PencilLine } from "lucide-react";

interface RequestOrderEditDialogProps {
  resourceIds?: string[];
  onClose?: () => void;
}

export default function RequestOrderEditDialog({
  resourceIds = [],
  onClose,
}: RequestOrderEditDialogProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderId = resourceIds[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    if (!note.trim()) {
      setError("پیام ویرایش برای کارفرما الزامی است.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await requestOrderEditAction({ orderId, note: note.trim() });
      if (!res.success) {
        setError(res.error || "خطا");
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
    <div className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 rounded-xl text-right" dir="rtl">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2.5 rounded-full bg-amber-50 text-amber-700">
          <PencilLine className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            درخواست ویرایش از کارفرما
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{orderId}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            پیام برای کارفرما <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            required
            placeholder="مثال: لطفاً آدرس دقیق‌تر و تعداد نفرات را در توضیحات بنویسید."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
            disabled={loading || !note.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg"
          >
            {loading ? "در حال ارسال..." : "ارسال درخواست ویرایش"}
          </button>
        </div>
      </form>
    </div>
  );
}
