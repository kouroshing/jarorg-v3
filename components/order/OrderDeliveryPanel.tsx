"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Link2,
  Upload,
  Trash2,
  ExternalLink,
  FileText,
  MessageSquare,
} from "lucide-react";
import {
  reportDeliveryAction,
  confirmDeliveryAction,
  raiseDisputeAction,
  requestRevisionAction,
  adminReleaseEscrowAction,
  resolveDisputeAction,
} from "@/app/actions/deliveryActions";
import {
  listOrderDeliverablesAction,
  addOrderDeliverableLinkAction,
  removeOrderDeliverableAction,
  getOrderDisputeContextAction,
} from "@/app/actions/orderDeliverableActions";
import type { OrderDeliverableView } from "@/lib/orders/deliverables";
import { deliverableHref, MAX_ORDER_DELIVERABLES } from "@/lib/orders/deliverables";
import { formatJalaliDate } from "@/lib/date/jalali";

/** Must stay in sync with lib/orders/settlement.ts AUTO_RELEASE_DAYS */
const AUTO_RELEASE_DAYS = 7;

export type DeliveryOrderSnapshot = {
  id: string;
  paidAt: string | null;
  deliveredAt: string | null;
  settledAt: string | null;
  disputedAt: string | null;
  disputeReason: string | null;
  disputeResolvedAt: string | null;
  revisionCount: number;
  revisionNote: string | null;
  categoryTitle: string | null;
};

