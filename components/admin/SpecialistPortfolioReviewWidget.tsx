"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { CustomInputProps } from "@premieroctet/next-admin";
import {
  getSpecialistPortfolioItems,
  approvePortfolioAction,
  rejectPortfolioAction,
} from "@/app/actions/adminActionHandlers";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Maximize2,
  AlertTriangle,
  Sparkles,
  GraduationCap,
  Loader2,
  Filter,
} from "lucide-react";

interface PortfolioItemData {
  id: string;
  specialistId: string;
  categorySlug: string;
  categoryType: string;
  fileUrl: string;
  mediaType: string;
  title: string | null;
  caption: string | null;
  fileSize: number | null;
  reviewStatus: string;
  rejectionReason: string | null;
  createdAt: string;
}

export default function SpecialistPortfolioReviewWidget({ item, mode }: CustomInputProps) {
  const specialistId = item?.id;
  const [items, setItems] = useState<PortfolioItemData[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [rejectingItem, setRejectingItem] = useState<PortfolioItemData | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModalLoading, setRejectModalLoading] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchItems = useCallback(async () => {
    if (!specialistId) return;
    setLoading(true);
    try {
      const res = await getSpecialistPortfolioItems(specialistId);
      if (res.success && res.items) {
        setItems(res.items);
      }
    } catch (err) {
      console.error("Failed to load portfolio items:", err);
    } finally {
      setLoading(false);
    }
  }, [specialistId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleApprove = async (itemId: string) => {
    setActionLoading((prev) => ({ ...prev, [itemId]: true }));
    setNotificationMsg(null);
    try {
      const res = await approvePortfolioAction([itemId]);
      if (res.type === "success" || res.type === "info") {
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? { ...it, reviewStatus: "APPROVED", rejectionReason: null }
              : it
          )
        );
        setNotificationMsg({ type: "success", text: res.message || "تایید شد." });
      } else {
        setNotificationMsg({
          type: "error",
          text: res.message || "تایید انجام نشد.",
        });
      }
    } catch (err: any) {
      setNotificationMsg({
        type: "error",
        text: err?.message || "خطا در تایید نمونه‌کار.",
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const openRejectModal = (it: PortfolioItemData) => {
    setRejectingItem(it);
    setRejectReason(it.rejectionReason || "");
    setRejectError(null);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;
    if (!rejectReason.trim()) {
      setRejectError("لطفاً علت رد اثر را مشخص کنید.");
      return;
    }

    setRejectModalLoading(true);
    setRejectError(null);
    try {
      const res = await rejectPortfolioAction({
        portfolioItemId: rejectingItem.id,
        reason: rejectReason.trim(),
      });
      if (res.success) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === rejectingItem.id
              ? { ...it, reviewStatus: "REJECTED", rejectionReason: rejectReason.trim() }
              : it
          )
        );
        setNotificationMsg({
          type: "success",
          text: "نمونه‌کار رد شد و پیام راهنمای جارآموز برای متخصص ارسال گردید.",
        });
        setRejectingItem(null);
      } else {
        setRejectError(res.error || "خطا در رد نمونه‌کار");
      }
    } catch (err: any) {
      setRejectError(err.message || "خطا در ثبت رد نمونه‌کار");
    } finally {
      setRejectModalLoading(false);
    }
  };

  const handleApproveAllPending = async () => {
    const pendingIds = items.filter((i) => i.reviewStatus === "PENDING").map((i) => i.id);
    if (pendingIds.length === 0) return;

    if (!confirm(`آیا از تایید هم‌زمان ${pendingIds.length} نمونه‌کار در انتظار بررسی مطمئن هستید؟`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await approvePortfolioAction(pendingIds);
      if (res.type === "success") {
        setItems((prev) =>
          prev.map((it) =>
            pendingIds.includes(it.id)
              ? { ...it, reviewStatus: "APPROVED", rejectionReason: null }
              : it
          )
        );
        setNotificationMsg({ type: "success", text: res.message });
      }
    } catch (err: any) {
      setNotificationMsg({ type: "error", text: err.message || "خطا در تایید همگانی" });
    } finally {
      setLoading(false);
    }
  };

  if (mode === "create" || !specialistId) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 text-xs text-center font-sans">
        پس از ذخیره اولیه پروفایل متخصص، ابزار بررسی و مدیریت نمونه‌کارها در این بخش فعال خواهد شد.
      </div>
    );
  }

  const pendingCount = items.filter((i) => i.reviewStatus === "PENDING").length;
  const approvedCount = items.filter((i) => i.reviewStatus === "APPROVED").length;
  const rejectedCount = items.filter((i) => i.reviewStatus === "REJECTED").length;

  const filteredItems = items.filter((i) => {
    if (filter === "ALL") return true;
    return i.reviewStatus === filter;
  });

  return (
    <div className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 font-sans text-right" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              بررسی و نظارت کیفی نمونه‌کارها
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              مجموع {items.length} اثر بارگذاری‌شده • {pendingCount} اثر در انتظار تایید
            </p>
          </div>
        </div>

        {pendingCount > 0 && (
          <button
            type="button"
            onClick={handleApproveAllPending}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            تایید همه در انتظار ({pendingCount})
          </button>
        )}
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between border ${
            notificationMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{notificationMsg.text}</span>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 flex items-center gap-1 ml-2">
          <Filter className="w-3.5 h-3.5" />
          فیلتر:
        </span>
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            filter === "ALL"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
          }`}
        >
          همه ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("PENDING")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            filter === "PENDING"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
          }`}
        >
          در انتظار ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("APPROVED")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            filter === "APPROVED"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
          }`}
        >
          تایید شده ({approvedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("REJECTED")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            filter === "REJECTED"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
          }`}
        >
          رد شده ({rejectedCount})
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-xs">در حال بارگذاری نمونه‌کارها...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-10 text-center rounded-xl bg-white border border-slate-200 p-6">
          <p className="text-xs text-slate-500">
            {items.length === 0
              ? "هنوز هیچ نمونه‌کاری توسط این متخصص آپلود نشده است."
              : "هیچ اثری در این فیلتر وجود ندارد."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredItems.map((item) => {
            const isActing = !!actionLoading[item.id];
            const isApproved = item.reviewStatus === "APPROVED";
            const isRejected = item.reviewStatus === "REJECTED";
            const isPending = item.reviewStatus === "PENDING";

            return (
              <div
                key={item.id}
                className="group relative flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
              >
                {/* Media Box */}
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                  {item.mediaType === "VIDEO" ? (
                    <video
                      src={item.fileUrl}
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={item.fileUrl}
                      alt={item.title || item.categorySlug}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Overlay Action Buttons */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(item.fileUrl)}
                      title="بزرگ‌نمایی"
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="مشاهده مستقیم فایل"
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        تایید شده
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow-xs animate-pulse">
                        <Clock className="w-3 h-3" />
                        در انتظار
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                        <XCircle className="w-3 h-3" />
                        رد شده
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {item.categorySlug}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                        {item.categoryType === "COMMERCIAL" ? "تجاری" : "شخصی"}
                      </span>
                    </div>

                    {item.title && (
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {item.title}
                      </p>
                    )}

                    {item.caption && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {item.caption}
                      </p>
                    )}

                    {/* Rejection Note if Rejected */}
                    {isRejected && item.rejectionReason && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-100 text-[10px] text-rose-800 mt-1 leading-4">
                        <span className="font-bold">علت رد: </span>
                        {item.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id)}
                        disabled={isActing}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تایید
                          </>
                        )}
                      </button>
                    )}

                    {!isRejected && (
                      <button
                        type="button"
                        onClick={() => openRejectModal(item)}
                        disabled={isActing}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        رد اثر
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-right p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    رد نمونه‌کار و ارسال اعلان به متخصص
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    دسته‌بندی: {rejectingItem.categorySlug}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs leading-5 flex items-start gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                با رد این اثر، اعلان درون‌برنامه‌ای همراه با دلیل و لینک آموزش‌های <strong>جارآموز</strong> برای متخصص ارسال می‌گردد.
              </span>
            </div>

            {rejectError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {rejectError}
              </div>
            )}

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  علت رد نمونه‌کار (جهت راهنمایی کیفی متخصص) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: نورپردازی ضعیف و عدم فوکوس مناسب، نیاز به رعایت کادربندی استاندارد"
                  required
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  disabled={rejectModalLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={rejectModalLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  {rejectModalLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      تایید رد اثر و ارسال پیام
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="بزرگ‌نمایی نمونه‌کار"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white hover:bg-black text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
