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
import CancelOrderButton from "./CancelOrderButton";
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
  isOwnerOrAdmin,
}: OrderAdminPendingProps) {
  const needsEdit = parseOrderStatus(order.status) === "NEEDS_CLIENT_EDIT";

  return (
    <section
      className="rounded-[32px] border border-jar-border bg-jar-surface shadow-xs overflow-hidden"
      dir="rtl"
    >
      <div className="p-6 sm:p-9 space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-jar-logo/10 border border-jar-logo/25 text-jar-logo">
            {needsEdit ? (
              <PencilLine className="h-7 w-7" />
            ) : (
              <Clock className="h-7 w-7 animate-pulse" />
            )}
          </div>

          <div className="space-y-2 max-w-md">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
                needsEdit
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-jar-logo/25 bg-jar-logo/10 text-jar-logo"
              }`}
            >
              {needsEdit ? "نیاز به ویرایش درخواست" : "در حال بررسی توسط تیم جار"}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-jar-primary tracking-tight">
              {needsEdit
                ? "لطفاً جزئیات پروژه را اصلاح کنید"
                : `درخواست «${order.categoryTitle || "پروژه"}» ثبت شد`}
            </h1>

            <p className="text-xs sm:text-sm text-jar-muted leading-relaxed font-medium">
              {needsEdit
                ? "کارشناسان جار از شما خواسته‌اند قبل از انتشار برای متخصصان، اطلاعات را اصلاح کنید."
                : "پس از تایید تیم جار، پروژه برای متخصصان واجد شرایط منتشر می‌شود."}
            </p>
          </div>
        </div>

        {needsEdit && order.adminNote && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex gap-3 text-right">
            <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-black text-amber-950">پیام تیم جار</p>
              <p className="text-xs text-amber-900/90 leading-relaxed font-medium whitespace-pre-wrap">
                {order.adminNote}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-jar-muted">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-jar-canvas border border-jar-border">
            <Calendar className="h-3 w-3" />
            {order.isFlexibleSchedule
              ? "زمان منعطف"
              : order.bookingDate || "تاریخ مشخص"}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-jar-canvas border border-jar-border">
            <Clock className="h-3 w-3" />
            {order.durationHours} ساعت
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-jar-canvas border border-jar-border max-w-[200px] truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{locationLabel(order)}</span>
          </span>
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-jar-border bg-jar-canvas/60 px-3.5 py-3 text-[11px] text-jar-muted font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            تا قبل از تایید و انتشار، متخصصی پروژه را نمی‌بیند. می‌توانید در این مرحله درخواست را لغو کنید.
          </span>
        </div>

        <div className="max-w-sm mx-auto w-full">
          <CancelOrderButton
            orderId={order.id}
            orderStatus={order.status}
            isOwnerOrAdmin={isOwnerOrAdmin}
          />
        </div>
      </div>
    </section>
  );
}
