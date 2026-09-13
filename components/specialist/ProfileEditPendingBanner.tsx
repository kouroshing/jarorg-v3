"use client";

import { AlertCircle, Clock } from "lucide-react";

export default function ProfileEditPendingBanner({
  status,
  note,
}: {
  status?: string | null;
  note?: string | null;
}) {
  if (status === "PENDING") {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-950">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="space-y-1 leading-relaxed">
          <p>تغییرات شما ثبت شد و در انتظار تایید جار است.</p>
          <p className="font-medium text-amber-800/90">
            تا قبل از تایید، پروفایل عمومی همان نسخه قبلی باقی می‌ماند.
          </p>
        </div>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
        <div className="space-y-1 leading-relaxed">
          <p>آخرین ویرایش پروفایل رد شد. می‌توانید دوباره ارسال کنید.</p>
          {note ? <p className="font-medium whitespace-pre-wrap">{note}</p> : null}
        </div>
      </div>
    );
  }

  return null;
}
