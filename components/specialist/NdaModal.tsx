"use client";

import React from "react";
import { ShieldCheck, X, FileText, CheckCircle2, Lock } from "lucide-react";

interface NdaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function NdaModal({ isOpen, onClose, onAccept }: NdaModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-[28px] bg-white text-right shadow-2xl border border-white/90 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-jar-border bg-jar-soft/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-jar-soft text-jar-logo border border-jar-border shadow-2xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-jar-primary">
                تعهدنامه حفظ محرمانگی اطلاعات و حریم خصوصی (NDA)
              </h3>
              <p className="text-[11px] text-jar-muted mt-0.5">
                قوانین الزامی پلتفرم جار برای تمامی متخصصین عکاسی و تصویربرداری
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-jar-muted hover:bg-jar-soft hover:text-jar-primary transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Terms Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs text-jar-muted leading-relaxed font-medium">
          <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-3.5 text-amber-900 font-bold flex items-start gap-2">
            <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              حفظ کامل حریم خصوصی کارفرمایان، اصل اول و خط قرمز پلتفرم جار است. هرگونه نقض این تعهدنامه موجب انسداد دائم حساب و پیگرد قانونی خواهد بود.
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <h4 className="font-black text-jar-primary flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>۱. عدم انتشار و افشای فایل‌های خصوصی و خانوادگی:</span>
              </h4>
              <p className="text-jar-muted pr-5 text-[11px]">
                متخصص متعهد می‌گردد هیچ‌یک از تصاویر، ویدیوها، راش‌ها یا صداهای ضبط‌شده پروژه‌های خصوصی کارفرمایان (شامل مراسم عقد، بله‌برون، عروسی، بارداری، نوزاد و خانوادگی) را در هیچ بستر عمومی، وبسایت، صفحات مجازی، شبکه‌های اجتماعی یا نمایش به مشتریان دیگر منتشر نکند مگر با رضایت کتبی صریح کارفرما.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-jar-primary flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>۲. حفظ محرمانگی اطلاعات تجاری و برندها:</span>
              </h4>
              <p className="text-jar-muted pr-5 text-[11px]">
                در پروژه‌های تبلیغاتی، صنعتی و تیزرسازی، متخصص موظف است مشخصات محصولات قبل از لانچ، استراتژی‌های برند و مستندات تولیدی کارفرما را تا زمان انتشار عمومی کاملاً محرمانه نگه دارد.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-jar-primary flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>۳. امنیت داده‌ها و حذف پس از تحویل نهایی:</span>
              </h4>
              <p className="text-jar-muted pr-5 text-[11px]">
                متخصص موظف است فایل‌های پروژه را در تجهیزات امن و دارای رمزنگاری نگهداری کرده و پس از اتمام دوره گارانتی و تایید نهایی کارفرما، نسبت به امحای فایل‌های حساس اقدام نماید.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-jar-primary flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>۴. مسئولیت حقوقی و ضمانت حسن انجام کار:</span>
              </h4>
              <p className="text-jar-muted pr-5 text-[11px]">
                تخطی از این تعهدنامه نقض صریح قوانین حفظ داده و جرائم رایانه‌ای کشور تلقی شده و کارفرما و پلتفرم جار حق پیگیری خسارات معنوی و مادی در مراجع قضایی ذی‌صلاح را برای خود محفوظ می‌دارند.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-jar-border bg-jar-soft/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-full border border-jar-border bg-jar-surface text-xs font-bold text-jar-muted hover:bg-jar-soft transition cursor-pointer"
          >
            بستن
          </button>

          {onAccept && (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="h-9 px-6 rounded-full bg-jar-primary text-xs font-black text-white hover:bg-jar-primaryHover shadow-sm transition cursor-pointer"
            >
              تعهدنامه را خواندم و می‌پذیرم
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
