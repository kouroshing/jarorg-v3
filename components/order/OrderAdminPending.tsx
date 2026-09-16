"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  FolderOpen,
  MapPin,
  PencilLine,
  AlertCircle,
  ShieldCheck,
  Timer,
  UserRound,
} from "lucide-react";
import { parseOrderStatus } from "@/lib/orders/status";
import OrderMatchingRadar from "./OrderMatchingRadar";

/** Typical admin QC wait before publish — used for the progress bar only. */
const AVG_ADMIN_WAIT_MS = 2 * 60 * 60 * 1000;

interface OrderAdminPendingProps {
  order: {
    id: string;
    categoryTitle?: string | null;
    durationHours: number;
    locationType: string;
    districtOrCity?: string | null;
    isFlexibleSchedule: boolean;
    bookingDate?: string | null;
    status: string;
    adminNote?: string | null;
    createdAt?: string | null;
  };
  isOwnerOrAdmin: boolean;
}

function locationLabel(order: OrderAdminPendingProps["order"]) {
  if (order.locationType === "CLIENT_LOCATION") {
    return order.districtOrCity ? `محل شما (${order.districtOrCity})` : "محل کارفرما";
  }
  if (order.locationType === "JAR_STUDIO") {
    return "استودیوهای همکار جار";
  }
  return "با مشورت عکاس";
}

function faPad(n: number) {
  return n.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });
}

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${faPad(h)}:${faPad(m)}:${faPad(s)}`;
  return `${faPad(m)}:${faPad(s)}`;
}

export default function OrderAdminPending({ order }: OrderAdminPendingProps) {
  const needsEdit = parseOrderStatus(order.status) === "NEEDS_CLIENT_EDIT";
  const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (needsEdit) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [needsEdit]);

  const elapsed = Math.max(0, now - createdMs);
  const progressPct = Math.min(100, Math.round((elapsed / AVG_ADMIN_WAIT_MS) * 100));
  const avgHoursLabel = (AVG_ADMIN_WAIT_MS / (60 * 60 * 1000)).toLocaleString("fa-IR");

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
      dir="rtl"
    >
      {!needsEdit && (
        <>
          <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-neutral-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-12 h-48 w-48 rounded-full bg-emerald-100/50 blur-3xl" />
        </>
      )}

      <div className="relative z-10 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          {needsEdit ? (
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
              <PencilLine className="h-6 w-6" />
            </div>
          ) : (
            <OrderMatchingRadar size={200} foundCount={0} />
          )}

          <div className="space-y-2 max-w-md">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
                needsEdit
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-neutral-200 bg-neutral-50 text-neutral-700"
              }`}
            >
              {needsEdit ? (
                "نیاز به ویرایش درخواست"
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  در حال بررسی توسط تیم جار
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              {needsEdit
                ? "لطفاً جزئیات پروژه را اصلاح کنید"
                : `درخواست «${order.categoryTitle || "پروژه"}» ثبت شد`}
            </h1>

            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed font-medium">
              {needsEdit
                ? "کارشناسان جار از شما خواسته‌اند قبل از انتشار برای متخصصان، اطلاعات را اصلاح کنید."
                : "رادار جار روشن است — بعد از تایید کیفیت، پروژه برای متخصصان واجد شرایط منتشر می‌شود و جست‌وجو برای بهترین گزینه ادامه پیدا می‌کند."}
            </p>
          </div>
        </div>

        {needsEdit && order.adminNote && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3 text-right">
            <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-black text-amber-950">پیام تیم جار</p>
              <p className="text-xs text-amber-900/90 leading-relaxed font-medium whitespace-pre-wrap">
                {order.adminNote}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-neutral-600">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200">
            <Calendar className="h-3 w-3" />
            {order.isFlexibleSchedule
              ? "زمان توافقی با متخصص"
              : order.bookingDate || "تاریخ مشخص"}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200">
            <Clock className="h-3 w-3" />
            {order.durationHours.toLocaleString("fa-IR")} ساعت
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 max-w-[200px] truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{locationLabel(order)}</span>
          </span>
        </div>

        {!needsEdit && (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-3 text-right">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700">
                  <Timer className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-black text-neutral-900">میانگین زمان انتظار بررسی</p>
                  <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                    معمولاً کمتر از {avgHoursLabel} ساعت کاری طول می‌کشد تا پروژه منتشر شود.
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-left tabular-nums" dir="ltr">
                <p className="text-[10px] font-bold text-neutral-400">از ثبت</p>
                <p className="text-lg font-black text-neutral-900 font-mono tracking-tight">
                  {formatElapsed(elapsed)}
                </p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200/80 border border-neutral-200">
              <div
                className="h-full rounded-full bg-neutral-900 transition-[width] duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-neutral-500 font-medium">
              {progressPct >= 100
                ? "از میانگین معمول گذشته — تیم جار به‌زودی رسیدگی می‌کند."
                : `${progressPct.toLocaleString("fa-IR")}٪ از میانگین معمول انتظار`}
            </p>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-[11px] text-neutral-600 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            تا قبل از تایید و انتشار، متخصصی پروژه را نمی‌بیند. از منوی بالای صفحه می‌توانید رزرو را
            لغو کنید.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <Link
            href="/profile"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
          >
            <UserRound className="h-4 w-4" />
            ورود به پروفایل
          </Link>
          <Link
            href={`/order/${order.id}`}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-bold text-neutral-900 hover:bg-neutral-50 transition-colors"
          >
            <FolderOpen className="h-4 w-4" />
            ماندن در همین پروژه
          </Link>
        </div>
      </div>
    </section>
  );
}
