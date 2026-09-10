"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Maximize2,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";
import {
  approvePortfolioAction,
  approveSpecialistAction,
  rejectPortfolioAction,
  rejectSpecialistAction,
  setSpecialistKycStatusAction,
} from "@/app/actions/adminActionHandlers";
import type { SpecialistReviewCard } from "@/lib/specialists/review";
import Image from "next/image";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  PENDING_REVIEW: {
    text: "در انتظار بررسی",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  ACTIVE: {
    text: "تاییدشده و فعال",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  INCOMPLETE: {
    text: "ناقص / بازگردانده‌شده",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  SUSPENDED: {
    text: "تعلیق‌شده",
    className: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

function localPhone(phone: string): string {
  if (phone.startsWith("98") && phone.length === 12) return `0${phone.slice(2)}`;
  return phone;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso)
    );
  } catch {
    return "—";
  }
}

export default function SpecialistReviewBoard({
  cards,
  filter,
}: {
  cards: SpecialistReviewCard[];
  filter: "pending" | "all";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(cards[0]?.profileId ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rejecting, setRejecting] = useState<SpecialistReviewCard | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => cards.filter((c) => c.status === "PENDING_REVIEW").length,
    [cards]
  );

  const refresh = () => startTransition(() => router.refresh());

  const announce = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 6000);
  };

  const handleApprove = async (card: SpecialistReviewCard, approveAllPending: boolean) => {
    setBusy(card.profileId);
    try {
      const res = await approveSpecialistAction({
        specialistId: card.profileId,
        approveAllPending,
      });
      if (res.success) {
        announce("success", res.message || "متخصص تایید شد.");
        refresh();
      } else {
        announce("error", res.error);
      }
    } catch (err: any) {
      announce("error", err?.message || "خطای غیرمنتظره در سرور.");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      announce("error", "نوشتن دلیل بازگرداندن پرونده الزامی است.");
      return;
    }
    setBusy(rejecting.profileId);
    try {
      const res = await rejectSpecialistAction({
        specialistId: rejecting.profileId,
        reason: rejectReason.trim(),
      });
      if (res.success) {
        announce("success", res.message || "پرونده بازگردانده شد.");
        setRejecting(null);
        setRejectReason("");
        refresh();
      } else {
        announce("error", res.error);
      }
    } catch (err: any) {
      announce("error", err?.message || "خطای غیرمنتظره در سرور.");
    } finally {
      setBusy(null);
    }
  };

  const handleItemDecision = async (
    card: SpecialistReviewCard,
    itemId: string,
    decision: "APPROVE" | "REJECT"
  ) => {
    setBusy(itemId);
    try {
      if (decision === "APPROVE") {
        await approvePortfolioAction([itemId]);
        announce("success", "نمونه‌کار تایید شد.");
      } else {
        const reason = window.prompt("علت رد این نمونه‌کار چیست؟");
        if (!reason || !reason.trim()) return;
        const res = await rejectPortfolioAction({ portfolioItemId: itemId, reason: reason.trim() });
        if (!res.success) {
          announce("error", res.error);
          return;
        }
        announce("success", "نمونه‌کار رد شد و به متخصص اطلاع داده شد.");
      }
      refresh();
    } catch (err: any) {
      announce("error", err?.message || "خطای غیرمنتظره در سرور.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full max-w-full space-y-5 px-3 sm:px-6 lg:px-8 py-5 pb-16 text-right font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 flex flex-wrap items-center gap-2">
            <span>بررسی پرونده متخصصان</span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                {pendingCount.toLocaleString("fa-IR")} پرونده در صف
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            متخصص تا زمانی که اینجا تایید نشود به کارتابل پروژه‌ها دسترسی ندارد.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/review"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filter === "pending"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            در صف بررسی
          </Link>
          <Link
            href="/admin/review?status=all"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            همه متخصصان
          </Link>
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            داشبورد
          </Link>
        </div>
      </div>

      {toast && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.text}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">صف بررسی خالی است</p>
          <p className="text-xs text-slate-500 mt-1">
            هیچ پرونده‌ای در انتظار تایید نیست.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => {
            const isOpen = expanded === card.profileId;
            const status = STATUS_LABEL[card.status] || STATUS_LABEL.INCOMPLETE;
            const isBusy = busy === card.profileId || isPending;
            const missing = [
              !card.eligibility.hasDisplayName && "نام",
              !card.eligibility.hasAvatar && "عکس پروفایل",
              !card.eligibility.hasCategories && "دسته‌بندی",
              card.eligibility.submittableCategories.length === 0 && "۱۰ نمونه‌کار در یک شاخه",
              !card.eligibility.hasCity && "شهر",
              !card.eligibility.hasBaseLocation && "مبدأ روی نقشه",
              !card.eligibility.hasAgreedToTerms && "تعهدنامه",
            ].filter(Boolean) as string[];

            const activationBlocked = [
              card.eligibility.submittableCategories.length === 0,
              !card.eligibility.hasCity,
              !card.eligibility.hasBaseLocation,
              !card.eligibility.hasAgreedToTerms,
            ].some(Boolean);

            return (
              <div
                key={card.profileId}
                className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
              >
                {/* Summary row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : card.profileId)}
                    className="flex-1 min-w-0 flex items-start gap-3 text-right cursor-pointer"
                  >
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-slate-200 bg-indigo-50 shrink-0">
                      {card.avatarUrl ? (
                        <Image src={card.avatarUrl} alt="" fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                          <UserCheck className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{card.displayName}</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.className}`}
                        >
                          {status.text}
                        </span>
                        {card.kycStatus && card.kycStatus !== "NONE" && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              card.kycStatus === "VERIFIED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : card.kycStatus === "PENDING"
                                  ? "bg-sky-50 text-sky-800 border-sky-200"
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            KYC:{" "}
                            {card.kycStatus === "VERIFIED"
                              ? "تایید"
                              : card.kycStatus === "PENDING"
                                ? "در انتظار"
                                : "رد"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {localPhone(card.phone)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {card.city || "بدون شهر"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ارسال: {formatDate(card.submittedForReviewAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {card.counts.total} فایل
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          {card.counts.approved} تاییدشده
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                          {card.counts.pending} در انتظار
                        </span>
                        {card.counts.rejected > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold">
                            {card.counts.rejected} رد شده
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Decision buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {card.status !== "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => handleApprove(card, true)}
                        disabled={isBusy || activationBlocked}
                        title={
                          activationBlocked
                            ? `پرونده ناقص است: ${missing.join("، ")}`
                            : "تمام آثار در انتظار را تایید و متخصص را فعال کن"
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        تایید همه و فعال‌سازی
                      </button>
                    )}

                    {card.status !== "ACTIVE" && card.canActivate && (
                      <button
                        type="button"
                        onClick={() => handleApprove(card, false)}
                        disabled={isBusy}
                        title="فقط پروفایل را فعال کن؛ آثار در انتظار دست‌نخورده می‌مانند"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        فقط فعال‌سازی
                      </button>
                    )}

                    {card.kycStatus === "PENDING" && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setBusy(card.profileId);
                            setSpecialistKycStatusAction({
                              specialistId: card.profileId,
                              status: "VERIFIED",
                            })
                              .then((res) => {
                                if (res.success) announce("success", res.message || "KYC تایید شد");
                                else announce("error", res.error);
                                refresh();
                              })
                              .finally(() => setBusy(null));
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          تایید KYC
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            const reason = window.prompt("علت رد احراز هویت؟") || "";
                            if (!reason.trim()) return;
                            setBusy(card.profileId);
                            setSpecialistKycStatusAction({
                              specialistId: card.profileId,
                              status: "FAILED",
                              reason,
                            })
                              .then((res) => {
                                if (res.success) announce("success", res.message || "KYC رد شد");
                                else announce("error", res.error);
                                refresh();
                              })
                              .finally(() => setBusy(null));
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 disabled:opacity-40"
                        >
                          رد KYC
                        </button>
                      </>
                    )}

                    {card.status !== "INCOMPLETE" && (
                      <button
                        type="button"
                        onClick={() => {
                          setRejecting(card);
                          setRejectReason("");
                        }}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        بازگرداندن پرونده
                      </button>
                    )}
                  </div>
                </div>

                {(card.kycNationalIdMask || card.kycShabaMask) && (
                  <div className="mx-4 sm:mx-5 mb-3 p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-[11px] text-sky-900 font-mono">
                    KYC: {[card.kycNationalIdMask, card.kycShabaMask].filter(Boolean).join(" · ")}
                    {card.kycSubmittedAt ? ` · ${formatDate(card.kycSubmittedAt)}` : ""}
                  </div>
                )}

                {missing.length > 0 && (
                  <div className="mx-4 sm:mx-5 mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    این پرونده هنوز کامل نیست: {missing.join("، ")}.
                  </div>
                )}

                {card.reviewNote && (
                  <div className="mx-4 sm:mx-5 mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                    <span className="font-bold">آخرین یادداشت بررسی: </span>
                    {card.reviewNote}
                  </div>
                )}

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-white border border-slate-200 p-3">
                        <span className="block text-[10px] font-bold text-slate-400 mb-1">
                          محدوده فعالیت
                        </span>
                        <span className="text-xs text-slate-800">{card.workArea || "—"}</span>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-200 p-3">
                        <span className="block text-[10px] font-bold text-slate-400 mb-1">
                          تجهیزات
                        </span>
                        <span className="text-xs text-slate-800">
                          {card.equipmentSummary || "—"}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-200 p-3">
                        <span className="block text-[10px] font-bold text-slate-400 mb-1">
                          مبدأ حرکت
                        </span>
                        <span className="text-xs text-slate-800">{card.baseAddress || "—"}</span>
                      </div>
                    </div>

                    {card.bio && (
                      <div className="rounded-xl bg-white border border-slate-200 p-3">
                        <span className="block text-[10px] font-bold text-slate-400 mb-1">
                          بیوگرافی
                        </span>
                        <p className="text-xs text-slate-800 leading-relaxed">{card.bio}</p>
                      </div>
                    )}

                    {/* Category breakdown */}
                    <div className="flex flex-wrap gap-2">
                      {card.categories.map((cat) => {
                        const ready = cat.approved >= 10;
                        return (
                          <span
                            key={cat.slug}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                              ready
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-white text-slate-700 border-slate-200"
                            }`}
                          >
                            {ready && <ShieldCheck className="w-3 h-3" />}
                            {cat.title}
                            <span className="font-mono text-[10px] text-slate-500">
                              {cat.approved}/{cat.total}
                            </span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Portfolio grid */}
                    {card.items.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">
                        این متخصص هنوز نمونه‌کاری بارگذاری نکرده است.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {card.items.map((item) => (
                          <div
                            key={item.id}
                            className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs"
                          >
                            <div className="relative aspect-4/3 bg-slate-100">
                              {item.mediaType === "VIDEO" ? (
                                <video
                                  src={item.fileUrl}
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                  controls
                                />
                              ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={item.fileUrl}
                                  alt={item.title || item.categoryTitle}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              )}

                              <div className="absolute top-1.5 left-1.5 flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setPreview(item.fileUrl)}
                                  className="p-1 rounded-md bg-black/60 text-white hover:bg-black/80"
                                  title="بزرگ‌نمایی"
                                >
                                  <Maximize2 className="w-3 h-3" />
                                </button>
                                <a
                                  href={item.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-md bg-black/60 text-white hover:bg-black/80"
                                  title="فایل اصلی"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>

                              <span
                                className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${
                                  item.reviewStatus === "APPROVED"
                                    ? "bg-emerald-600"
                                    : item.reviewStatus === "REJECTED"
                                    ? "bg-rose-600"
                                    : "bg-amber-500"
                                }`}
                              >
                                {item.reviewStatus === "APPROVED"
                                  ? "تایید"
                                  : item.reviewStatus === "REJECTED"
                                  ? "رد"
                                  : "در انتظار"}
                              </span>
                            </div>

                            <div className="p-1.5 flex items-center gap-1">
                              {item.reviewStatus !== "APPROVED" && (
                                <button
                                  type="button"
                                  onClick={() => handleItemDecision(card, item.id, "APPROVE")}
                                  disabled={busy === item.id}
                                  className="flex-1 inline-flex items-center justify-center py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                                >
                                  {busy === item.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    "تایید"
                                  )}
                                </button>
                              )}
                              {item.reviewStatus !== "REJECTED" && (
                                <button
                                  type="button"
                                  onClick={() => handleItemDecision(card, item.id, "REJECT")}
                                  disabled={busy === item.id}
                                  className="flex-1 inline-flex items-center justify-center py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                                >
                                  رد
                                </button>
                              )}
                            </div>

                            {item.rejectionReason && (
                              <p className="px-1.5 pb-1.5 text-[9px] text-rose-700 leading-3">
                                {item.rejectionReason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject dialog */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleReject}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-right"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  بازگرداندن پرونده «{rejecting.displayName}»
                </h4>
                <p className="text-[11px] text-slate-500">
                  متخصص به وضعیت ناقص برمی‌گردد و می‌تواند پرونده را اصلاح و دوباره ارسال کند.
                </p>
              </div>
            </div>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              placeholder="مثال: کیفیت نورپردازی نمونه‌کارها پایین است و مبدأ حرکت روی نقشه دقیق نیست."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={busy === rejecting.profileId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                {busy === rejecting.profileId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                ارسال دلیل و بازگرداندن
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="بزرگ‌نمایی نمونه‌کار"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
