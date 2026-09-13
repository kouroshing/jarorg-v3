"use client";

import React from "react";
import {
  Clock,
  ShieldCheck,
  Calendar,
  MapPin,
  PencilLine,
  AlertCircle,
} from "lucide-react";
import { parseOrderStatus } from "@/lib/orders/status";

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

export default function OrderAdminPending({
  order,
}: OrderAdminPendingProps) {
  const needsEdit = parseOrderStatus(order.status) === "NEEDS_CLIENT_EDIT";

  return (
    <section
      className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
      dir="rtl"
    >
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-700">
            {needsEdit ? (
              <PencilLine className="h-6 w-6" />
            ) : (
              <Clock className="h-6 w-6 animate-pulse" />
            )}
          </div>

          <div className="space-y-2 max-w-md">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
                needsEdit
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-neutral-200 bg-neutral-50 text-neutral-700"
              }`}
            >
              {needsEdit ? "نیاز به ویرایش درخواست" : "در حال بررسی توسط تیم جار"}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              {needsEdit
                ? "لطفاً جزئیات پروژه را اصلاح کنید"
                : `درخواست «${order.categoryTitle || "پروژه"}» ثبت شد`}
            </h1>

            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed font-medium">
              {needsEdit
                ? "کارشناسان جار از شما خواسته‌اند قبل از انتشار برای متخصصان، اطلاعات را اصلاح کنید."
                : "سفارش‌های کامل معمولاً سریع منتشر می‌شوند؛ این مورد برای کنترل کیفیت توسط تیم جار در صف بررسی است."}
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
              ? "زمان منعطف"
              : order.bookingDate || "تاریخ مشخص"}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200">
            <Clock className="h-3 w-3" />
            {order.durationHours} ساعت
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 max-w-[200px] truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{locationLabel(order)}</span>
          </span>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-[11px] text-neutral-600 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            تا قبل از تایید و انتشار، متخصصی پروژه را نمی‌بیند. از نوار پایین صفحه می‌توانید رزرو را لغو کنید.
          </span>
        </div>
      </div>
    </section>
  );
}
