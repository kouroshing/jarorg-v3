"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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
  Car,
} from "lucide-react";
import {
  submitProjectInterestAction,
  AvailableOrderSpecialistView,
} from "@/app/actions/marketplaceActions";
import { formatPrice } from "@/components/order/BudgetSlider";
import {
  TIME_SLOTS,
  getUpcoming14Days,
} from "@/components/order/steps/StepDateTime";

function parseToman(raw: string): number | undefined {
  const en = raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "");
  if (!en) return undefined;
  const n = parseInt(en, 10);
  return Number.isFinite(n) ? n : undefined;
}

function tomanField(raw: string): string {
  const n = parseToman(raw);
  return n != null ? n.toLocaleString("fa-IR") : "";
}

export type ScheduleStance = "ACCEPT_CLIENT" | "DEFER" | "PROPOSE";

interface SpecialistInterestModalProps {
  order: AvailableOrderSpecialistView | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string, interestId: string) => void;
  tokenCostApply?: number;
  tokensRemaining?: number;
}

export default function SpecialistInterestModal({
  order,
  isOpen,
  onClose,
  onSuccess,
  tokenCostApply = 1,
  tokensRemaining,
}: SpecialistInterestModalProps) {
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");
  const [proposedPrice, setProposedPrice] = useState<string>("");
  const [overrideTravel, setOverrideTravel] = useState(false);
  const [travelFee, setTravelFee] = useState("");
  const [travelReason, setTravelReason] = useState("");
  const [scheduleStance, setScheduleStance] = useState<ScheduleStance>("ACCEPT_CLIENT");
  const [proposedBookingDate, setProposedBookingDate] = useState("");
  const [proposedTimeSlot, setProposedTimeSlot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const upcomingDays = useMemo(() => getUpcoming14Days(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setMessage("");
      setProposedPrice("");
      setOverrideTravel(false);
      setTravelFee("");
      setTravelReason("");
      setScheduleStance("ACCEPT_CLIENT");
      setProposedBookingDate("");
      setProposedTimeSlot("");
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !order || !mounted) return null;

  const outOfTokens =
    typeof tokensRemaining === "number" && tokensRemaining < tokenCostApply;

  const quotedTravel = order.travel?.isFree ? 0 : order.travel?.fee ?? 0;
  const priceNum = parseToman(proposedPrice);
  const travelNum = parseToman(travelFee);
  const feePrice = priceNum ?? order.totalEstimatedPrice;
  const feeTravel = overrideTravel ? travelNum ?? quotedTravel : quotedTravel;
  const feeTotal = feePrice + feeTravel;

  const clientTimeLabel = order.isFlexibleSchedule
    ? "زمان منعطف (هماهنگی با مشتری)"
    : `${order.bookingDate || "—"} · ${order.timeSlot || "—"}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanMsg = message.trim();
    if (cleanMsg.length < 5) {
      setError("لطفاً حداقل ۵ کاراکتر توضیحات یا معرفی خود را بنویسید.");
      return;
    }

    if (outOfTokens) {
      setError("توکن این ماه برای اعلام آمادگی کافی نیست.");
      return;
    }

    if (overrideTravel) {
      if (travelNum == null) {
        setError("مبلغ ایاب‌وذهاب را وارد کنید یا حالت خودکار را نگه دارید.");
        return;
      }
      if (travelReason.trim().length < 5) {
        setError("برای تغییر ایاب‌وذهاب باید دلیلش را بنویسید.");
        return;
      }
    }

    if (scheduleStance === "PROPOSE") {
      if (!proposedBookingDate.trim() || !proposedTimeSlot.trim()) {
        setError("برای پیشنهاد زمان جایگزین، تاریخ و بازه را انتخاب کنید.");
        return;
      }
    }

    startTransition(async () => {
      const res = await submitProjectInterestAction({
        orderId: order.id,
        message: cleanMsg,
        proposedPrice: priceNum || null,
        travelFeeOverride: overrideTravel ? travelNum ?? null : null,
        travelFeeOverrideReason: overrideTravel ? travelReason.trim() : null,
        scheduleStance,
        proposedBookingDate:
          scheduleStance === "PROPOSE" ? proposedBookingDate.trim() : null,
        proposedTimeSlot:
          scheduleStance === "PROPOSE" ? proposedTimeSlot.trim() : null,
      });

      if (!res.success) {
        setError(res.error || "خطایی در ثبت پیشنهاد رخ داد.");
      } else {
        onSuccess(order.id, res.interestId!);
        onClose();
      }
    });
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-6"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interest-modal-title"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      <div className="relative z-10 flex w-full max-w-lg max-h-[85dvh] sm:max-h-[90vh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-jar-border bg-jar-surface shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-jar-border px-5 sm:px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-jar-canvas text-jar-logo border border-jar-border">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="interest-modal-title"
                className="text-base font-bold text-jar-primary truncate"
              >
                اعلام آمادگی برای پروژه
              </h3>
              <p className="text-xs text-jar-muted font-medium truncate">
                {order.categoryTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-jar-canvas border border-jar-border text-jar-muted hover:bg-jar-soft hover:text-jar-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form
          id="interest-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 space-y-4"
        >
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Mini Specs */}
          <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-jar-canvas border border-jar-border/60 p-3.5 text-xs">
            <div className="flex items-center gap-2 text-jar-muted col-span-2 sm:col-span-1">
              <Calendar className="h-4 w-4 text-jar-logo shrink-0" />
              <span>
                زمان مشتری:{" "}
                <b className="text-jar-primary">{clientTimeLabel}</b>
              </span>
            </div>
            <div className="flex items-center gap-2 text-jar-muted">
              <Clock className="h-4 w-4 text-jar-logo shrink-0" />
              <span>
                مدت: <b className="text-jar-primary">{order.durationHours} ساعت</b>
              </span>
            </div>
            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-jar-border/60">
              <span className="text-jar-muted">برآورد کل پروژه:</span>
              <span className="font-bold text-jar-primary font-mono">
                {formatPrice(order.totalEstimatedPrice)} تومان
              </span>
            </div>
            {order.travel && (
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-jar-muted">ایاب‌وذهاب برآوردی:</span>
                <span className="font-bold text-jar-primary font-mono">
                  {order.travel.isFree
                    ? "رایگان"
                    : `${formatPrice(order.travel.fee)} تومان`}
                </span>
              </div>
            )}
          </div>

          {order.projectDescription && (
            <div className="space-y-1.5 rounded-2xl border border-jar-border bg-jar-canvas p-3.5">
              <h4 className="text-[11px] font-bold text-jar-primary">
                توضیحات کارفرما
              </h4>
              <p className="text-xs text-jar-muted leading-relaxed whitespace-pre-wrap break-words font-medium">
                {order.projectDescription}
              </p>
            </div>
          )}

          {/* Schedule stance */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-jar-primary">
              زمان پروژه <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {(
                [
                  {
                    id: "ACCEPT_CLIENT" as const,
                    title: "موافق زمان مشتری هستم",
                    hint: clientTimeLabel,
                  },
                  {
                    id: "DEFER" as const,
                    title: "بعد از پرداخت هماهنگ می‌کنم",
                    hint: "آماده‌ام با هر زمانی که مشتری بگوید همراه شوم",
                  },
                  {
                    id: "PROPOSE" as const,
                    title: "زمان جایگزین پیشنهاد می‌کنم",
                    hint: "تاریخ و بازهٔ خودتان را مشخص کنید",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScheduleStance(opt.id)}
                  className={`w-full text-right rounded-2xl border px-3.5 py-3 transition-colors ${
                    scheduleStance === opt.id
                      ? "border-jar-primary bg-jar-primary text-white"
                      : "border-jar-border bg-jar-surface hover:border-jar-primary/40"
                  }`}
                >
                  <span className="block text-xs font-bold">{opt.title}</span>
                  <span
                    className={`block text-[11px] mt-0.5 ${
                      scheduleStance === opt.id
                        ? "text-white/80"
                        : "text-jar-muted"
                    }`}
                  >
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>

            {scheduleStance === "PROPOSE" && (
              <div className="space-y-3 rounded-2xl border border-jar-border bg-jar-canvas p-3.5">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-jar-primary">
                    تاریخ پیشنهادی
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {upcomingDays.map((day) => {
                      const on = proposedBookingDate === day.dateStr;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => setProposedBookingDate(day.dateStr)}
                          className={`shrink-0 rounded-xl px-2.5 py-2 text-center min-w-[3.5rem] border text-[10px] font-bold transition-colors ${
                            on
                              ? "bg-jar-primary text-white border-jar-primary"
                              : "bg-jar-surface border-jar-border text-jar-primary"
                          }`}
                        >
                          <span className="block">{day.relativeTag || day.weekday}</span>
                          <span className="block opacity-80 mt-0.5">
                            {day.formattedJalali.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-jar-primary">
                    بازهٔ زمانی
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {TIME_SLOTS.map((slot) => {
                      const on = proposedTimeSlot === slot.label;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setProposedTimeSlot(slot.label)}
                          className={`rounded-full px-3 py-1.5 text-[10px] font-bold border transition-colors ${
                            on
                              ? "bg-jar-primary text-white border-jar-primary"
                              : "bg-jar-surface border-jar-border text-jar-primary"
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-jar-primary">
                پیام معرفی و توضیحات برای کارفرما{" "}
                <span className="text-rose-500">*</span>
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

          {/* Proposed Price */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-jar-primary">
                قیمت پیشنهادی شما (تومان) -{" "}
                <span className="text-jar-muted font-normal">اختیاری</span>
              </label>
              <span className="text-[10px] text-jar-muted">
                پیش‌فرض: {formatPrice(order.totalEstimatedPrice)} تومان
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={tomanField(proposedPrice)}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9۰-۹]/g, "");
                  const enVal = val.replace(/[۰-۹]/g, (d) =>
                    String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
                  );
                  setProposedPrice(enVal);
                }}
                placeholder={`مثلاً ${Number(order.totalEstimatedPrice).toLocaleString("fa-IR")}`}
                className="w-full h-11 rounded-full border border-jar-border bg-jar-surface px-4 text-xs sm:text-sm text-jar-primary placeholder:text-jar-muted/60 outline-none transition-all focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20 font-mono"
              />
              <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-jar-muted pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-jar-border bg-jar-canvas p-3.5">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-jar-primary">
                <Car className="h-4 w-4 text-jar-logo" />
                ایاب‌وذهاب
              </label>
              {order.travel ? (
                <span className="text-[11px] font-mono text-jar-muted">
                  پیشنهاد جار:{" "}
                  {order.travel.isFree
                    ? "رایگان"
                    : `${formatPrice(order.travel.fee)} تومان`}
                  {order.travel.distanceKm != null
                    ? ` · حدود ${Math.round(order.travel.distanceKm).toLocaleString("fa-IR")} کیلومتر`
                    : ""}
                </span>
              ) : (
                <Link
                  href="/specialist/profile"
                  className="text-[11px] font-bold text-jar-logo hover:underline"
                >
                  مبدأ حرکت ثبت نشده — تکمیل پروفایل
                </Link>
              )}
            </div>
            <label className="flex items-center gap-2 text-[11px] font-medium text-jar-muted cursor-pointer">
              <input
                type="checkbox"
                checked={overrideTravel}
                onChange={(e) => setOverrideTravel(e.target.checked)}
                className="h-4 w-4 rounded border-jar-border"
              />
              می‌خواهم مبلغ ایاب‌وذهاب را خودم عوض کنم
            </label>
            {overrideTravel && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={tomanField(travelFee)}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9۰-۹]/g, "");
                    setTravelFee(
                      val.replace(/[۰-۹]/g, (d) =>
                        String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
                      )
                    );
                  }}
                  placeholder="مبلغ ایاب‌وذهاب به تومان"
                  className="w-full h-11 rounded-full border border-jar-border bg-jar-surface px-4 text-xs font-mono outline-none focus:border-jar-logo"
                />
                <textarea
                  value={travelReason}
                  onChange={(e) => setTravelReason(e.target.value)}
                  rows={2}
                  placeholder="چرا با مبلغ خودکار جار فرق دارد؟ مثلاً عوارض، ون تجهیزات، مسیر خاص..."
                  className="w-full rounded-2xl border border-jar-border bg-jar-surface p-3 text-xs outline-none focus:border-jar-logo"
                />
              </div>
            )}
            <div className="flex items-center justify-between border-t border-jar-border/60 pt-2 text-xs">
              <span className="text-jar-muted font-medium">
                جمع قابل نمایش به کارفرما
              </span>
              <span className="font-bold font-mono text-jar-primary">
                {formatPrice(feeTotal)} تومان
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-2xl bg-jar-canvas border border-jar-border p-3 text-[11px] text-jar-muted leading-relaxed">
            <ShieldCheck className="h-4 w-4 text-jar-logo shrink-0 mt-0.5" />
            <p>
              ارسال این پیشنهاد {tokenCostApply.toLocaleString("fa-IR")} توکن از
              سهمیه ماهانه کم می‌کند.
              {typeof tokensRemaining === "number"
                ? ` موجودی فعلی شما ${tokensRemaining.toLocaleString("fa-IR")} توکن است.`
                : ""}{" "}
              اطلاعات تماس کارفرما فقط بعد از انتخاب شما و پرداخت نمایش داده
              می‌شود.
            </p>
          </div>
        </form>

        {/* Sticky footer — clear of mobile bottom nav */}
        <div className="shrink-0 border-t border-jar-border bg-jar-surface px-5 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-11 rounded-full border border-jar-border bg-jar-surface hover:bg-jar-soft text-jar-primary text-xs font-medium transition-colors disabled:opacity-50"
            >
              بستن
            </button>

            <button
              type="submit"
              form="interest-form"
              disabled={isPending || message.trim().length < 5 || outOfTokens}
              className="flex-[2] flex h-11 items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white font-medium text-xs sm:text-sm shadow-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