function DeliverableList({
  items,
  canRemove,
  onRemove,
  busy,
}: {
  items: OrderDeliverableView[];
  canRemove: boolean;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        هنوز فایل یا لینکی ثبت نشده است.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((d) => {
        const href = deliverableHref(d);
        const title =
          d.label ||
          d.fileName ||
          (d.kind === "LINK" ? "لینک خارجی" : "فایل تحویل");
        return (
          <li
            key={d.id}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2"
          >
            {d.kind === "LINK" ? (
              <Link2 className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-neutral-900 hover:underline inline-flex items-center gap-1 truncate max-w-full"
                >
                  <span className="truncate">{title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </a>
              ) : (
                <span className="text-[11px] font-bold text-neutral-900 truncate block">
                  {title}
                </span>
              )}
              <p className="text-[10px] text-neutral-500">
                {d.kind === "LINK" ? "لینک" : "فایل"}
                {d.fileSize
                  ? ` · ${(d.fileSize / (1024 * 1024)).toFixed(1)} MB`
                  : ""}
              </p>
            </div>
            {canRemove && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRemove(d.id)}
                className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                aria-label="حذف"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function OrderDeliveryPanel({
  order,
  role,
}: {
  order: DeliveryOrderSnapshot;
  role: "client" | "specialist" | "admin";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"idle" | "revision" | "dispute" | "admin-refund">(
    "idle"
  );
  const [items, setItems] = useState<OrderDeliverableView[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [checkFiles, setCheckFiles] = useState(false);
  const [checkChat, setCheckChat] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [disputeCtx, setDisputeCtx] = useState<{
    messages: Array<{ id: string; body: string; createdAt: string; senderLabel: string }>;
    messageCount: number;
  } | null>(null);

  const canEditDeliverables =
    (role === "specialist" || role === "admin") &&
    !order.settledAt &&
    (!order.deliveredAt || role === "admin");

  const loadDeliverables = () => {
    startTransition(async () => {
      const res = await listOrderDeliverablesAction(order.id);
      if (res.success && res.items) setItems(res.items);
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await listOrderDeliverablesAction(order.id);
      if (!cancelled && res.success && res.items) setItems(res.items);
    })();
    return () => {
      cancelled = true;
    };
  }, [order.id, order.deliveredAt, order.settledAt]);

  useEffect(() => {
    if (role !== "admin" || !order.disputedAt || order.disputeResolvedAt) {
      setDisputeCtx(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await getOrderDisputeContextAction(order.id);
      if (!cancelled && res.success) {
        setDisputeCtx({
          messages: res.messages,
          messageCount: res.messageCount,
        });
        setItems(res.deliverables);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, order.id, order.disputedAt, order.disputeResolvedAt]);

  const run = (fn: () => Promise<{ success: boolean; error?: string; message?: string }>) => {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error || "خطا");
        return;
      }
      setOk(res.message || "انجام شد");
      setMode("idle");
      setNote("");
      router.refresh();
      loadDeliverables();
    });
  };

  const addLink = () => {
    setError(null);
    startTransition(async () => {
      const res = await addOrderDeliverableLinkAction({
        orderId: order.id,
        linkUrl,
        label: linkLabel || undefined,
      });
      if (!res.success) {
        setError(res.error || "خطا");
        return;
      }
      setLinkUrl("");
      setLinkLabel("");
      setOk(res.message || "اضافه شد");
      loadDeliverables();
    });
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("orderId", order.id);
      const res = await fetch("/api/order/deliverable/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "آپلود ناموفق بود");
        return;
      }
      setOk("فایل اضافه شد");
      loadDeliverables();
    } catch {
      setError("خطا در آپلود فایل");
    } finally {
      setUploading(false);
    }
  };

  const removeItem = (id: string) => {
    run(() => removeOrderDeliverableAction(id));
  };

  if (!order.paidAt) return null;

  const deliverablesBlock = (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-black text-neutral-900">خروجی‌های تحویل</h3>
        <span className="text-[10px] text-neutral-500">
          {items.length.toLocaleString("fa-IR")} / {MAX_ORDER_DELIVERABLES.toLocaleString("fa-IR")}
        </span>
      </div>
      <DeliverableList
        items={items}
        canRemove={canEditDeliverables}
        onRemove={removeItem}
        busy={isPending}
      />
      {canEditDeliverables && items.length < MAX_ORDER_DELIVERABLES && (
        <div className="space-y-2 pt-1 border-t border-neutral-200">
          <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white text-[11px] font-bold text-neutral-800 hover:bg-neutral-50">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            آپلود فایل (تصویر / PDF / ZIP تا ۲۵MB)
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf,application/zip,.zip"
              disabled={uploading || isPending}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                void onUpload(f);
              }}
            />
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="لینک گوگل‌درایو / دراپ‌باکس / …"
              className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px]"
              dir="ltr"
            />
            <input
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="عنوان (اختیاری)"
              className="sm:w-36 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px]"
            />
            <button
              type="button"
              disabled={isPending || !linkUrl.trim()}
              onClick={addLink}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-neutral-900 px-3 text-[11px] font-bold text-white disabled:opacity-40"
            >
              <Link2 className="h-3.5 w-3.5" />
              افزودن لینک
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (order.settledAt) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-3" dir="rtl">
        <div className="flex items-center gap-2 text-emerald-900">
          <CheckCircle2 className="h-5 w-5" />
          <h2 className="text-sm font-black">پروژه تسویه شد</h2>
        </div>
        <p className="text-xs text-emerald-800/90 leading-relaxed">
          مبلغ متخصص آزاد شده است
          {order.settledAt
            ? ` · ${formatJalaliDate(new Date(order.settledAt))}`
            : ""}
          . می‌توانید از بخش نظرسنجی پایین صفحه امتیاز بدهید.
        </p>
        {deliverablesBlock}
      </div>
    );
  }

  if (order.disputedAt && !order.disputeResolvedAt) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3" dir="rtl">
        <div className="flex items-center gap-2 text-amber-950">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-sm font-black">اعتراض در بررسی جار</h2>
        </div>
        <p className="text-xs text-amber-900/90 leading-relaxed">
          تسویه تا تصمیم ادمین متوقف است.
          {order.disputeReason ? ` دلیل: ${order.disputeReason}` : ""}
        </p>
        {deliverablesBlock}
        {role === "admin" && disputeCtx && (
          <div className="rounded-xl border border-amber-200 bg-white/80 p-3 space-y-2">
            <h3 className="text-[11px] font-black text-amber-950 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              آخرین پیام‌های چت ({disputeCtx.messageCount.toLocaleString("fa-IR")})
            </h3>
            {disputeCtx.messages.length === 0 ? (
              <p className="text-[10px] text-amber-800/80">پیامی در چت ثبت نشده.</p>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {disputeCtx.messages.map((m) => (
                  <li key={m.id} className="text-[10px] leading-relaxed text-neutral-800">
                    <span className="font-bold">{m.senderLabel}: </span>
                    {m.body}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-amber-800/70">
              برای گفتگوی کامل، پنل چت همین صفحه را ببینید.
            </p>
          </div>
        )}
        {role === "admin" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => resolveDisputeAction(order.id, "RELEASED"))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              آزاد کردن مبلغ برای متخصص
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode("admin-refund")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-rose-800 disabled:opacity-50"
            >
              پذیرش اعتراض + لغو/عودت
            </button>
          </div>
        )}
        {mode === "admin-refund" && role === "admin" && (
          <div className="space-y-2 rounded-xl border border-rose-200 bg-white p-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
              placeholder="یادداشت ادمین (اختیاری)"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(() => resolveDisputeAction(order.id, "REFUNDED", note.trim() || undefined))
              }
              className="h-9 rounded-lg bg-rose-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"
            >
              تایید عودت دستی
            </button>
          </div>
        )}
        {error && <p className="text-xs font-bold text-rose-700">{error}</p>}
        {ok && <p className="text-xs font-bold text-emerald-800">{ok}</p>}
      </div>
    );
  }

  const canReport =
    (role === "specialist" || role === "admin") &&
    !order.deliveredAt &&
    items.length >= 1 &&
    checkFiles &&
    checkChat;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-sm" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-neutral-900 flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-neutral-700" />
            بستن پروژه و تسویه
          </h2>
          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
            {order.deliveredAt
              ? `تحویل ثبت شده · در صورت عدم پاسخ کارفرما، حداکثر ${AUTO_RELEASE_DAYS} روز بعد تسویه خودکار می‌شود.`
              : "متخصص ابتدا خروجی‌ها را ضمیمه می‌کند، بعد تحویل را ثبت می‌کند؛ کارفرما تایید یا اصلاح/اعتراض می‌کند."}
          </p>
        </div>
      </div>

      {order.revisionNote && !order.deliveredAt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
          <span className="font-bold">درخواست اصلاح قبلی: </span>
          {order.revisionNote}
          {order.revisionCount > 0
            ? ` (${order.revisionCount.toLocaleString("fa-IR")} بار)`
            : ""}
        </div>
      )}

      {deliverablesBlock}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          {ok}
        </div>
      )}

      {(role === "specialist" || role === "admin") && !order.deliveredAt && (
        <div className="space-y-3">
          <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-[11px] font-black text-neutral-900">چک‌لیست قبل از ثبت تحویل</p>
            <label className="flex items-start gap-2 text-[11px] text-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={checkFiles}
                onChange={(e) => setCheckFiles(e.target.checked)}
                className="mt-0.5"
              />
              <span>خروجی‌های بالا کامل است و همان چیزی است که باید به کارفرما برسد.</span>
            </label>
            <label className="flex items-start gap-2 text-[11px] text-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={checkChat}
                onChange={(e) => setCheckChat(e.target.checked)}
                className="mt-0.5"
              />
              <span>هماهنگی‌های لازم در چت سفارش ثبت شده یا کارفرما از مسیر تحویل آگاه است.</span>
            </label>
          </div>
          <button
            type="button"
            disabled={isPending || !canReport}
            onClick={() => run(() => reportDeliveryAction(order.id))}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
            ثبت تحویل پروژه
          </button>
          {items.length < 1 && (
            <p className="text-[10px] text-amber-800 text-center">
              حداقل یک فایل یا لینک لازم است.
            </p>
          )}
        </div>
      )}

      {(role === "client" || role === "admin") && order.deliveredAt && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => confirmDeliveryAction(order.id))}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            تایید تحویل و تسویه متخصص
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode(mode === "revision" ? "idle" : "revision")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 text-[11px] font-bold text-amber-950 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              درخواست اصلاح
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setMode(mode === "dispute" ? "idle" : "dispute")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-bold text-rose-900 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              ثبت اعتراض
            </button>
          </div>

          {mode === "revision" && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs"
                placeholder="دقیقاً چه چیزی باید اصلاح شود؟"
              />
              <button
                type="button"
                disabled={isPending || note.trim().length < 10}
                onClick={() => run(() => requestRevisionAction(order.id, note))}
                className="h-9 rounded-lg bg-amber-700 px-3 text-[11px] font-bold text-white disabled:opacity-50"
              >
                ارسال درخواست اصلاح
              </button>
            </div>
          )}

          {mode === "dispute" && (
            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
              <p className="text-[10px] text-rose-800 leading-relaxed">
                اعتراض تسویه را متوقف می‌کند و جار با خروجی‌ها و چت سفارش بررسی می‌کند. برای اصلاح جزئی، «درخواست اصلاح» بهتر است.
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs"
                placeholder="حداقل ۱۵ کاراکتر — مشکل را بنویسید"
              />
              <button
                type="button"
                disabled={isPending || note.trim().length < 15}
                onClick={() => run(() => raiseDisputeAction(order.id, note))}
                className="h-9 rounded-lg bg-rose-700 px-3 text-[11px] font-bold text-white disabled:opacity-50"
              >
                ثبت اعتراض
              </button>
            </div>
          )}
        </div>
      )}

      {role === "admin" && order.paidAt && !order.settledAt && !order.disputedAt && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => adminReleaseEscrowAction(order.id))}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-800 disabled:opacity-50"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          آزادسازی ادمین (بدون تایید مشتری)
        </button>
      )}

      {(role === "specialist" || role === "admin") && order.deliveredAt && !order.settledAt && (
        <p className="text-[11px] text-neutral-500 text-center">
          منتظر تایید کارفرما هستید
          {order.deliveredAt
            ? ` · تحویل: ${formatJalaliDate(new Date(order.deliveredAt))}`
            : ""}
        </p>
      )}
    </div>
  );
}
