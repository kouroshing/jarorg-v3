"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Car,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Minus,
  Plus,
  TrendingUp,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import {
  submitProjectInterestAction,
  getSpecialistWorkAgendaAction,
  AvailableOrderSpecialistView,
} from "@/app/actions/marketplaceActions";
import { listJarLocationsForInterestSuggestAction } from "@/app/actions/locationActions";
import type { JarLocationSuggestItem } from "@/app/actions/locationActions";
import { formatDistanceKm } from "@/lib/locations/photoLocation";
import { formatPrice } from "@/components/order/BudgetSlider";
import { getBudgetStops } from "@/lib/pricing/budgetStops";
import { TIME_SLOTS, getUpcoming14Days } from "@/components/order/steps/StepDateTime";
import SpecialistWorkCalendar, {
  type CalendarDayCell,
} from "@/components/specialist/SpecialistWorkCalendar";
import type { SpecialistAgendaEvent } from "@/lib/orders/agendaShared";
import { toEnglishDigits } from "@/lib/auth/phone";
import Link from "next/link";
import Image from "next/image";

const ORDER_TRAVEL_KEY = "__order__";
const PRICE_STEP = 100_000;

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

export type ScheduleStance = "ACCEPT_CLIENT" | "PROPOSE";

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
  const [travelReason, setTravelReason] = useState("");
  /** Per-destination draft: Jar default until specialist edits that key. */
  const [travelDraftByKey, setTravelDraftByKey] = useState<Record<string, string>>({});
  const [scheduleStance, setScheduleStance] = useState<ScheduleStance>("ACCEPT_CLIENT");
  const [proposedBookingDate, setProposedBookingDate] = useState("");
  const [proposedTimeSlot, setProposedTimeSlot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [agenda, setAgenda] = useState<SpecialistAgendaEvent[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CalendarDayCell | null>(null);
  const [jarLocations, setJarLocations] = useState<JarLocationSuggestItem[]>([]);
  const [jarLocationsLoading, setJarLocationsLoading] = useState(false);
  const [proposedPhotoLocationId, setProposedPhotoLocationId] = useState<string | null>(
    null
  );
  /** Live from marketplace settings when modal opens (dashboard-editable). */
  const [liveCommissionPercent, setLiveCommissionPercent] = useState<number | null>(null);

  const upcomingDays = useMemo(() => getUpcoming14Days(), []);
  const needsJarSuggest = order?.locationContext?.kind === "SPECIALIST_ADVICE";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setMessage("");
      setProposedPrice("");
      setTravelReason("");
      setTravelDraftByKey({});
      setScheduleStance("ACCEPT_CLIENT");
      setProposedBookingDate("");
      setProposedTimeSlot("");
      setProposedPhotoLocationId(null);
      setJarLocations([]);
      setLiveCommissionPercent(null);
      setError(null);
      setSelectedCell(null);
      return;
    }
    if (!order) return;
    setProposedPrice(String(order.totalEstimatedPrice));
    // Flexible ("best timing") → must propose a concrete range; no defer.
    setScheduleStance(order.isFlexibleSchedule ? "PROPOSE" : "ACCEPT_CLIENT");
    setProposedPhotoLocationId(null);
    setTravelDraftByKey({});
    setTravelReason("");
  }, [isOpen, order]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setAgendaLoading(true);
    void getSpecialistWorkAgendaAction(28).then((res) => {
      if (cancelled) return;
      setAgendaLoading(false);
      if (res.success && res.events) setAgenda(res.events);
      else setAgenda([]);
      if (
        res.success &&
        typeof res.specialistCommissionPercent === "number" &&
        Number.isFinite(res.specialistCommissionPercent)
      ) {
        setLiveCommissionPercent(res.specialistCommissionPercent);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !order) return;
    // Load nearby جار لوکیشن whenever specialist may suggest (advice) or offer alternative.
    let cancelled = false;
    setJarLocationsLoading(true);
    void listJarLocationsForInterestSuggestAction({ orderId: order.id }).then((res) => {
      if (cancelled) return;
      setJarLocationsLoading(false);
      if (res.success) setJarLocations(res.items);
      else setJarLocations([]);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, order]);

  if (!isOpen || !order || !mounted) return null;

  const outOfTokens =
    typeof tokensRemaining === "number" && tokensRemaining < tokenCostApply;

  const travelKey = proposedPhotoLocationId || ORDER_TRAVEL_KEY;
  const selectedJarLoc = proposedPhotoLocationId
    ? jarLocations.find((l) => l.id === proposedPhotoLocationId) || null
    : null;
  const activeTravelQuote = selectedJarLoc
    ? selectedJarLoc.travel
    : order.travel
      ? {
          distanceKm: order.travel.distanceKm,
          fee: order.travel.fee,
          isFree: order.travel.isFree,
        }
      : null;
  const jarDefaultTravelFee =
    activeTravelQuote == null
      ? null
      : activeTravelQuote.isFree
        ? 0
        : activeTravelQuote.fee;

  const travelDraftRaw =
    travelDraftByKey[travelKey] ??
    (jarDefaultTravelFee != null ? String(jarDefaultTravelFee) : "");
  const travelNum = parseToman(travelDraftRaw);
  const travelEdited =
    jarDefaultTravelFee != null &&
    travelNum != null &&
    travelNum !== jarDefaultTravelFee;
  const mustExplainTravel =
    travelEdited || (jarDefaultTravelFee == null && travelNum != null);

  const jarFloor = order.totalEstimatedPrice;
  const maxBudgetHourly = getBudgetStops().at(-1)?.rate ?? jarFloor;
  const jarCeiling = Math.max(
    jarFloor,
    maxBudgetHourly * Math.max(1, order.durationHours || 1)
  );
  const priceNum = parseToman(proposedPrice);
  const feePrice = Math.min(
    jarCeiling,
    Math.max(priceNum ?? jarFloor, jarFloor)
  );
  const feeTravel =
    travelNum != null
      ? travelNum
      : jarDefaultTravelFee != null
        ? jarDefaultTravelFee
        : 0;
  const feeTotal = feePrice + feeTravel;
  const commissionPercent =
    liveCommissionPercent ?? order.specialistCommissionPercent ?? 20;
  const commissionCut = Math.round((feePrice * commissionPercent) / 100);
  const yourProfit = feePrice - commissionCut + feeTravel;

  const bumpPrice = (delta: number) => {
    const base = feePrice;
    const next = Math.min(jarCeiling, Math.max(jarFloor, base + delta));
    setProposedPrice(String(next));
    setError(null);
  };

  const setTravelDraftForActive = (rawDigits: string) => {
    setTravelDraftByKey((prev) => ({ ...prev, [travelKey]: rawDigits }));
  };

  const clientTimeLabel = order.isFlexibleSchedule
    ? "بهترین زمان با توافق متخصص"
    : `${order.bookingDate || "—"} · ${order.timeSlot || "—"}`;

  const busyOnSelected =
    selectedCell != null &&
    selectedCell.busyLevel > 0 &&
    selectedCell.events.length > 0;

  const dayIsFullyBooked = selectedCell != null && selectedCell.busyLevel >= 3;

  const handleSelectCalendarDate = (dateKeyFa: string, cell: CalendarDayCell) => {
    setSelectedCell(cell);
    if (cell.busyLevel >= 3) {
      setError(
        "این روز در تقویم کاری‌تان پر است؛ پروژهٔ قطعی دارید و نمی‌توانید بازهٔ هم‌پوشان پیشنهاد دهید."
      );
      return;
    }
    setError(null);
    setProposedBookingDate(dateKeyFa);
    setScheduleStance("PROPOSE");
  };

  const handlePickJarLocation = (locId: string) => {
    setProposedPhotoLocationId(locId);
    setError(null);
  };

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

    if (mustExplainTravel) {
      if (travelNum == null) {
        setError("مبلغ ایاب‌وذهاب را وارد کنید یا مقدار پیش‌بینی جار را نگه دارید.");
        return;
      }
      if (travelReason.trim().length < 5) {
        setError(
          jarDefaultTravelFee == null
            ? "برای مبلغ ایاب‌وذهاب یک توضیح کوتاه بنویسید."
            : "برای تغییر ایاب‌وذهاب نسبت به پیش‌بینی جار باید دلیلش را بنویسید."
        );
        return;
      }
    }

    if (scheduleStance === "PROPOSE") {
      if (!proposedBookingDate.trim() || !proposedTimeSlot.trim()) {
        setError("برای پیشنهاد زمان، تاریخ و بازه را انتخاب کنید.");
        return;
      }
      if (dayIsFullyBooked) {
        setError("روز انتخاب‌شده با پروژهٔ قطعی شما تداخل دارد.");
        return;
      }
    }

    if (needsJarSuggest && !proposedPhotoLocationId) {
      setError("کارفرما مشورت لوکیشن خواسته؛ یک جار لوکیشن از محدودهٔ خود انتخاب کنید.");
      return;
    }

    if (
      scheduleStance === "ACCEPT_CLIENT" &&
      !order.isFlexibleSchedule &&
      order.bookingDate
    ) {
      const en = toEnglishDigits(order.bookingDate);
      const clashDay = agenda.some((ev) => ev.dateKeyEn === en);
      if (clashDay) {
        // Soft warn — server still enforces exact window; allow submit attempt.
      }
    }

    const resolvedPrice = Math.min(
      jarCeiling,
      priceNum == null || priceNum <= 0 ? jarFloor : priceNum
    );
    if (resolvedPrice < jarFloor) {
      setError(
        `حداقل مبلغ مجاز ${formatPrice(jarFloor)} تومان (نرخ پایه جار) است. فقط افزایش مجاز است.`
      );
      return;
    }
    if (resolvedPrice > jarCeiling) {
      setError(
        `حداکثر مبلغ مجاز ${formatPrice(jarCeiling)} تومان است.`
      );
      return;
    }

    startTransition(async () => {
      const res = await submitProjectInterestAction({
        orderId: order.id,
        message: cleanMsg,
        proposedPrice: resolvedPrice,
        travelFeeOverride: mustExplainTravel ? travelNum ?? null : null,
        travelFeeOverrideReason: mustExplainTravel ? travelReason.trim() : null,
        scheduleStance,
        proposedBookingDate:
          scheduleStance === "PROPOSE" ? proposedBookingDate.trim() : null,
        proposedTimeSlot:
          scheduleStance === "PROPOSE" ? proposedTimeSlot.trim() : null,
        proposedPhotoLocationId,
      });

      if (!res.success) {
        setError(res.error || "خطایی در ثبت پیشنهاد رخ داد.");
      } else {
        onSuccess(order.id, res.interestId!);
        onClose();
      }
    });
  };

  const stanceOptions = order.isFlexibleSchedule
    ? [
        {
          id: "PROPOSE" as const,
          title: "بازهٔ زمانی پیشنهاد می‌کنم",
          hint: "کارفرما بهترین زمان توافقی را خواسته — تاریخ و بازه را انتخاب کنید",
        },
      ]
    : [
        {
          id: "ACCEPT_CLIENT" as const,
          title: "موافق زمان کارفرما هستم",
          hint: clientTimeLabel,
        },
        {
          id: "PROPOSE" as const,
          title: "زمان جایگزین پیشنهاد می‌کنم",
          hint: `زمان کارفرما: ${clientTimeLabel} — می‌توانید بازهٔ دیگری بدهید`,
        },
      ];

  const locationSummary =
    order.locationContext?.kind === "JAR_LOCATION" && order.locationContext.photoLocation
      ? order.locationContext.photoLocation.name
      : order.locationContext?.kind === "CUSTOM_PIN"
        ? order.locationContext.approxArea.replace(/^محدودهٔ تقریبی:\s*/, "") || "پین اختصاصی"
        : order.locationContext?.kind === "SPECIALIST_ADVICE"
          ? "مشورت عکاس"
          : order.locationContext?.kind === "JAR_STUDIO"
            ? "استودیو جار"
            : order.districtOrCity || "—";

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center p-0 sm:p-3 md:p-4 lg:p-5"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interest-modal-title"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
      />

      <div className="relative z-10 flex w-full sm:w-[min(100%,95vw)] max-w-6xl xl:max-w-7xl h-[100dvh] sm:h-[min(96dvh,920px)] flex-col overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border border-jar-border bg-jar-surface shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Title bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-jar-border px-4 sm:px-6 py-3 sm:py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-jar-canvas text-jar-logo border border-jar-border">
              <BrandLogo linked={false} className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3
                id="interest-modal-title"
                className="text-base sm:text-lg font-black text-jar-primary truncate"
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
            className="flex h-10 w-10 items-center justify-center rounded-full border border-jar-border bg-jar-canvas text-jar-muted hover:text-jar-primary"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sticky project summary */}
        <div className="shrink-0 border-b border-jar-border bg-jar-canvas/90 px-4 sm:px-6 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] sm:text-xs">
            <span className="inline-flex items-center gap-1.5 text-jar-muted font-medium min-w-0">
              <Clock className="h-3.5 w-3.5 text-jar-logo shrink-0" />
              <span className="truncate">
                <b className="text-jar-primary font-bold">زمان:</b>{" "}
                <span className="font-mono text-jar-primary">{clientTimeLabel}</span>
                <span className="text-jar-muted">
                  {" "}
                  · {order.durationHours.toLocaleString("fa-IR")}س
                </span>
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-jar-muted font-medium min-w-0">
              <MapPin className="h-3.5 w-3.5 text-jar-logo shrink-0" />
              <span className="truncate">
                <b className="text-jar-primary font-bold">محدوده:</b> {locationSummary}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-jar-muted font-medium ms-auto">
              <b className="text-jar-primary font-bold">کف قیمت:</b>{" "}
              <span className="font-mono text-jar-primary">{formatPrice(jarFloor)}</span>
            </span>
          </div>
        </div>

        <form
          id="interest-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5"
        >
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7 xl:gap-8">
            {/* Right / first on mobile: schedule + location + calendar */}
            <div className="space-y-4 order-1">
              {/* Compact client context (details only when needed) */}
              {(order.isFlexibleSchedule ||
                order.locationContext?.kind === "CUSTOM_PIN" ||
                order.locationContext?.kind === "SPECIALIST_ADVICE" ||
                order.locationContext?.kind === "JAR_STUDIO") && (
                <div className="rounded-2xl border border-jar-border bg-jar-canvas/60 px-3.5 py-2.5 text-[11px] text-jar-muted font-medium leading-relaxed">
                  {order.isFlexibleSchedule ? (
                    <p>
                      کارفرما <b className="text-jar-primary">بهترین زمان توافقی</b> خواسته — بازه
                      مشخص پیشنهاد دهید.
                    </p>
                  ) : null}
                  {order.locationContext?.kind === "CUSTOM_PIN" && (
                    <p className={order.isFlexibleSchedule ? "mt-1.5" : ""}>
                      لوکیشن <b className="text-amber-950">خارج از جار لوکیشن</b> است ·{" "}
                      {order.locationContext.approxArea}. آدرس دقیق بعد از پرداخت.
                    </p>
                  )}
                  {order.locationContext?.kind === "SPECIALIST_ADVICE" && (
                    <p className={order.isFlexibleSchedule ? "mt-1.5" : ""}>
                      کارفرما <b className="text-jar-primary">مشورت لوکیشن</b> خواسته
                      {order.locationContext.approxArea
                        ? ` (${order.locationContext.approxArea})`
                        : ""}
                      — یک جار لوکیشن پیشنهاد دهید.
                    </p>
                  )}
                  {order.locationContext?.kind === "JAR_STUDIO" && (
                    <p>
                      درخواست استودیو/عمارت همکار جار
                      {order.districtOrCity ? ` — ${order.districtOrCity}` : ""}.
                    </p>
                  )}
                </div>
              )}

              {order.locationContext?.kind === "JAR_LOCATION" &&
                order.locationContext.photoLocation && (
                  <div className="rounded-2xl border border-[#CC785C]/25 bg-[#CC785C]/5 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-[#CC785C]">جار لوکیشن کارفرما</p>
                      <p className="font-black text-jar-primary truncate">
                        {order.locationContext.photoLocation.name}
                      </p>
                    </div>
                    <Link
                      href={`/locations/${order.locationContext.photoLocation.slug}`}
                      target="_blank"
                      className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-jar-logo"
                    >
                      صفحه
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}

              {/* Jar location suggest */}
              <div className="rounded-2xl border border-jar-border bg-jar-canvas p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-jar-primary inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-jar-logo" />
                    پیشنهاد جار لوکیشن
                    {needsJarSuggest ? (
                      <span className="text-rose-500">*</span>
                    ) : (
                      <span className="text-jar-muted font-medium">(اختیاری)</span>
                    )}
                  </span>
                  {proposedPhotoLocationId && !needsJarSuggest && (
                    <button
                      type="button"
                      onClick={() => setProposedPhotoLocationId(null)}
                      className="text-[10px] font-bold text-jar-muted"
                    >
                      پاک کردن
                    </button>
                  )}
                </div>
                {jarLocationsLoading ? (
                  <div className="flex items-center gap-2 text-[11px] text-jar-muted py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    بارگذاری لوکیشن‌های محدوده…
                  </div>
                ) : jarLocations.length === 0 ? (
                  <p className="text-[11px] text-jar-muted leading-relaxed">
                    در محدودهٔ شما جار لوکیشن تاییدشده نیست.{" "}
                    <Link href="/tools/locations/new" className="font-bold text-jar-logo">
                      ثبت لوکیشن جدید
                    </Link>
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
                    {jarLocations.map((loc) => {
                      const on = proposedPhotoLocationId === loc.id;
                      const locDraft = travelDraftByKey[loc.id];
                      const locJarFee =
                        loc.travel == null
                          ? null
                          : loc.travel.isFree
                            ? 0
                            : loc.travel.fee;
                      const locShown =
                        locDraft != null ? parseToman(locDraft) : locJarFee;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handlePickJarLocation(loc.id)}
                          className={`shrink-0 w-[10.5rem] rounded-2xl border text-right overflow-hidden transition-all ${
                            on
                              ? "border-jar-primary ring-2 ring-jar-primary/30"
                              : "border-jar-border bg-white hover:border-jar-primary/40"
                          }`}
                        >
                          <div className="relative h-16 bg-jar-border/30">
                            {loc.coverImageUrl ? (
                              <Image
                                src={loc.coverImageUrl}
                                alt={loc.name}
                                fill
                                className="object-cover"
                                sizes="168px"
                                unoptimized
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-jar-muted">
                                <MapPin className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="p-2 space-y-1">
                            <p className="text-[11px] font-bold text-jar-primary truncate">
                              {loc.name}
                            </p>
                            <p className="text-[9px] text-jar-muted truncate">
                              {typeof loc.distanceKm === "number"
                                ? formatDistanceKm(loc.distanceKm)
                                : [loc.city, loc.district].filter(Boolean).join(" · ")}
                            </p>
                            <p className="text-[9px] font-bold text-jar-logo truncate">
                              ایاب‌وذهاب:{" "}
                              {locShown == null
                                ? "—"
                                : locShown === 0
                                  ? "رایگان"
                                  : `${formatPrice(locShown)} ت`}
                              {locDraft != null &&
                              locJarFee != null &&
                              locShown !== locJarFee
                                ? " (ویرایش)"
                                : ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-jar-primary">
                    زمان پیشنهادی <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-jar-muted font-medium leading-relaxed">
                    بازهٔ دقیق اعتماد کارفرما را بالا می‌برد و از تداخل با پروژه‌های قطعی شما جلوگیری
                    می‌کند.
                  </p>
                </div>
                {stanceOptions.length > 1 ? (
                  <div className="space-y-2">
                    {stanceOptions.map((opt) => (
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
                            scheduleStance === opt.id ? "text-white/80" : "text-jar-muted"
                          }`}
                        >
                          {opt.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-jar-primary/30 bg-jar-primary/[0.04] px-3.5 py-3 text-right">
                    <span className="block text-xs font-bold text-jar-primary">
                      {stanceOptions[0].title}
                    </span>
                    <span className="block text-[11px] mt-0.5 text-jar-muted">
                      {stanceOptions[0].hint}
                    </span>
                  </div>
                )}
              </div>

              <SpecialistWorkCalendar
                events={agenda}
                selectedDateFa={
                  scheduleStance === "PROPOSE" ? proposedBookingDate || null : null
                }
                onSelectDate={handleSelectCalendarDate}
                loading={agendaLoading}
                clientDateFa={
                  !order.isFlexibleSchedule ? order.bookingDate || null : null
                }
              />

              {scheduleStance === "PROPOSE" && (
                <div className="space-y-3 rounded-2xl border border-jar-border bg-jar-canvas p-3.5">
                  <p className="text-[11px] font-medium text-jar-muted leading-relaxed">
                    بازهٔ انتخابی بعد از قطعی شدن رزرو قفل می‌شود؛ پروژهٔ هم‌پوشان داده نمی‌شود.
                  </p>
                  {busyOnSelected && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] font-bold text-amber-950">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      این روز پروژهٔ قطعی دارید — فقط بازهٔ بدون تداخل پیشنهاد دهید.
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-jar-primary">
                      تاریخ پیشنهادی
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {upcomingDays.map((day) => {
                        const on = proposedBookingDate === day.dateStr;
                        const en = toEnglishDigits(day.dateStr);
                        const dayBusy = agenda.some((ev) => ev.dateKeyEn === en);
                        return (
                          <button
                            key={day.dateStr}
                            type="button"
                            onClick={() => {
                              const cellEvents = agenda.filter((ev) => ev.dateKeyEn === en);
                              const hours = cellEvents.reduce((s, e) => s + e.durationHours, 0);
                              handleSelectCalendarDate(day.dateStr, {
                                dateKeyFa: day.dateStr,
                                dateKeyEn: en,
                                weekdayShort: day.weekday,
                                dayNum: day.formattedJalali.split(" ")[0],
                                isToday: Boolean(day.relativeTag === "امروز"),
                                isPast: false,
                                busyLevel:
                                  hours <= 0 ? 0 : hours < 3 ? 1 : hours < 6 ? 2 : 3,
                                events: cellEvents,
                              });
                            }}
                            className={`shrink-0 rounded-xl px-2.5 py-2 text-center min-w-[3.5rem] border text-[10px] font-bold transition-colors ${
                              on
                                ? "bg-jar-primary text-white border-jar-primary"
                                : dayBusy
                                  ? "bg-amber-50 border-amber-200 text-amber-950"
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
                    <span className="text-[11px] font-bold text-jar-primary">بازهٔ زمانی</span>
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

            {/* Left / second: message, price, travel */}
            <div className="space-y-4 order-2">
              {order.projectDescription && (
                <details className="group rounded-2xl border border-jar-border bg-jar-canvas open:pb-0">
                  <summary className="cursor-pointer list-none px-3.5 py-2.5 text-[11px] font-bold text-jar-primary flex items-center justify-between gap-2">
                    توضیحات کارفرما
                    <span className="text-[10px] font-medium text-jar-muted group-open:hidden">
                      نمایش
                    </span>
                    <span className="text-[10px] font-medium text-jar-muted hidden group-open:inline">
                      بستن
                    </span>
                  </summary>
                  <p className="px-3.5 pb-3 text-xs text-jar-muted leading-relaxed whitespace-pre-wrap break-words font-medium border-t border-jar-border/60 pt-2.5">
                    {order.projectDescription}
                  </p>
                </details>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-jar-primary">
                    پیام معرفی <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-jar-muted font-mono">
                    {message.length} / ۱۰۰۰
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="تجهیزات، سبک کاری و انگیزهٔ کوتاه…"
                  rows={3}
                  maxLength={1000}
                  required
                  className="w-full rounded-2xl border border-jar-border bg-jar-surface p-3.5 text-xs sm:text-sm text-jar-primary placeholder:text-jar-muted/60 outline-none transition-all focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20 leading-relaxed min-h-[5.5rem]"
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-jar-border bg-jar-canvas p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <label className="text-sm font-black text-jar-primary">
                      قیمت پایه شما
                    </label>
                    <p className="text-[11px] text-jar-muted font-medium leading-relaxed">
                      کمتر از نرخ پروژه مجاز نیست؛ با دکمه‌ها فقط همان مبلغ یا بالاتر را
                      انتخاب کنید.
                    </p>
                  </div>
                  <div className="shrink-0 text-left space-y-0.5">
                    <p className="text-[10px] font-bold text-jar-muted">حداکثر مجاز</p>
                    <p className="text-xs font-black font-mono text-jar-primary">
                      {formatPrice(jarCeiling)}
                    </p>
                  </div>
                </div>

                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    aria-label="کاهش قیمت"
                    disabled={feePrice <= jarFloor}
                    onClick={() => bumpPrice(-PRICE_STEP)}
                    className="flex h-16 w-14 shrink-0 items-center justify-center rounded-2xl border border-jar-border bg-white text-jar-primary hover:border-jar-primary disabled:opacity-40 disabled:hover:border-jar-border transition-colors"
                  >
                    <Minus className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={tomanField(String(feePrice))}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9۰-۹]/g, "");
                        const enVal = val.replace(/[۰-۹]/g, (d) =>
                          String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
                        );
                        setProposedPrice(enVal);
                      }}
                      onBlur={() => {
                        const n = parseToman(proposedPrice);
                        if (n == null || n <= 0 || n < jarFloor) {
                          setProposedPrice(String(jarFloor));
                        } else if (n > jarCeiling) {
                          setProposedPrice(String(jarCeiling));
                          setError(
                            `حداکثر مبلغ مجاز ${formatPrice(jarCeiling)} تومان است.`
                          );
                        } else {
                          setProposedPrice(String(n));
                        }
                      }}
                      className="h-16 w-full rounded-2xl border-2 border-jar-border bg-white px-4 text-center text-xl sm:text-2xl font-black font-mono text-jar-primary outline-none transition-all focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20"
                    />
                    <span className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold text-jar-muted">
                      تومان
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="افزایش قیمت"
                    disabled={feePrice >= jarCeiling}
                    onClick={() => bumpPrice(PRICE_STEP)}
                    className="flex h-16 w-14 shrink-0 items-center justify-center rounded-2xl border border-jar-border bg-white text-jar-primary hover:border-jar-primary disabled:opacity-40 disabled:hover:border-jar-border transition-colors"
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-jar-muted">
                    حداقل (نرخ پروژه):{" "}
                    <b className="font-mono text-jar-primary">{formatPrice(jarFloor)}</b>
                  </span>
                  {feePrice > jarFloor ? (
                    <span className="font-bold text-amber-800">
                      +{formatPrice(feePrice - jarFloor)} بالاتر از کف
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-800">روی نرخ پروژه</span>
                  )}
                </div>

                <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-l from-emerald-50 to-white px-3.5 py-3 flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5 text-right">
                    <p className="text-[11px] font-bold text-emerald-900/80">
                      سود شما از این سفر
                    </p>
                    <p className="text-lg font-black font-mono text-emerald-950 leading-none">
                      {formatPrice(yourProfit)}{" "}
                      <span className="text-xs font-bold">تومان</span>
                    </p>
                    <p className="text-[10px] text-emerald-800/80 font-medium leading-relaxed pt-0.5">
                      بعد از کارمزد جار ({commissionPercent.toLocaleString("fa-IR")}٪ از قیمت پایه) +
                      ایاب‌وذهاب
                      {feeTravel > 0 ? ` (${formatPrice(feeTravel)})` : ""}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-jar-border bg-jar-canvas p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-jar-primary">
                    <Car className="h-4 w-4 text-jar-logo" />
                    ایاب‌وذهاب
                    {selectedJarLoc ? (
                      <span className="text-[10px] font-medium text-jar-muted">
                        · {selectedJarLoc.name}
                      </span>
                    ) : null}
                  </label>
                  {jarDefaultTravelFee != null ? (
                    <span className="text-[11px] font-mono text-jar-muted">
                      پیش‌بینی جار:{" "}
                      {jarDefaultTravelFee === 0
                        ? "رایگان"
                        : `${formatPrice(jarDefaultTravelFee)} تومان`}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-jar-muted">
                      مبدأ شما ثبت نشده — مبلغ را دستی وارد کنید
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-jar-muted leading-relaxed">
                  مبلغ پیش‌فرض را جار از فاصلهٔ مبدأ کاری‌تان تا لوکیشن انتخاب‌شده حساب می‌کند.
                  فقط در صورت نیاز ویرایش کنید؛ برای هر لوکیشن جداگانه ذخیره می‌شود.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tomanField(travelDraftRaw)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9۰-۹]/g, "");
                      const enVal = val.replace(/[۰-۹]/g, (d) =>
                        String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
                      );
                      setTravelDraftForActive(enVal);
                    }}
                    placeholder={
                      jarDefaultTravelFee != null
                        ? formatPrice(jarDefaultTravelFee)
                        : "مبلغ ایاب‌وذهاب به تومان"
                    }
                    className="w-full h-11 rounded-full border border-jar-border bg-jar-surface px-4 text-xs sm:text-sm text-jar-primary placeholder:text-jar-muted/60 outline-none transition-all focus:border-jar-logo focus:ring-2 focus:ring-jar-logo/20 font-mono"
                  />
                  <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-jar-muted pointer-events-none" />
                </div>
                {travelEdited && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-amber-800">
                      مبلغ نسبت به پیش‌بینی جار تغییر کرده — دلیل کوتاه بنویسید.
                    </p>
                    <textarea
                      value={travelReason}
                      onChange={(e) => setTravelReason(e.target.value)}
                      rows={2}
                      placeholder="مثلاً عوارض، ون تجهیزات، مسیر پرترافیک…"
                      className="w-full rounded-2xl border border-jar-border bg-jar-surface p-3 text-xs outline-none focus:border-jar-logo"
                    />
                  </div>
                )}
                {jarDefaultTravelFee == null && (
                  <textarea
                    value={travelReason}
                    onChange={(e) => setTravelReason(e.target.value)}
                    rows={2}
                    placeholder="توضیح کوتاه برای مبلغ ایاب‌وذهاب"
                    className="w-full rounded-2xl border border-jar-border bg-jar-surface p-3 text-xs outline-none focus:border-jar-logo"
                  />
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="shrink-0 border-t border-jar-border bg-jar-surface/95 backdrop-blur-sm px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 space-y-2.5">
          <div className="flex flex-wrap items-end justify-between gap-2 text-xs">
            <div className="space-y-0.5 text-right">
              <p className="text-[10px] font-bold text-jar-muted">
                جمع قابل نمایش به کارفرما
              </p>
              <p className="text-base sm:text-lg font-black font-mono text-jar-primary leading-none">
                {formatPrice(feeTotal)}{" "}
                <span className="text-[11px] font-bold">تومان</span>
              </p>
            </div>
            <div className="text-left space-y-0.5">
              <p className="text-[10px] font-bold text-emerald-800/80">سود تقریبی شما</p>
              <p className="text-sm font-black font-mono text-emerald-900 leading-none">
                {formatPrice(yourProfit)} ت
              </p>
            </div>
          </div>
          <p className="text-[10px] text-jar-muted font-medium leading-relaxed flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-jar-logo shrink-0 mt-0.5" />
            <span>
              ارسال {tokenCostApply.toLocaleString("fa-IR")} توکن کم می‌کند
              {typeof tokensRemaining === "number"
                ? ` · موجودی ${tokensRemaining.toLocaleString("fa-IR")}`
                : ""}
              . تماس بعد از انتخاب و پرداخت آزاد می‌شود.
            </span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-12 rounded-full border border-jar-border bg-jar-surface hover:bg-jar-soft text-jar-primary text-xs font-bold transition-colors disabled:opacity-50"
            >
              بستن
            </button>
            <button
              type="submit"
              form="interest-form"
              disabled={isPending || message.trim().length < 5 || outOfTokens}
              className="flex-[2] flex h-12 items-center justify-center gap-2 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white font-bold text-sm shadow-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
