"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  Calendar,
  Clock,
  Coins,
  ShieldCheck,
} from "lucide-react";
import {
  submitProjectInterestAction,
  AvailableOrderSpecialistView,
} from "@/app/actions/marketplaceActions";
import { formatPrice } from "@/components/order/BudgetSlider";

interface SpecialistInterestModalProps {
  order: AvailableOrderSpecialistView | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string, interestId: string) => void;
}

export default function SpecialistInterestModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: SpecialistInterestModalProps) {
  const [message, setMessage] = useState("");
  const [proposedPrice, setProposedPrice] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMsg = message.trim();
    if (cleanMsg.length < 5) {
      setError("لطفاً حداقل ۵ کاراکتر توضیحات یا معرفی خود را بنویسید.");
      return;
    }

    const priceNum = proposedPrice ? parseInt(proposedPrice.replace(/[^0-9]/g, ""), 10) : undefined;

    startTransition(async () => {
      const res = await submitProjectInterestAction({
        orderId: order.id,
        message: cleanMsg,
        proposedPrice: priceNum || null,
      });

      if (!res.success) {
        setError(res.error || "خطایی در ثبت پیشنهاد رخ داد.");
      } else {
        onSuccess(order.id, res.interestId!);
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-jar-border bg-jar-surface p-6 sm:p-8 shadow-2xl z-10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-jar-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-jar-canvas text-jar-logo border border-jar-border">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-jar-primary">اعلام آمادگی برای پروژه</h3>
              <p className="text-xs text-jar-muted font-medium">
                {order.categoryTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-jar-canvas border border-jar-border text-jar-muted hover:bg-jar-soft hover:text-jar-primary transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Project Mini Specs */}
        <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-jar-canvas border border-jar-border/60 p-3.5 text-xs">
          <div className="flex items-center gap-2 text-jar-muted">
            <Calendar className="h-4 w-4 text-jar-logo shrink-0" />
            <span>تاریخ: <b className="text-jar-primary">{order.bookingDate}</b></span>
          </div>
          <div className="flex items-center gap-2 text-jar-muted">
            <Clock className="h-4 w-4 text-jar-logo shrink-0" />
            <span>زمان: <b className="text-jar-primary">{order.timeSlot} ({order.durationHours} ساعت)</b></span>
          </div>
          <div className="col-span-2 flex items-center justify-between pt-2 border-t border-jar-border/60">
            <span className="text-jar-muted">برآورد کل پروژه:</span>
            <span className="font-bold text-jar-primary font-mono">
              {formatPrice(order.totalEstimatedPrice)} تومان
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-jar-primary">
                پیام معرفی و توضیحات برای کارفرما <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-jar-muted font-mono">
                {message.length} / ۱۰۰۰
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="تجهیزات همراه، سبک کاری، انگیزه و نکاتی که کارفرما را ترغیب به انتخاب شما می‌کند بنویسید..."
              rows={4}
              maxLength={1000}
              required
              className="w-full rounded-2xl border border-jar-border bg-jar-surface p-3.5 text-xs sm:text-sm text-jar-primary placeholder:text-jar-muted/60 outline-none transition-all focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20 leading-relaxed"
            />
          </div>

          {/* Proposed Price (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-jar-primary">
                قیمت پیشنهادی شما (تومان) - <span className="text-jar-muted font-normal">اختیاری</span>
              </label>
              <span className="text-[10px] text-jar-muted">
                پیش‌فرض: {formatPrice(order.totalEstimatedPrice)} تومان
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={proposedPrice ? Number(proposedPrice.replace(/\D/g, "")).toLocaleString("fa-IR") : ""}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9۰-۹]/g, "");
                  // convert persian digits to english
                  const enVal = val.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
                  setProposedPrice(enVal);
                }}
                placeholder={`مثلاً ${Number(order.totalEstimatedPrice).toLocaleString("fa-IR")}`}
                className="w-full h-11 rounded-full border border-jar-border bg-jar-surface px-4 text-xs sm:text-sm text-jar-primary placeholder:text-jar-muted/60 outline-none transition-all focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20 font-mono"
              />
              <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-jar-muted pointer-events-none" />
            </div>
          </div>

          {/* Privacy Guidance Note */}
          <div className="flex items-start gap-2 rounded-2xl bg-jar-canvas border border-jar-border p-3 text-[11px] text-jar-muted leading-relaxed">
            <ShieldCheck className="h-4 w-4 text-jar-logo shrink-0 mt-0.5" />
            <p>
              کارفرما متن پیام و پورتفولیوی متصل به این شاخه شما را بررسی خواهد کرد. اطلاعات تماس پس از تایید و انتخاب نهایی شما فعال می‌شود.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-11 rounded-full border border-jar-border bg-jar-surface hover:bg-jar-soft text-jar-primary text-xs font-medium transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={isPending || message.trim().length < 5}
              className="flex-[2] flex h-11 items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white font-medium text-xs sm:text-sm shadow-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>در حال ارسال...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>ارسال پیشنهاد آمادگی</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
