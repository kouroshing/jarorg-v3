"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Film,
  ImageIcon,
  LayoutGrid,
  Loader2,
  MapPin,
  Maximize2,
  Phone,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  approvePortfolioAction,
  approveProfileEditAction,
  approveSpecialistAction,
  rejectPortfolioAction,
  rejectProfileEditAction,
  rejectSpecialistAction,
  setSpecialistKycStatusAction,
} from "@/app/actions/adminActionHandlers";
import type { SpecialistReviewCard } from "@/lib/specialists/review";
import Image from "next/image";
import EquipmentTagsDisplay from "@/components/specialist/EquipmentTagsDisplay";
import AdminPortfolioGallery from "@/components/admin/AdminPortfolioGallery";
import PortfolioMediaThumb from "@/components/admin/PortfolioMediaThumb";
import {
  SPECIALIST_PROFILE_REJECTION_REASONS,
  buildSpecialistRejectionMessage,
} from "@/lib/specialists/rejectionReasons";
import {
  PROFILE_EDIT_FIELD_LABELS,
  formatPendingEditValue,
  type PendingProfileEditDraft,
} from "@/lib/specialists/profileEditShared";

type BoardView = "dossiers" | "gallery";
type CardMediaFilter = "ALL" | "IMAGE" | "VIDEO";
type CardStatusFilter = "APPROVED" | "ALL" | "PENDING" | "REJECTED";
type PreviewMedia = { fileUrl: string; mediaType: string; title?: string | null };

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
  const [rejectReasonIds, setRejectReasonIds] = useState<string[]>([]);
  const [rejectExtraNote, setRejectExtraNote] = useState("");
  const [preview, setPreview] = useState<PreviewMedia | null>(null);
  const [boardView, setBoardView] = useState<BoardView>("dossiers");
  const [cardMediaFilter, setCardMediaFilter] = useState<CardMediaFilter>("ALL");
  const [cardStatusFilter, setCardStatusFilter] = useState<CardStatusFilter>("ALL");
  const [actionsMenuId, setActionsMenuId] = useState<string | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<{
    card: SpecialistReviewCard;
    approveAllPending: boolean;
  } | null>(null);
  const [exceptionPhrase, setExceptionPhrase] = useState("");
  const [rejectItem, setRejectItem] = useState<{
    card: SpecialistReviewCard;
    itemId: string;
  } | null>(null);
  const [rejectItemReason, setRejectItemReason] = useState("");
  const [rejectKyc, setRejectKyc] = useState<SpecialistReviewCard | null>(null);
  const [rejectKycReason, setRejectKycReason] = useState("");
  const [rejectProfileEdit, setRejectProfileEdit] = useState<SpecialistReviewCard | null>(null);
  const [rejectProfileEditReason, setRejectProfileEditReason] = useState("");
  const [localCards, setLocalCards] = useState(cards);

  React.useEffect(() => {
    setLocalCards(cards);
  }, [cards]);

  const pendingCount = useMemo(
    () =>
      localCards.filter(
        (c) =>
          c.status === "PENDING_REVIEW" ||
          c.kycStatus === "PENDING" ||
          c.profileEditStatus === "PENDING"
      ).length,
    [localCards]
  );

  const refresh = () => startTransition(() => router.refresh());

  const announce = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 6000);
  };

  const requestApprove = (
    card: SpecialistReviewCard,
    approveAllPending: boolean
  ) => {
    setActionsMenuId(null);
    if (card.belowPortfolioMinimum) {
      setConfirmActivate({ card, approveAllPending });
      setExceptionPhrase("");
      return;
    }
    void runApprove(card, approveAllPending);
  };

  const runApprove = async (
    card: SpecialistReviewCard,
    approveAllPending: boolean
  ) => {
    const underMinimum = card.belowPortfolioMinimum;
    setBusy(card.profileId);
    setConfirmActivate(null);
    setExceptionPhrase("");
    try {
      const res = await approveSpecialistAction({
        specialistId: card.profileId,
        approveAllPending,
        allowUnderMinimum: underMinimum,
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

  const openRejectDialog = (card: SpecialistReviewCard) => {
    setRejecting(card);
    setRejectReasonIds([]);
    setRejectExtraNote("");
  };

  const toggleRejectReason = (id: string) => {
    setRejectReasonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejecting) return;
    if (rejectReasonIds.length === 0 && !rejectExtraNote.trim()) {
      announce("error", "حداقل یک علت را تیک بزنید یا توضیح بنویسید.");
      return;
    }
    const reason = buildSpecialistRejectionMessage(rejectReasonIds, rejectExtraNote);
    if (!reason.trim()) {
      announce("error", "دلیل بازگرداندن پرونده الزامی است.");
      return;
    }
    setBusy(rejecting.profileId);
    try {
      const res = await rejectSpecialistAction({
        specialistId: rejecting.profileId,
        reason,
      });
      if (res.success) {
        announce("success", res.message || "پرونده بازگردانده شد.");
        setRejecting(null);
        setRejectReasonIds([]);
        setRejectExtraNote("");
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
    decision: "APPROVE" | "REJECT",
    reason?: string
  ) => {
    if (decision === "REJECT" && !reason) {
      setRejectItem({ card, itemId });
      setRejectItemReason("");
      return;
    }
    setBusy(itemId);
    try {
      if (decision === "APPROVE") {
        const res = await approvePortfolioAction([itemId]);
        if (res.type === "error") {
          announce("error", res.message || "تایید انجام نشد.");
          return;
        }
        setLocalCards((prev) =>
          prev.map((c) => {
            if (c.profileId !== card.profileId) return c;
            const items = c.items.map((it) =>
              it.id === itemId
                ? { ...it, reviewStatus: "APPROVED", rejectionReason: null }
                : it
            );
            const approved = items.filter((i) => i.reviewStatus === "APPROVED").length;
            const pending = items.filter((i) => i.reviewStatus === "PENDING").length;
            const rejected = items.filter((i) => i.reviewStatus === "REJECTED").length;
            return {
              ...c,
              items,
              counts: { ...c.counts, approved, pending, rejected, total: items.length },
            };
          })
        );
        announce("success", res.message || "نمونه‌کار تایید شد.");
      } else {
        const res = await rejectPortfolioAction({
          portfolioItemId: itemId,
          reason: (reason || "").trim(),
        });
        if (!res.success) {
          announce("error", res.error);
          return;
        }
        setLocalCards((prev) =>
          prev.map((c) => {
            if (c.profileId !== card.profileId) return c;
            const items = c.items.map((it) =>
              it.id === itemId
                ? {
                    ...it,
                    reviewStatus: "REJECTED",
                    rejectionReason: (reason || "").trim(),
                  }
                : it
            );
            const approved = items.filter((i) => i.reviewStatus === "APPROVED").length;
            const pending = items.filter((i) => i.reviewStatus === "PENDING").length;
            const rejected = items.filter((i) => i.reviewStatus === "REJECTED").length;
            return {
              ...c,
              items,
              counts: { ...c.counts, approved, pending, rejected, total: items.length },
            };
          })
        );
        announce("success", "نمونه‌کار رد شد و به متخصص اطلاع داده شد.");
        setRejectItem(null);
        setRejectItemReason("");
      }
      refresh();
    } catch (err: any) {
      announce("error", err?.message || "خطای غیرمنتظره در سرور.");
    } finally {
      setBusy(null);
    }
  };

  const submitKycReject = async () => {
    if (!rejectKyc || !rejectKycReason.trim()) {
      announce("error", "علت رد احراز هویت الزامی است.");
      return;
    }
    setBusy(rejectKyc.profileId);
    try {
      const res = await setSpecialistKycStatusAction({
        specialistId: rejectKyc.profileId,
        status: "FAILED",
        reason: rejectKycReason.trim(),
      });
      if (res.success) announce("success", res.message || "KYC رد شد");
      else announce("error", res.error);
      setRejectKyc(null);
      setRejectKycReason("");
      refresh();
    } catch (err: any) {
      announce("error", err?.message || "خطای غیرمنتظره در سرور.");
    } finally {
      setBusy(null);
    }
  };

  const submitProfileEditReject = async () => {
    if (!rejectProfileEdit) return;
    setBusy(rejectProfileEdit.profileId);
    try {
      const res = await rejectProfileEditAction({
        specialistId: rejectProfileEdit.profileId,
        reason: rejectProfileEditReason.trim() || undefined,
      });
      if (res.success) announce("success", res.message || "ویرایش رد شد");
      else announce("error", res.error);
      setRejectProfileEdit(null);
      setRejectProfileEditReason("");
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setBoardView("dossiers")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors ${
                boardView === "dossiers"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              پرونده‌ها
            </button>
            <button
              type="button"
              onClick={() => setBoardView("gallery")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-colors ${
                boardView === "gallery"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              گالری
            </button>
          </div>
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

      {boardView === "gallery" && filter === "pending" && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-[11px] text-sky-900">
          الان فقط پرونده‌های صف بررسی را می‌بینید. برای گالری کامل اینستا،{" "}
          <Link href="/admin/review?status=all" className="font-bold underline underline-offset-2">
            همه متخصصان
          </Link>{" "}
          را باز کنید.
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3 rounded-xl text-xs font-medium border ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.text}
        </div>
      )}

      {boardView === "gallery" ? (
        <AdminPortfolioGallery
          cards={localCards}
          onFocusSpecialist={(profileId) => {
            setBoardView("dossiers");
            setExpanded(profileId);
            requestAnimationFrame(() => {
              document
                .getElementById(`review-card-${profileId}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
        />
      ) : localCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">صف بررسی خالی است</p>
          <p className="text-xs text-slate-500 mt-1">
            هیچ پرونده‌ای در انتظار تایید نیست.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {localCards.map((card) => {
            const isOpen = expanded === card.profileId;
            const status = STATUS_LABEL[card.status] || STATUS_LABEL.INCOMPLETE;
            const isBusy = busy === card.profileId || isPending;
            const missing = [
              !card.eligibility.hasDisplayName && "نام",
              !card.eligibility.hasAvatar && "عکس پروفایل",
              !card.eligibility.hasCategories && "دسته‌بندی",
              card.eligibility.submittableCategories.length === 0 &&
                !card.canActivateCore &&
                "۱۰ نمونه‌کار در یک شاخه",
              !card.eligibility.hasCity && "شهر",
              !card.eligibility.hasBaseLocation && "مبدأ روی نقشه",
              !card.eligibility.hasAgreedToTerms && "تعهدنامه",
            ].filter(Boolean) as string[];

            const activationBlocked = !card.canActivateCore;
            const underMinimum = card.belowPortfolioMinimum;
            const visibleItems = card.items.filter((item) => {
              if (cardStatusFilter !== "ALL" && item.reviewStatus !== cardStatusFilter) {
                return false;
              }
              if (cardMediaFilter === "IMAGE" && item.mediaType !== "IMAGE") return false;
              if (cardMediaFilter === "VIDEO" && item.mediaType !== "VIDEO") return false;
              return true;
            });

            return (
              <div
                key={card.profileId}
                id={`review-card-${card.profileId}`}
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
                        <Link
                          href={`/s/${card.userId}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-white hover:bg-slate-800"
                        >
                          مشاهده پروفایل
                          <ExternalLink className="w-3 h-3" />
                        </Link>
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
                        {card.profileEditStatus === "PENDING" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border bg-violet-50 text-violet-800 border-violet-200">
                            ویرایش پروفایل در انتظار
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

                  {/* Decision buttons — primary + secondary menu */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 relative">
                    {underMinimum && card.status !== "ACTIVE" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
                        نمونه‌کارها کمتر از ۱۰ عدد — تایید سخت‌گیرانه
                      </span>
                    )}
                    {card.status !== "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => requestApprove(card, true)}
                        disabled={isBusy || activationBlocked}
                        title={
                          activationBlocked
                            ? `پرونده ناقص است: ${missing.join("، ")}`
                            : underMinimum
                              ? "تایید استثنایی: نمونه‌کارها کمتر از ۱۰ عدد است"
                              : "تمام آثار در انتظار را تایید و متخصص را فعال کن"
                        }
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                          underMinimum
                            ? "bg-amber-700 hover:bg-amber-800"
                            : "bg-jar-primary hover:bg-jar-primaryHover"
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {underMinimum ? "تایید استثنایی و فعال‌سازی" : "تایید همه و فعال‌سازی"}
                      </button>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setActionsMenuId(
                            actionsMenuId === card.profileId ? null : card.profileId
                          )
                        }
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 disabled:opacity-40"
                      >
                        سایر اقدامات
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {actionsMenuId === card.profileId && (
                        <div className="absolute left-0 top-full mt-1 z-20 min-w-[200px] rounded-xl border border-slate-200 bg-white shadow-lg p-1.5 space-y-0.5">
                          {card.status !== "ACTIVE" && (card.canActivate || underMinimum) && (
                            <button
                              type="button"
                              onClick={() => requestApprove(card, false)}
                              disabled={isBusy || activationBlocked}
                              className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40"
                            >
                              {underMinimum ? "فعال‌سازی استثنایی (بدون تایید آثار)" : "فقط فعال‌سازی"}
                            </button>
                          )}
                          {card.kycStatus === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setActionsMenuId(null);
                                  setBusy(card.profileId);
                                  setSpecialistKycStatusAction({
                                    specialistId: card.profileId,
                                    status: "VERIFIED",
                                  })
                                    .then((res) => {
                                      if (res.success)
                                        announce("success", res.message || "KYC تایید شد");
                                      else announce("error", res.error);
                                      refresh();
                                    })
                                    .finally(() => setBusy(null));
                                }}
                                className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold text-sky-800 hover:bg-sky-50 disabled:opacity-40"
                              >
                                تایید KYC
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setActionsMenuId(null);
                                  setRejectKyc(card);
                                  setRejectKycReason("");
                                }}
                                className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                              >
                                رد KYC
                              </button>
                            </>
                          )}
                          {card.profileEditStatus === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setActionsMenuId(null);
                                  setBusy(card.profileId);
                                  approveProfileEditAction({ specialistId: card.profileId })
                                    .then((res) => {
                                      if (res.success)
                                        announce("success", res.message || "ویرایش تایید شد");
                                      else announce("error", res.error);
                                      refresh();
                                    })
                                    .finally(() => setBusy(null));
                                }}
                                className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-40"
                              >
                                تایید ویرایش پروفایل
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setActionsMenuId(null);
                                  setRejectProfileEdit(card);
                                  setRejectProfileEditReason("");
                                }}
                                className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                              >
                                رد ویرایش پروفایل
                              </button>
                            </>
                          )}
                          {card.status !== "INCOMPLETE" && (
                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuId(null);
                                openRejectDialog(card);
                              }}
                              disabled={isBusy}
                              className="w-full text-right px-3 py-2 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                            >
                              بازگرداندن پرونده
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(card.kycNationalIdMask || card.kycShabaMask) && (
                  <div className="mx-4 sm:mx-5 mb-3 p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-[11px] text-sky-900 font-mono">
                    KYC: {[card.kycNationalIdMask, card.kycShabaMask].filter(Boolean).join(" · ")}
                    {card.kycSubmittedAt ? ` · ${formatDate(card.kycSubmittedAt)}` : ""}
                  </div>
                )}

                {card.profileEditStatus === "PENDING" && card.pendingProfileEdit && (
                  <div className="mx-4 sm:mx-5 mb-3 rounded-xl border border-violet-200 bg-violet-50/80 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-black text-violet-950">
                        پیش‌نویس ویرایش پروفایل
                        {card.profileEditSubmittedAt
                          ? ` · ${formatDate(card.profileEditSubmittedAt)}`
                          : ""}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setBusy(card.profileId);
                            approveProfileEditAction({ specialistId: card.profileId })
                              .then((res) => {
                                if (res.success)
                                  announce("success", res.message || "ویرایش تایید شد");
                                else announce("error", res.error);
                                refresh();
                              })
                              .finally(() => setBusy(null));
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-violet-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-violet-800 disabled:opacity-40"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          اعمال ویرایش
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setRejectProfileEdit(card);
                            setRejectProfileEditReason("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                        >
                          <XCircle className="h-3 w-3" />
                          رد
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-1 text-[11px] text-violet-950">
                      {(
                        Object.entries(card.pendingProfileEdit) as [
                          keyof PendingProfileEditDraft,
                          unknown,
                        ][]
                      )
                        .filter(([, value]) => value !== undefined)
                        .map(([key, value]) => (
                          <li
                            key={key}
                            className="flex flex-wrap gap-x-2 gap-y-0.5 rounded-lg bg-white/70 px-2 py-1.5 border border-violet-100"
                          >
                            <span className="font-bold">
                              {PROFILE_EDIT_FIELD_LABELS[key] || key}:
                            </span>
                            <span className="font-medium break-all">
                              {formatPendingEditValue(key, value)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {missing.length > 0 && (
                  <div className="mx-4 sm:mx-5 mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    این پرونده هنوز کامل نیست: {missing.join("، ")}.
                  </div>
                )}

                {card.reviewNote && (
                  <div className="mx-4 sm:mx-5 mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 whitespace-pre-wrap">
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
                      <div className="rounded-xl bg-white border border-slate-200 p-3 md:col-span-1">
                        <span className="block text-[10px] font-bold text-slate-400 mb-1">
                          {card.isMobileGrapher ? "تجهیزات موبایل‌گرافی" : "تجهیزات"}
                        </span>
                        {card.isMobileGrapher && (
                          <span className="mb-2 inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            موبایل‌گرافر
                          </span>
                        )}
                        <EquipmentTagsDisplay value={card.equipmentSummary} />
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
                          بیوگرافی (فقط ادمین)
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
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-600">
                          نمونه‌کارها · {visibleItems.length.toLocaleString("fa-IR")} از{" "}
                          {card.items.length.toLocaleString("fa-IR")}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              ["APPROVED", "تاییدشده"],
                              ["ALL", "همه"],
                              ["PENDING", "در انتظار"],
                              ["REJECTED", "ردشده"],
                            ] as const
                          ).map(([id, label]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setCardStatusFilter(id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                cardStatusFilter === id
                                  ? "bg-slate-900 text-white"
                                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                          <span className="w-px h-5 bg-slate-200 self-center mx-0.5" />
                          {(
                            [
                              ["ALL", "همه", <LayoutGrid key="a" className="w-3 h-3" />],
                              ["IMAGE", "عکس", <ImageIcon key="i" className="w-3 h-3" />],
                              ["VIDEO", "ویدیو", <Film key="v" className="w-3 h-3" />],
                            ] as const
                          ).map(([id, label, icon]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setCardMediaFilter(id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                cardMediaFilter === id
                                  ? "bg-jar-primary text-white"
                                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {icon}
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {card.items.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">
                          این متخصص هنوز نمونه‌کاری بارگذاری نکرده است.
                        </p>
                      ) : visibleItems.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">
                          با این فیلتر نمونه‌کاری نیست.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {visibleItems.map((item) => (
                            <div
                              key={item.id}
                              className="group relative flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setPreview({
                                    fileUrl: item.fileUrl,
                                    mediaType: item.mediaType,
                                    title: item.title || item.categoryTitle,
                                  })
                                }
                                className="relative aspect-square bg-slate-100 cursor-zoom-in text-right"
                              >
                                <PortfolioMediaThumb
                                  fileUrl={item.fileUrl}
                                  mediaType={item.mediaType}
                                  alt={item.title || item.categoryTitle}
                                />

                                <div className="absolute top-1.5 left-1.5 flex gap-1 z-[1]">
                                  <span className="p-1 rounded-md bg-black/60 text-white">
                                    <Maximize2 className="w-3 h-3" />
                                  </span>
                                  <a
                                    href={item.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded-md bg-black/60 text-white hover:bg-black/80"
                                    title="فایل اصلی"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>

                                <span
                                  className={`absolute top-1.5 right-1.5 z-[1] px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${
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
                              </button>

                              <div className="px-2 pt-2 pb-1">
                                <p className="text-[11px] font-bold text-slate-800 truncate">
                                  {card.displayName}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {item.categoryTitle}
                                </p>
                              </div>

                              <div className="p-1.5 flex items-center gap-1">
                                {item.reviewStatus === "PENDING" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void handleItemDecision(card, item.id, "APPROVE");
                                    }}
                                    disabled={busy === item.id}
                                    className="flex-1 inline-flex items-center justify-center py-1.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                                  >
                                    {busy === item.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      "تایید"
                                    )}
                                  </button>
                                )}
                                {item.reviewStatus === "PENDING" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void handleItemDecision(card, item.id, "REJECT");
                                    }}
                                    disabled={busy === item.id}
                                    className="flex-1 inline-flex items-center justify-center py-1.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                                  >
                                    رد
                                  </button>
                                )}
                                {item.reviewStatus === "APPROVED" && (
                                  <button
                                    type="button"
                                    onClick={() => handleItemDecision(card, item.id, "REJECT")}
                                    disabled={busy === item.id}
                                    className="flex-1 inline-flex items-center justify-center py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                                  >
                                    رد
                                  </button>
                                )}
                                {item.reviewStatus === "REJECTED" && (
                                  <span className="flex-1 text-center text-[9px] font-bold text-rose-700 py-1">
                                    رد شده — غیرقابل تایید مجدد
                                  </span>
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
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-right"
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
                  علت‌های مربوط را تیک بزنید؛ متن کامل برای متخصص ارسال می‌شود.
                </p>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[11px] font-bold text-slate-600 mb-1">
                علت‌های آماده (می‌توانید چند مورد انتخاب کنید)
              </legend>
              <div className="space-y-1.5 max-h-[42vh] overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50/80">
                {SPECIALIST_PROFILE_REJECTION_REASONS.map((reason) => {
                  const checked = rejectReasonIds.includes(reason.id);
                  return (
                    <label
                      key={reason.id}
                      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                        checked
                          ? "border-rose-300 bg-rose-50"
                          : "border-transparent bg-white hover:border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRejectReason(reason.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-slate-900">
                          {reason.label}
                        </span>
                        <span className="block text-[10px] text-slate-500 leading-relaxed mt-0.5">
                          {reason.detail}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600">
                توضیح اضافه (اختیاری)
              </label>
              <textarea
                rows={2}
                value={rejectExtraNote}
                onChange={(e) => setRejectExtraNote(e.target.value)}
                placeholder="اگر نکته خاصی دارید اینجا بنویسید…"
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejecting(null);
                  setRejectReasonIds([]);
                  setRejectExtraNote("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={
                  busy === rejecting.profileId ||
                  (rejectReasonIds.length === 0 && !rejectExtraNote.trim())
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                {busy === rejecting.profileId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                ارسال دلیل و بازگرداندن
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exceptional activate dialog */}
      {confirmActivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exception-activate-title"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-200 p-6 space-y-4 text-right"
          >
            <h4 id="exception-activate-title" className="text-sm font-bold text-slate-900">
              تایید استثنایی «{confirmActivate.card.displayName}»
            </h4>
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
              نمونه‌کارهای تاییدشده کمتر از ۱۰ عدد است. فقط وقتی ادامه دهید که کیفیت کار
              را شخصاً تایید کرده‌اید.
            </p>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600">
                برای ادامه دقیقاً بنویسید: تایید استثنایی
              </label>
              <input
                value={exceptionPhrase}
                onChange={(e) => setExceptionPhrase(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setConfirmActivate(null);
                  setExceptionPhrase("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={exceptionPhrase.trim() !== "تایید استثنایی"}
                onClick={() =>
                  void runApprove(
                    confirmActivate.card,
                    confirmActivate.approveAllPending
                  )
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50"
              >
                تایید و فعال‌سازی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio item reject dialog */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!rejectItemReason.trim()) {
                announce("error", "علت رد نمونه‌کار الزامی است.");
                return;
              }
              void handleItemDecision(
                rejectItem.card,
                rejectItem.itemId,
                "REJECT",
                rejectItemReason
              );
            }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-right"
          >
            <h4 className="text-sm font-bold text-slate-900">رد نمونه‌کار</h4>
            <textarea
              rows={3}
              value={rejectItemReason}
              onChange={(e) => setRejectItemReason(e.target.value)}
              placeholder="علت رد این نمونه‌کار را بنویسید…"
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectItem(null);
                  setRejectItemReason("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!rejectItemReason.trim() || busy === rejectItem.itemId}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                رد نمونه‌کار
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KYC reject dialog */}
      {rejectKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitKycReject();
            }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-right"
          >
            <h4 className="text-sm font-bold text-slate-900">
              رد احراز هویت «{rejectKyc.displayName}»
            </h4>
            <textarea
              rows={3}
              value={rejectKycReason}
              onChange={(e) => setRejectKycReason(e.target.value)}
              placeholder="علت رد احراز هویت…"
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectKyc(null);
                  setRejectKycReason("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!rejectKycReason.trim() || busy === rejectKyc.profileId}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                رد KYC
              </button>
            </div>
          </form>
        </div>
      )}

      {rejectProfileEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitProfileEditReject();
            }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-right"
          >
            <h4 className="text-sm font-bold text-slate-900">
              رد ویرایش پروفایل «{rejectProfileEdit.displayName}»
            </h4>
            <textarea
              rows={3}
              value={rejectProfileEditReason}
              onChange={(e) => setRejectProfileEditReason(e.target.value)}
              placeholder="علت رد ویرایش (اختیاری)…"
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectProfileEdit(null);
                  setRejectProfileEditReason("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={busy === rejectProfileEdit.profileId}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              >
                رد ویرایش
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label="بزرگ‌نمایی نمونه‌کار"
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="max-w-5xl w-full flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.mediaType === "VIDEO" ? (
              <video
                src={preview.fileUrl}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-xl shadow-2xl bg-black"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={preview.fileUrl}
                alt={preview.title || "بزرگ‌نمایی نمونه‌کار"}
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
