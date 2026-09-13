"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Users,
  CheckCircle2,
  Sparkles,
  User,
  MapPin,
  Loader2,
  Check,
  AlertCircle,
  Radio,
  CreditCard,
  ExternalLink,
  Handshake,
  Calendar,
  Film,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import {
  ApplicantSpecialistView,
  selectSpecialistForOrderAction,
} from "@/app/actions/marketplaceActions";
import { formatPrice } from "./BudgetSlider";
import { parseOrderStatus } from "@/lib/orders/status";
import SpecialistPublicStatsRow from "@/components/specialist/SpecialistPublicStatsRow";

interface OrderApplicantsListProps {
  orderId: string;
  orderStatus: string;
  initialApplicants: ApplicantSpecialistView[];
  isOwnerOrAdmin: boolean;
  selectedSpecialistId?: string | null;
  /** Frozen total after selection; preferred over the live proposal total. */
  agreedTotalPrice?: number | null;
  categoryTitle?: string | null;
  categorySlug?: string | null;
}

export default function OrderApplicantsList({
  orderId,
  orderStatus,
  initialApplicants,
  isOwnerOrAdmin,
  selectedSpecialistId: initialSelectedSpecialistId,
  agreedTotalPrice: initialAgreedTotalPrice,
  categoryTitle,
  categorySlug,
}: OrderApplicantsListProps) {
  const router = useRouter();
  const [applicants, setApplicants] = useState<ApplicantSpecialistView[]>(initialApplicants);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null | undefined>(
    initialSelectedSpecialistId
  );
  const [currentStatus, setCurrentStatus] = useState<string>(orderStatus);
  const [agreedTotalPrice, setAgreedTotalPrice] = useState<number | null>(
    initialAgreedTotalPrice ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingInterestId, setConfirmingInterestId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setApplicants(initialApplicants);
  }, [initialApplicants]);

  useEffect(() => {
    setCurrentStatus(orderStatus);
    setSelectedSpecialistId(initialSelectedSpecialistId);
    setAgreedTotalPrice(initialAgreedTotalPrice ?? null);
  }, [orderStatus, initialSelectedSpecialistId, initialAgreedTotalPrice]);

  if (!isOwnerOrAdmin) {
    return null;
  }

  const handleSelectSpecialist = (interestId: string) => {
    setActionError(null);

    startTransition(async () => {
      const res = await selectSpecialistForOrderAction(orderId, interestId);

      if (!res.success) {
        setActionError(res.error || "خطایی در انتخاب متخصص رخ داد.");
        setConfirmingInterestId(null);
      } else {
        setSelectedSpecialistId(res.selectedSpecialistId);
        setCurrentStatus("AWAITING_PAYMENT");
        if (typeof res.agreedTotalPrice === "number") {
          setAgreedTotalPrice(res.agreedTotalPrice);
        }
        setConfirmingInterestId(null);
        setApplicants((prev) =>
          prev.map((app) => ({
            ...app,
            status: app.id === interestId ? "SELECTED" : app.status,
          }))
        );
        router.refresh();
      }
    });
  };

  const parsedStatus = parseOrderStatus(currentStatus);
  const isAwaitingPayment = parsedStatus === "AWAITING_PAYMENT";
  const isAwaitingConfirmation = parsedStatus === "AWAITING_SPECIALIST_CONFIRMATION";
  const isFinalMatched = parsedStatus === "CONFIRMED";

  const selectedApplicant = applicants.find(
    (app) =>
      app.specialistId === selectedSpecialistId ||
      app.status === "SELECTED" ||
      app.status === "ACCEPTED"
  );

  const payableAmount =
    agreedTotalPrice && agreedTotalPrice > 0
      ? agreedTotalPrice
      : selectedApplicant?.totalPrice && selectedApplicant.totalPrice > 0
        ? selectedApplicant.totalPrice
        : null;

  const domainLabel = categoryTitle?.trim() || "این پروژه";

  return (
    <div className="space-y-5 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#CC785C]" />
            <h3 className="text-lg sm:text-xl font-black text-[#141413]">
              متخصصان متقاضی
            </h3>
          </div>
          <p className="text-xs text-[#66605B] font-medium leading-relaxed max-w-lg">
            {isFinalMatched
              ? "متخصص نهایی تأیید شد و پروژه قطعی است"
              : isAwaitingPayment
                ? "متخصص انتخاب شد. پروژه بعد از پرداخت شما قطعی می‌شود"
                : isAwaitingConfirmation
                  ? "متخصص انتخاب شده و در انتظار تأیید نهایی ایشان است"
                  : `نمونه‌کارها فقط از حوزه «${domainLabel}» است تا راحت‌تر مقایسه کنید.`}
          </p>
        </div>

        {isFinalMatched ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black self-start sm:self-auto">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            پروژه نهایی و قطعی
          </span>
        ) : isAwaitingPayment ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black self-start sm:self-auto">
            در انتظار پرداخت
          </span>
        ) : isAwaitingConfirmation ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CC785C]/10 border border-[#CC785C]/20 text-[#CC785C] text-xs font-black self-start sm:self-auto">
            در انتظار تأیید متخصص
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E5E0D8] text-[#66605B] text-xs font-black self-start sm:self-auto">
            {applicants.length.toLocaleString("fa-IR")} پیشنهاد
          </span>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs font-bold text-rose-700 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {(isAwaitingPayment || isAwaitingConfirmation) && selectedApplicant && (
        <div className="rounded-3xl border-2 border-[#141413] bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg font-black text-[#141413]">
                  {selectedApplicant.specialist.displayName}
                </h4>
                {selectedApplicant.specialist.isMobileGrapher && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#CC785C]/10 text-[#CC785C] text-[10px] font-bold border border-[#CC785C]/25">
                    <Smartphone className="h-3 w-3" />
                    موبایل‌گرافر
                  </span>
                )}
              </div>
              <p className="text-xs text-[#66605B] font-medium flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {selectedApplicant.specialist.city}
                {selectedApplicant.specialist.hasStudio ? " · استودیو" : ""}
              </p>
              <SpecialistPublicStatsRow
                className="mt-2"
                completedProjects={selectedApplicant.specialist.completedProjects}
                approvedPortfolio={selectedApplicant.specialist.approvedPortfolio}
              />
            </div>
            <span className="px-3 py-1 rounded-xl bg-[#141413] text-white text-[11px] font-bold shrink-0">
              {isAwaitingPayment ? "منتخب · پرداخت" : "منتخب · تایید متخصص"}
            </span>
          </div>

          {isAwaitingPayment && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <div className="space-y-1">
                <p className="text-xs font-black text-amber-950">پرداخت برای قطعی شدن پروژه</p>
                {payableAmount != null && (
                  <p className="text-base font-black text-[#141413] font-mono">
                    {formatPrice(payableAmount)} تومان
                  </p>
                )}
              </div>
              <a
                href={`/api/order/pay?orderId=${encodeURIComponent(orderId)}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#141413] px-5 text-sm font-bold text-white hover:bg-[#282725] shrink-0"
              >
                <CreditCard className="h-4 w-4" />
                {payableAmount != null
                  ? `پرداخت ${formatPrice(payableAmount)} تومان`
                  : "پرداخت و قطعی کردن"}
              </a>
            </div>
          )}
        </div>
      )}

      {isFinalMatched && selectedApplicant && (
        <div className="rounded-3xl border-2 border-emerald-400 bg-emerald-50/50 p-5 sm:p-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg font-black text-[#1F1E1D]">
                  {selectedApplicant.specialist.displayName}
                </h4>
                {selectedApplicant.specialist.isMobileGrapher && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#CC785C]/10 text-[#CC785C] text-[10px] font-bold border border-[#CC785C]/25">
                    <Smartphone className="h-3 w-3" />
                    موبایل‌گرافر
                  </span>
                )}
              </div>
              <p className="text-xs text-[#66605B] font-medium flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                {selectedApplicant.specialist.city}
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-black">
              انتخاب‌شده
            </span>
          </div>
          {selectedApplicant.message && (
            <p className="text-sm text-[#1F1E1D] leading-relaxed font-medium">
              «{selectedApplicant.message}»
            </p>
          )}
        </div>
      )}

      {!isFinalMatched && !isAwaitingConfirmation && !isAwaitingPayment && applicants.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[#E5E0D8] bg-[#FAF9F5] p-10 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CC785C]/10 text-[#CC785C]">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <h4 className="text-sm font-black text-[#141413]">پروژه شما در فید متخصصان منتشر شد</h4>
          <p className="text-xs text-[#66605B] font-medium max-w-md mx-auto leading-relaxed">
            به محض ثبت اولین پیشنهاد، کارت بزرگ متخصص اینجا می‌آید.
          </p>
        </div>
      )}

      {!isFinalMatched && applicants.length > 0 && (
        <div className="space-y-5">
          {applicants.map((applicant) => {
            const isConfirming = confirmingInterestId === applicant.id;
            const isThisSelected =
              applicant.specialistId === selectedSpecialistId ||
              applicant.status === "SELECTED";
            const isDeclined = applicant.status === "DECLINED";
            const items = applicant.specialist.portfolioItems;

            return (
              <article
                key={applicant.id}
                className={`overflow-hidden rounded-3xl border bg-white transition-shadow ${
                  isThisSelected
                    ? "border-[#141413] shadow-md ring-1 ring-[#141413]/10"
                    : isDeclined
                      ? "border-[#E5E0D8] opacity-70"
                      : "border-[#E5E0D8] hover:border-[#141413]/35 hover:shadow-sm"
                }`}
              >
                {/* Portfolio plane — full bleed, not nested inside another box */}
                {items.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E5E0D8]">
                    {items.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPreviewUrl(item.fileUrl)}
                        className="relative aspect-[4/5] sm:aspect-square bg-[#FAF9F5] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#141413]"
                      >
                        {item.mediaType === "VIDEO" ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.fileUrl}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white">
                              <Film className="h-4 w-4" />
                            </span>
                          </div>
                        ) : (
                          <Image
                            src={item.fileUrl}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 50vw, 25vw"
                            className="object-cover"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex aspect-[2/1] sm:aspect-[3/1] items-center justify-center gap-2 bg-[#FAF9F5] text-[#A8A29A]">
                    <User className="h-8 w-8" />
                    <span className="text-xs font-bold">
                      نمونه‌کار تاییدشده در «{domainLabel}» ندارد
                    </span>
                  </div>
                )}

                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-start gap-3">
                        {applicant.specialist.avatarUrl ? (
                          <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl border border-[#E5E0D8] bg-[#FAF9F5]">
                            <Image
                              src={applicant.specialist.avatarUrl}
                              alt=""
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base sm:text-lg font-black text-[#141413]">
                          {applicant.specialist.displayName}
                        </h4>
                        {applicant.specialist.isBlueTick && (
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
                            تایید شده
                          </span>
                        )}
                        {applicant.specialist.isMobileGrapher && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#CC785C]/10 text-[#CC785C] text-[10px] font-bold border border-[#CC785C]/25">
                            <Smartphone className="h-3 w-3" />
                            موبایل‌گرافر
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#66605B] font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {applicant.specialist.city}
                        </span>
                        {applicant.specialist.hasStudio ? <span>استودیو</span> : null}
                      </p>
                      <SpecialistPublicStatsRow
                        completedProjects={applicant.specialist.completedProjects}
                        approvedPortfolio={applicant.specialist.approvedPortfolio}
                      />
                      {items.length > 0 && (
                        <p className="text-[11px] font-bold text-[#A8A29A]">
                          {items.length.toLocaleString("fa-IR")} نمونه‌کار مرتبط با {domainLabel}
                        </p>
                      )}
                        </div>
                      </div>
                    </div>

                    {applicant.totalPrice > 0 && (
                      <div className="text-left shrink-0 rounded-2xl bg-[#FAF9F5] px-3.5 py-2.5 border border-[#E5E0D8]">
                        <span className="block text-[10px] font-bold text-[#A8A29A]">پیشنهاد</span>
                        <span className="text-base sm:text-lg font-black font-mono text-[#141413] leading-none">
                          {formatPrice(applicant.totalPrice)}
                        </span>
                        <span className="block text-[10px] text-[#66605B] mt-0.5">تومان</span>
                      </div>
                    )}
                  </div>

                  {applicant.message && (
                    <p className="text-sm text-[#141413]/85 leading-relaxed">
                      «{applicant.message}»
                    </p>
                  )}

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E0D8] bg-[#FAF9F5] px-3 py-1.5 text-[11px] font-bold text-[#66605B]">
                    <Calendar className="h-3.5 w-3.5 text-[#CC785C] shrink-0" />
                    <span>
                      {applicant.scheduleStance === "PROPOSE" &&
                      applicant.proposedBookingDate &&
                      applicant.proposedTimeSlot
                        ? `پیشنهاد زمان: ${applicant.proposedBookingDate} · ${applicant.proposedTimeSlot}`
                        : applicant.scheduleStance === "DEFER"
                          ? "هماهنگی زمان بعد از پرداخت"
                          : "موافق زمان شما"}
                    </span>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <Link
                      href={
                        categorySlug
                          ? `/s/${applicant.specialistId}?category=${encodeURIComponent(categorySlug)}`
                          : `/s/${applicant.specialistId}`
                      }
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#E5E0D8] px-4 text-xs font-bold text-[#66605B] hover:border-[#141413] hover:text-[#141413]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      مشاهده پروفایل کامل
                    </Link>

                    {isThisSelected && isAwaitingPayment ? (
                      <a
                        href={`/api/order/pay?orderId=${encodeURIComponent(orderId)}`}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#141413] px-5 text-sm font-bold text-white"
                      >
                        <CreditCard className="h-4 w-4" />
                        پرداخت و قطعی کردن
                      </a>
                    ) : isThisSelected ? (
                      <span className="text-xs font-bold text-[#CC785C] flex items-center gap-1.5 justify-center sm:justify-start">
                        <Sparkles className="h-4 w-4" />
                        منتخب شما
                      </span>
                    ) : isDeclined ? (
                      <span className="text-xs text-[#A8A29A] text-center sm:text-right">
                        انصراف متخصص
                      </span>
                    ) : isAwaitingConfirmation || isAwaitingPayment ? (
                      <span className="text-xs text-[#A8A29A] text-center sm:text-right">
                        متخصص دیگری انتخاب شده
                      </span>
                    ) : isConfirming ? (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleSelectSpecialist(applicant.id)}
                          disabled={isPending}
                          className="flex-1 sm:flex-none h-12 px-5 rounded-2xl bg-[#141413] text-white text-sm font-bold inline-flex items-center justify-center gap-2"
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          تایید و پرداخت
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingInterestId(null)}
                          className="h-12 px-4 rounded-2xl border border-[#E5E0D8] text-xs font-bold"
                        >
                          انصراف
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingInterestId(applicant.id)}
                        disabled={isPending}
                        className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-[#141413] hover:bg-[#282725] px-6 text-sm font-bold text-white"
                      >
                        <Handshake className="h-4 w-4" />
                        شروع همکاری
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="max-h-[88vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
