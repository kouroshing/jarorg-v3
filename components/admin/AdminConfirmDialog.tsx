"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

/** Shared RTL confirm panel for destructive admin actions (replaces window.confirm). */
export default function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تایید",
  cancelLabel = "انصراف",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "neutral";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : tone === "warning"
        ? "bg-amber-600 hover:bg-amber-700 text-white"
        : "bg-slate-900 hover:bg-slate-800 text-white";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-confirm-title"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 rounded-full p-2 ${
              tone === "danger"
                ? "bg-rose-50 text-rose-600"
                : tone === "warning"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 id="admin-confirm-title" className="text-sm font-black text-slate-900">
              {title}
            </h3>
            <div className="text-xs text-slate-600 leading-relaxed">{description}</div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-9 rounded-lg px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-bold disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
