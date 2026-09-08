"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { rejectPortfolioAction } from "@/app/actions/adminActionHandlers";
import { XCircle, GraduationCap } from "lucide-react";

interface RejectPortfolioDialogProps {
  resource?: string;
  resourceIds?: string[];
  onClose?: () => void;
  data?: any[];
}

export default function RejectPortfolioDialog({
  resourceIds = [],
  onClose,
  data,
}: RejectPortfolioDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portfolioItemId = resourceIds[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioItemId) return;

    if (!reason.trim()) {
      setError("لطفاً دلیل رد نمونه‌کار را مشخص کنید تا برای متخصص ارسال شود.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await rejectPortfolioAction({ portfolioItemId, reason: reason.trim() });
      if (!res.success) {
        setError(res.error || "خطا در رد نمونه‌کار");
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
        <div className="p-2.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
          <XCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            رد نمونه‌کار و ارسال اعلان به متخصص
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            شناسه اثر: <span className="font-mono text-slate-700 dark:text-slate-300">{portfolioItemId}</span>
          </p>
        </div>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-blue-900 dark:text-blue-300 text-xs leading-5 flex items-start gap-2">
        <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <span>
          با رد این نمونه‌کار، وضعیت آن به <strong>REJECTED</strong> تغییر کرده و خودکار پیامی با قالب <code>portfolio-rejected-jaramooz</code> به همراه دلیل و پیشنهاد مشاهده دوره‌های <strong>جارآموز</strong> در پنل کاربری متخصص ارسال می‌شود.
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reject-reason" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            علت رد اثر (جهت راهنمایی متخصص) <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            required
            placeholder="مثال: نورپردازی نامناسب و عدم رعایت فوکوس در پرتره تجاری. نیاز به رعایت استانداردهای کادربندی."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all"
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
            disabled={loading || !reason.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            {loading ? "در حال ارسال..." : "تایید رد اثر و ارسال پیام"}
          </button>
        </div>
      </form>
    </div>
  );
}
