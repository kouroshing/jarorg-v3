"use client";

import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * Fixed confirmation chip after a successful save.
 * Sits above mobile bottom nav / safe area.
 */
export default function SaveFeedbackToast({
  open,
  message = "ذخیره شد",
  onClose,
  durationMs = 3200,
}: {
  open: boolean;
  message?: string;
  onClose?: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!open || !onClose) return;
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [open, onClose, durationMs]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-8"
      dir="rtl"
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
