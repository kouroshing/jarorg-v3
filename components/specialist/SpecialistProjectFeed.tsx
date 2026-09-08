"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Coins,
  CheckCircle2,
  Send,
  Users,
  ExternalLink,
  Briefcase,
  AlertCircle,
  ShieldAlert,
  FolderOpen,
  Inbox,
  Filter,
  Loader2,
  XCircle,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  AvailableOrderSpecialistView,
  withdrawProjectInterestAction,
  confirmSpecialistSelectionAction,
  declineSpecialistSelectionAction,
} from "@/app/actions/marketplaceActions";
import SpecialistInterestModal from "./SpecialistInterestModal";
import { formatPrice } from "@/components/order/BudgetSlider";

interface SpecialistProjectFeedProps {
  initialOrders: AvailableOrderSpecialistView[];
  authError?: string;
  redirectTo?: string;
}

export default function SpecialistProjectFeed({
  initialOrders,
  authError,
  redirectTo,
}: SpecialistProjectFeedProps) {
  const [orders, setOrders] = useState<AvailableOrderSpecialistView[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrderSpecialistView | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("ALL");

  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ orderId: string; text: string; type: "error" | "success" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Get unique cities present in orders
  const uniqueCities = Array.from(
    new Set(
      orders
        .map((o) => o.districtOrCity)
        .filter((c): c is string => !!c && c.trim().length > 0)
    )
  );

  const filteredOrders = orders.filter((o) => {
    if (selectedCity === "ALL") return true;
    return o.districtOrCity === selectedCity;
  });

  const handleOpenInterestModal = (order: AvailableOrderSpecialistView) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleInterestSuccess = (orderId: string, interestId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            hasApplied: true,
            interestsCount: o.interestsCount + 1,
            myInterest: {
              id: interestId,
              status: "PENDING",
              message: null,
              proposedPrice: null,
              // Mirrors what the server just stored, so the card shows the
              // travel figure straight away instead of after a refresh.
              travelFee: o.travel?.fee ?? null,
              travelFeeOverride: null,
              createdAt: new Date().toISOString(),
            },
          };
        }
        return o;
      })
    );
  };

  const handleWithdraw = (interestId: string, orderId: string) => {
    setBusyActionId(interestId);
    setActionNotice(null);

    startTransition(async () => {
      const res = await withdrawProjectInterestAction(interestId);
      setBusyActionId(null);
      if (!res.success) {
        setActionNotice({ orderId, text: res.error || "خطا در لغو پیشنهاد.", type: "error" });
      } else {
        setActionNotice({ orderId, text: "پیشنهاد شما با موفقیت لغو شد.", type: "success" });
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              return {
                ...o,
                hasApplied: false,
                interestsCount: Math.max(0, o.interestsCount - 1),
                myInterest: o.myInterest ? { ...o.myInterest, status: "WITHDRAWN" } : null,
              };
            }
            return o;
          })
        );
      }
    });
  };

  const handleConfirm = (orderId: string) => {
    setBusyActionId(orderId);
    setActionNotice(null);

    startTransition(async () => {
      const res = await confirmSpecialistSelectionAction(orderId);
      setBusyActionId(null);
      if (!res.success) {
        setActionNotice({ orderId, text: res.error || "خطا در تأیید نهایی پروژه.", type: "error" });
      } else {
        setActionNotice({ orderId, text: "پروژه با موفقیت تأیید شد و به وضعیت CONFIRMED درآمد!", type: "success" });
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              return {
                ...o,
                status: "CONFIRMED",
                myInterest: o.myInterest ? { ...o.myInterest, status: "ACCEPTED" } : null,
              };
            }
            return o;
          })
        );
      }
    });
  };

  const handleDecline = (orderId: string) => {
    setBusyActionId(orderId);
    setActionNotice(null);

    startTransition(async () => {
      const res = await declineSpecialistSelectionAction(orderId);
      setBusyActionId(null);
      if (!res.success) {
        setActionNotice({ orderId, text: res.error || "خطا در رد پیشنهاد.", type: "error" });
      } else {
        setActionNotice({ orderId, text: "عدم پذیرش پروژه ثبت شد.", type: "success" });
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === orderId) {
              return {
                ...o,
                selectedSpecialistId: null,
                hasApplied: false,
                myInterest: o.myInterest ? { ...o.myInterest, status: "DECLINED" } : null,
              };
            }
            return o;
          })
        );
      }
    });
  };

  if (authError) {
    const isIncomplete = authError === "PROFILE_INCOMPLETE" || redirectTo === "/specialist/onboarding";

    return (
      <div className="space-y-6" dir="rtl">
        <div className="rounded-3xl border border-jar-border bg-jar-surface p-8 sm:p-12 text-center space-y-6 shadow-xs backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-jar-canvas text-jar-logo border border-jar-border shadow-xs">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg sm:text-xl font-bold text-jar-primary">
              {isIncomplete
                ? "پروفایل شما هنوز تکمیل نشده است"
                : "دسترسی محدود به متخصصان پلتفرم جار"}
            </h3>
            <p className="text-xs sm:text-sm text-jar-muted leading-relaxed font-medium">
              {isIncomplete
                ? "برای دریافت پروژه، نمونه‌کارها و محدوده کاری خود را تکمیل کنید"
                : authError}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={redirectTo || "/specialist/onboarding"}
              className="inline-flex items-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover px-7 py-3 text-xs sm:text-sm font-medium text-white transition-colors shadow-none"
            >
              <Sparkles className="h-4 w-4 text-jar-logo" />
              <span>تکمیل پروفایل و نمونه‌کارها</span>
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-full border border-jar-border bg-jar-surface px-6 py-3 text-xs sm:text-sm font-medium text-jar-primary hover:bg-jar-soft transition-colors"
            >
              <span>بازگشت به حساب کاربری</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Feed Filters & Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-jar-border bg-jar-surface p-4 sm:p-5 backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-jar-canvas text-jar-logo border border-jar-border">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-jar-primary">پروژه‌های باز و قابل آفیش</h2>
            <p className="text-xs text-jar-muted font-medium">
              {filteredOrders.length} پروژه آماده بررسی و ارسال پیشنهاد
            </p>
          </div>
        </div>

        {/* City Filter Pills */}
        {uniqueCities.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCity("ALL")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCity === "ALL"
                  ? "bg-jar-primary text-white"
                  : "border border-jar-border bg-jar-surface text-jar-muted hover:bg-jar-soft"
              }`}
            >
              همه شهرها
            </button>
            {uniqueCities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCity === city
                    ? "bg-jar-primary text-white"
                    : "border border-jar-border bg-jar-surface text-jar-muted hover:bg-jar-soft"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Inbox className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800">در حال حاضر پروژه‌ای منتظر متقاضی نیست</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
              به محض ثبت سفارش‌های جدید و واریز بیعانه توسط کارفرمایان، سفارش‌ها بلافاصله در این فید ظاهر خواهند شد.
            </p>
          </div>
        </div>
      )}

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredOrders.map((order) => {
          let locationText = "محل مدنظر کارفرما";
          if (order.locationType === "SPECIALIST_ADVICE") locationText = "مشاوره و پیشنهاد متخصص";
          if (order.locationType === "JAR_STUDIO") locationText = "استودیوها و عمارت‌های جار";

          return (
            <div
              key={order.id}
              className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-6 shadow-xs hover:border-jar-logo transition-colors flex flex-col justify-between space-y-5"
            >
              {/* Card Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-jar-canvas text-jar-logo border border-jar-border text-xs font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-jar-logo" />
                      <span>{order.categoryTitle}</span>
                    </span>
                    <h3 className="text-base font-bold text-jar-primary pt-1">
                      آفیش {order.categoryTitle} ({order.durationHours} ساعت)
                    </h3>
                  </div>

                  {/* Applicants Counter Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-jar-canvas border border-jar-border text-jar-muted text-[11px] font-medium shrink-0">
                    <Users className="h-3 w-3" />
                    <span>{order.interestsCount} متقاضی</span>
                  </span>
                </div>

                {/* Specs Pill Matrix */}
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-jar-canvas border border-jar-border/60 p-3 text-xs">
                  {order.isFlexibleSchedule ? (
                    <div className="col-span-2 flex items-center gap-1.5 text-jar-primary bg-jar-surface border border-jar-border px-2.5 py-1.5 rounded-xl text-xs font-medium">
                      <Sparkles className="h-3.5 w-3.5 text-jar-logo shrink-0" />
                      <span>زمان‌بندی: <b className="text-jar-primary">منعطف (هماهنگی توافقی با متخصص پس از پذیرش)</b></span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-jar-muted truncate">
                        <Calendar className="h-3.5 w-3.5 text-jar-logo shrink-0" />
                        <span className="truncate">تاریخ: <b className="text-jar-primary">{order.bookingDate || "تعیین‌نشده"}</b></span>
                      </div>

                      <div className="flex items-center gap-1.5 text-jar-muted truncate">
                        <Clock className="h-3.5 w-3.5 text-jar-logo shrink-0" />
                        <span className="truncate">ساعت: <b className="text-jar-primary">{order.timeSlot || "تعیین‌نشده"}</b></span>
                      </div>
                    </>
                  )}

                  <div className="col-span-2 flex items-center gap-1.5 text-jar-muted truncate pt-1 border-t border-jar-border/60">
                    <MapPin className="h-3.5 w-3.5 text-jar-logo shrink-0" />
                    <span className="truncate">
                      موقعیت: <b className="text-jar-primary">{locationText}</b>
                      {order.districtOrCity ? ` (${order.districtOrCity})` : ""}
                    </span>
                  </div>
                </div>

                {/* Moodboard & Project Description */}
                {(order.projectDescription || order.moodboardUrls.length > 0 || order.referenceLink) && (
                  <div className="space-y-2 pt-1">
                    {order.projectDescription && (
                      <p className="text-xs text-jar-muted leading-relaxed line-clamp-3 font-medium bg-jar-canvas p-2.5 rounded-xl border border-jar-border/60">
                        {order.projectDescription}
                      </p>
                    )}

                    {order.moodboardUrls.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-jar-muted">تصاویر رفرنس کارفرما:</span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {order.moodboardUrls.slice(0, 4).map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className="relative h-14 w-14 rounded-xl overflow-hidden border border-jar-border shrink-0 shadow-xs"
                            >
                              <Image src={imgUrl} alt={`مودبورد ${idx + 1}`} fill className="object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.referenceLink && (
                      <div className="text-[11px] pt-1">
                        <a
                          href={order.referenceLink.startsWith("http") ? order.referenceLink : `https://${order.referenceLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-jar-logo hover:underline font-medium"
                        >
                          <span>مشاهده لینک نمونه کار درخواستی</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Financials & CTA Button */}
              <div className="pt-3 border-t border-jar-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-jar-muted font-medium">برآورد کل پروژه:</span>
                      {order.isAutoPriced ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-jar-canvas border border-jar-border text-jar-logo text-[10px] font-medium">
                          نرخ پیشنهادی جار
                        </span>
                      ) : null}
                    </div>
                    <span className="text-base font-bold text-jar-primary font-mono">
                      {formatPrice(order.totalEstimatedPrice)} <span className="text-xs font-normal">تومان</span>
                    </span>
                  </div>

                  <div className="text-left">
                    {order.depositAmount > 0 ? (
                      <>
                        <span className="block text-[10px] text-emerald-600 font-bold">بیعانه واریز شده:</span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">
                          {formatPrice(order.depositAmount)} تومان
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block text-[10px] text-jar-muted font-medium">تسویه حساب:</span>
                        <span className="text-xs font-medium text-jar-primary">
                          امن پس از توافق
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Notice feedback */}
                {actionNotice && actionNotice.orderId === order.id && (
                  <div
                    className={`rounded-xl p-2.5 text-xs font-bold flex items-center gap-1.5 ${
                      actionNotice.type === "error"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{actionNotice.text}</span>
                  </div>
                )}

                {/* Application CTA Status */}
                {order.myInterest?.status === "SELECTED" || (order.status === "AWAITING_SPECIALIST_CONFIRMATION" && order.hasApplied) ? (
                  <div className="space-y-2 rounded-2xl bg-jar-canvas border border-jar-border p-3.5 text-right">
                    <div className="flex items-center gap-2 text-jar-primary font-bold text-xs">
                      <Sparkles className="h-4 w-4 text-jar-logo shrink-0" />
                      <span>کارفرما شما را انتخاب کرده است! لطفاً جهت شروع کار، وضعیت را نهایی کنید:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleConfirm(order.id)}
                        disabled={isPending && busyActionId === order.id}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors shadow-none cursor-pointer disabled:opacity-50"
                      >
                        {isPending && busyActionId === order.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        <span>تأیید و شروع پروژه</span>
                      </button>

                      <button
                        onClick={() => handleDecline(order.id)}
                        disabled={isPending && busyActionId === order.id}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>رد پیشنهاد</span>
                      </button>
                    </div>
                  </div>
                ) : order.myInterest?.status === "ACCEPTED" || order.status === "CONFIRMED" ? (
                  <div className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>پروژه قطعی شد و با شما هماهنگ گردید</span>
                  </div>
                ) : order.myInterest?.status === "PENDING" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 w-full p-2.5 rounded-2xl bg-jar-canvas border border-jar-border text-jar-primary text-xs font-medium">
                      <div className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate">پیشنهاد شما ثبت شده است</span>
                      </div>
                      <button
                        onClick={() => handleWithdraw(order.myInterest!.id, order.id)}
                        disabled={isPending && busyActionId === order.myInterest!.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-jar-border bg-jar-surface hover:bg-rose-50 hover:text-rose-600 text-jar-muted text-[11px] font-medium transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {isPending && busyActionId === order.myInterest!.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        <span>انصراف از پیشنهاد</span>
                      </button>
                    </div>
                  </div>
                ) : order.myInterest?.status === "DECLINED" ? (
                  <div className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-jar-canvas border border-jar-border text-jar-muted text-xs font-medium">
                    <XCircle className="h-4 w-4 text-jar-muted" />
                    <span>شما انجام این پروژه را نپذیرفتید</span>
                  </div>
                ) : order.myInterest?.status === "REJECTED" ? (
                  <div className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-jar-canvas border border-jar-border text-jar-muted text-xs font-medium">
                    <span>متخصص دیگری برای این سفارش انتخاب شد</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenInterestModal(order)}
                    className="group flex h-11 w-full items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white font-medium text-xs sm:text-sm shadow-none transition-colors cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span>اعلام آمادگی برای این پروژه</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Proposal Submission Modal */}
      <SpecialistInterestModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleInterestSuccess}
      />
    </div>
  );
}
