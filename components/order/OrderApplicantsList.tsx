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
  Camera,
  Loader2,
  Check,
  AlertCircle,
  Radio,
  CreditCard,
} from "lucide-react";
import {
  ApplicantSpecialistView,
  selectSpecialistForOrderAction,
} from "@/app/actions/marketplaceActions";
import { formatPrice } from "./BudgetSlider";
import { parseOrderStatus } from "@/lib/orders/status";

interface OrderApplicantsListProps {
  orderId: string;
  orderStatus: string;
  initialApplicants: ApplicantSpecialistView[];
  isOwnerOrAdmin: boolean;
  selectedSpecialistId?: string | null;
  /** Frozen total after selection; preferred over the live proposal total. */
  agreedTotalPrice?: number | null;
}

export default function OrderApplicantsList({
  orderId,
  orderStatus,
  initialApplicants,
  isOwnerOrAdmin,
  selectedSpecialistId: initialSelectedSpecialistId,
  agreedTotalPrice: initialAgreedTotalPrice,
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

  // Selected applicant if in confirmation or matched
  const selectedApplicant = applicants.find(
    (app) => app.specialistId === selectedSpecialistId || app.status === "SELECTED" || app.status === "ACCEPTED"
  );

  const payableAmount =
    agreedTotalPrice && agreedTotalPrice > 0
      ? agreedTotalPrice
      : selectedApplicant?.totalPrice && selectedApplicant.totalPrice > 0
        ? selectedApplicant.totalPrice
        : null;

  return (
    <div className="rounded-[28px] border border-[#E5E0D8] bg-white p-5 sm:p-7 shadow-xs space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E0D8] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#CC785C]/10 text-[#CC785C]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#141413]">
              متخصصان متقاضی این پروژه
            </h3>
            <p className="text-xs text-[#66605B] font-medium">
              {isFinalMatched
                ? "متخصص نهایی تأیید شد و پروژه قطعی است"
                : isAwaitingPayment
                ? "متخصص انتخاب شد. پروژه بعد از پرداخت شما قطعی می‌شود"
                : isAwaitingConfirmation
                ? "متخصص انتخاب شده و در انتظار تأیید نهایی ایشان است"
                : `${applicants.length} متخصص برای همکاری در این آفیش اعلام آمادگی کرده‌اند`}
            </p>
          </div>
        </div>

        {isFinalMatched ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black self-start sm:self-auto">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>پروژه نهایی و قطعی</span>
          </span>
        ) : isAwaitingPayment ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>در انتظار پرداخت</span>
          </span>
        ) : isAwaitingConfirmation ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CC785C]/10 border border-[#CC785C]/20 text-[#CC785C] text-xs font-black self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC785C] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#CC785C]" />
            </span>
            <span>در انتظار تأیید متخصص</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E5E0D8] text-[#66605B] text-xs font-black self-start sm:self-auto">
            <span>در حال دریافت پیشنهادات</span>
          </span>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs font-bold text-rose-700 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* When AWAITING_SPECIALIST_CONFIRMATION: Show Pending Specialist Banner */}
      {(isAwaitingPayment || isAwaitingConfirmation) && selectedApplicant && (
        <div className="rounded-2xl border-2 border-[#141413] bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141413] text-white font-black text-base shadow-none">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-base font-black text-[#141413]">
                    {selectedApplicant.specialist.displayName}
                  </h4>
                  {selectedApplicant.specialist.isBlueTick && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                      تایید شده
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#66605B] font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-[#66605B]" />
                  <span>{selectedApplicant.specialist.city}</span>
                  {selectedApplicant.specialist.hasStudio && <span> • دارای استودیو</span>}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-xl bg-[#141413] text-white text-xs font-medium">
              {isAwaitingPayment ? "منتخب شما (در انتظار پرداخت)" : "منتخب شما (در انتظار تأیید متخصص)"}
            </span>
          </div>

          <p className="text-xs text-[#141413] leading-relaxed font-medium bg-[#FAF9F5] p-3 rounded-xl border border-[#E5E0D8]">
            {isAwaitingPayment
              ? "این متخصص را انتخاب کردید. با پرداخت هزینه، پروژه قطعی می‌شود و هماهنگی شروع می‌گردد."
              : "شما این متخصص را انتخاب کرده‌اید. به محض اینکه متخصص شرایط آفیش را بازبینی و تأیید نهایی کند، سفارش قطعی می‌شود."}
          </p>

          {isAwaitingPayment && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <div className="space-y-1">
                <p className="text-xs font-black text-amber-950">پرداخت برای قطعی شدن پروژه</p>
                <p className="text-[11px] text-amber-900/80 font-medium leading-relaxed">
                  مبلغ توافق‌شده نزد جار امانت می‌ماند تا پروژه انجام شود.
                </p>
                {payableAmount != null && (
                  <p className="text-sm font-black text-[#141413] font-mono pt-0.5">
                    {formatPrice(payableAmount)} تومان
                  </p>
                )}
              </div>
              <a
                href={`/api/order/pay?orderId=${encodeURIComponent(orderId)}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#141413] px-5 text-xs font-medium text-white transition-colors hover:bg-[#282725] shadow-none shrink-0"
              >
                <CreditCard className="h-4 w-4" />
                <span>
                  {payableAmount != null
                    ? `پرداخت ${formatPrice(payableAmount)} تومان`
                    : "پرداخت و قطعی کردن پروژه"}
                </span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* When CONFIRMED / MATCHED: Show Confirmed Card Highlight */}
      {isFinalMatched && selectedApplicant && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/50 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-base shadow-sm">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-base font-black text-[#1F1E1D]">
                    {selectedApplicant.specialist.displayName}
                  </h4>
                  {selectedApplicant.specialist.isBlueTick && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                      تایید شده
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#66605B] font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-emerald-600" />
                  <span>{selectedApplicant.specialist.city}</span>
                  {selectedApplicant.specialist.hasStudio && <span> • دارای استودیو</span>}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black">
              انتخاب شده برای آفیش
            </span>
          </div>

          {selectedApplicant.message && (
            <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs text-[#1F1E1D] leading-relaxed font-medium">
              «{selectedApplicant.message}»
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/80">
            <span className="text-emerald-900 font-bold">وضعیت هماهنگی:</span>
            <span className="font-bold text-emerald-800">
              تیم پشتیبانی جار جهت هماهنگی نهایی ساعت و لوکیشن دقیق با شما و متخصص در تماس خواهد بود.
            </span>
          </div>
        </div>
      )}

      {/* If No Applicants Yet */}
      {!isFinalMatched && !isAwaitingConfirmation && !isAwaitingPayment && applicants.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#E5E0D8] bg-[#FAF9F5] p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CC785C]/10 text-[#CC785C]">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-[#141413]">پروژه شما در فید متخصصان منتشر شد</h4>
            <p className="text-xs text-[#66605B] font-medium max-w-md mx-auto leading-relaxed">
              متخصصان واجد شرایط در حال حاضر می‌توانند پروژه را مشاهده کنند. به محض ثبت اولین پیشنهاد، کارت متخصص در این بخش قرار می‌گیرد.
            </p>
          </div>
        </div>
      )}

      {/* Applicants Grid (When Still Choosing or Awaiting Confirmation) */}
      {!isFinalMatched && applicants.length > 0 && (
        <div className="space-y-4">
          {applicants.map((applicant) => {
            const isConfirming = confirmingInterestId === applicant.id;
            const isThisSelected = applicant.specialistId === selectedSpecialistId || applicant.status === "SELECTED";
            const isDeclined = applicant.status === "DECLINED";

            return (
              <div
                key={applicant.id}
                className={`rounded-2xl border p-5 transition-all shadow-2xs space-y-4 ${
                  isThisSelected
                    ? "border-2 border-[#141413] bg-white"
                    : isDeclined
                    ? "border-[#E5E0D8] bg-[#FAF9F5]/40 opacity-75"
                    : "border-[#E5E0D8] bg-white hover:border-[#141413]/40 hover:bg-[#FAF9F5]/50"
                }`}
              >
                {/* Specialist Profile Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#141413]/5 text-[#141413] font-black text-sm">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm sm:text-base font-black text-[#141413]">
                          {applicant.specialist.displayName}
                        </h4>
                        {applicant.specialist.isBlueTick && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                            تایید شده
                          </span>
                        )}
                        {isThisSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-[#CC785C]/10 border border-[#CC785C]/20 text-[#CC785C] text-[10px] font-black">
                            انتخاب شده
                          </span>
                        )}
                        {isDeclined && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold">
                            عدم پذیرش توسط متخصص
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#66605B] font-medium mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#66605B]" />
                          {applicant.specialist.city}
                        </span>
                        {applicant.specialist.hasStudio && <span>• دارای استودیو</span>}
                        {applicant.specialist.equipment && (
                          <span className="truncate max-w-[200px]">• {applicant.specialist.equipment}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Proposal */}
                  <div className="text-right sm:text-left">
                    <span className="block text-[10px] text-[#A8A29A] font-medium">مبلغ پیشنهادی عکاس:</span>
                    <span className="text-sm font-black text-[#141413] font-mono">
                      {applicant.proposedPrice
                        ? `${formatPrice(applicant.proposedPrice)} تومان`
                        : "مطابق برآورد پایه سفارش"}
                    </span>
                  </div>
                </div>

                {/* Specialist Message */}
                {applicant.message && (
                  <div className="rounded-xl bg-white border border-[#E5E0D8] p-3.5 text-xs text-[#141413] leading-relaxed font-medium">
                    «{applicant.message}»
                  </div>
                )}

                {/* Specialist Portfolio Preview in this category */}
                {applicant.specialist.portfolioItems.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#66605B] flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5 text-[#66605B]" />
                      <span>نمونه‌کارهای متخصص در این شاخه:</span>
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {applicant.specialist.portfolioItems.map((item) => (
                        <div
                          key={item.id}
                          className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border border-[#E5E0D8] shrink-0 shadow-2xs"
                        >
                          <Image src={item.fileUrl} alt={item.title || "نمونه کار"} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selection Action Button */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E0D8]">
                  {isThisSelected && isAwaitingPayment ? (
                    <a
                      href={`/api/order/pay?orderId=${encodeURIComponent(orderId)}`}
                      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#141413] px-5 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-[#282725] shadow-none"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>
                        {payableAmount != null
                          ? `پرداخت ${formatPrice(payableAmount)} تومان`
                          : "پرداخت و قطعی کردن پروژه"}
                      </span>
                    </a>
                  ) : isThisSelected ? (
                    <div className="text-xs font-bold text-[#CC785C] flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#CC785C]" />
                      <span>منتظر پرداخت شما برای قطعی شدن پروژه...</span>
                    </div>
                  ) : isDeclined ? (
                    <span className="text-xs text-[#A8A29A] font-medium">
                      متخصص امکان پذیرش این پروژه را نداشت
                    </span>
                  ) : isAwaitingConfirmation || isAwaitingPayment ? (
                    <span className="text-xs text-[#A8A29A] font-medium">
                      متخصص دیگری انتخاب شده است
                    </span>
                  ) : isConfirming ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-xs font-bold text-[#141413]">
                        با تأیید، مرحله بعد پرداخت هزینه توافق‌شده است.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectSpecialist(applicant.id)}
                          disabled={isPending}
                          className="h-9 px-4 rounded-full bg-[#141413] hover:bg-[#282725] text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-none"
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          <span>بله، انتخاب و رفتن به پرداخت</span>
                        </button>
                        <button
                          onClick={() => setConfirmingInterestId(null)}
                          disabled={isPending}
                          className="h-9 px-3 rounded-full bg-white hover:bg-[#F3F1EC] text-[#141413] border border-[#E5E0D8] font-medium text-xs transition-colors cursor-pointer"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingInterestId(applicant.id)}
                      disabled={isPending}
                      className="h-10 px-5 rounded-full bg-[#141413] hover:bg-[#282725] text-white font-medium text-xs sm:text-sm transition-colors shadow-none cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>انتخاب این متخصص برای پروژه</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
