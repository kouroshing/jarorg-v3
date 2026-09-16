"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio, Timer, UserRound } from "lucide-react";
import {
  ApplicantSpecialistView,
  getOrderApplicantsForClientAction,
} from "@/app/actions/marketplaceActions";
import OrderMatchingRadar from "./OrderMatchingRadar";
import OrderApplicantsList from "./OrderApplicantsList";
import { isOnMarket, parseOrderStatus } from "@/lib/orders/status";

function faNum(value: number): string {
  return value.toLocaleString("fa-IR");
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

/** Typical time until first specialist applies — progress bar only. */
const AVG_MATCH_WAIT_MS = 6 * 60 * 60 * 1000;

interface OrderClientWaitingProps {
  orderId: string;
  categoryTitle: string;
  categorySlug?: string | null;
  orderStatus: string;
  initialApplicants: ApplicantSpecialistView[];
  isOwnerOrAdmin: boolean;
  selectedSpecialistId?: string | null;
  agreedTotalPrice?: number | null;
  createdAt?: string | null;
  clientIsFlexible?: boolean;
  clientBookingDate?: string | null;
  clientTimeSlot?: string | null;
  clientLocationType?: string | null;
  clientPhotoLocationId?: string | null;
}

/**
 * Waiting surface after publish: radar + applicants.
 * Cancel lives in the order header menu (not a sticky red bar).
 */
export default function OrderClientWaiting({
  orderId,
  categoryTitle,
  categorySlug,
  orderStatus,
  initialApplicants,
  isOwnerOrAdmin,
  selectedSpecialistId,
  agreedTotalPrice,
  createdAt,
  clientIsFlexible = false,
  clientBookingDate = null,
  clientTimeSlot = null,
  clientLocationType = null,
  clientPhotoLocationId = null,
}: OrderClientWaitingProps) {
  const router = useRouter();
  const [applicants, setApplicants] = useState(initialApplicants);
  const [status, setStatus] = useState(orderStatus);
  const previousCount = useRef(initialApplicants.length);
  const createdMs = createdAt ? new Date(createdAt).getTime() : Date.now();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setApplicants(initialApplicants);
    setStatus(orderStatus);
  }, [initialApplicants, orderStatus]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isOwnerOrAdmin) return;

    let cancelled = false;

    const poll = async () => {
      const res = await getOrderApplicantsForClientAction(orderId);
      if (cancelled || !res.success) return;

      const next = res.applicants ?? [];
      previousCount.current = next.length;
      setApplicants(next);

      if (res.orderStatus) {
        setStatus(res.orderStatus);
        if (!isOnMarket(res.orderStatus)) {
          router.refresh();
        }
      }
    };

    const interval = window.setInterval(poll, 7000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isOwnerOrAdmin, orderId, router]);

  const foundCount = applicants.filter((a) => a.status !== "WITHDRAWN").length;
  const waiting = foundCount === 0;
  const parsed = parseOrderStatus(status);
  const elapsed = Math.max(0, now - createdMs);
  const progressPct = Math.min(100, Math.round((elapsed / AVG_MATCH_WAIT_MS) * 100));
  const avgHoursLabel = (AVG_MATCH_WAIT_MS / (60 * 60 * 1000)).toLocaleString("fa-IR");

  return (
    <section className="space-y-6" dir="rtl">
      {waiting ? (
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-neutral-200/40 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center text-center gap-5 p-6 sm:p-8">
            <OrderMatchingRadar size={200} foundCount={foundCount} />

            <div className="space-y-2.5 max-w-md">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-bold text-neutral-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                در انتظار اعلام آمادگی متخصصان
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                در حال پیدا کردن متخصص برای {categoryTitle}
              </h1>

              <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                پروژه شما برای متخصصان واجد شرایط ارسال شد. همین صفحه به‌روز می‌شود.
              </p>

              <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-500">
                <Radio className="h-3 w-3 text-neutral-400" />
                {parsed === "HAS_APPLICANTS" ? "پیشنهادها رسیده" : "منتشرشده برای متخصصان"}
              </div>
            </div>

            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-3 text-right">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700">
                    <Timer className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-black text-neutral-900">میانگین زمان تا اولین پیشنهاد</p>
                    <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                      معمولاً کمتر از {avgHoursLabel} ساعت طول می‌کشد تا اولین متخصص اعلام آمادگی کند.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-left tabular-nums" dir="ltr">
                  <p className="text-[10px] font-bold text-neutral-400">از انتشار</p>
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
            </div>

            <div className="flex w-full max-w-md flex-col sm:flex-row gap-2.5">
              <Link
                href="/profile"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
              >
                <UserRound className="h-4 w-4" />
                ورود به پروفایل / پروژه‌ها
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 text-center sm:text-right">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-bold text-neutral-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {`${faNum(foundCount)} متخصص اعلام آمادگی کردند`}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              یکی از متخصصان را انتخاب کنید
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
              نمونه‌کارها را مقایسه کنید؛ بعد از انتخاب، مرحله پرداخت باز می‌شود.
            </p>
          </div>

          <OrderApplicantsList
            orderId={orderId}
            orderStatus={status}
            initialApplicants={applicants}
            isOwnerOrAdmin={isOwnerOrAdmin}
            selectedSpecialistId={selectedSpecialistId}
            agreedTotalPrice={agreedTotalPrice}
            categoryTitle={categoryTitle}
            categorySlug={categorySlug}
            clientIsFlexible={clientIsFlexible}
            clientBookingDate={clientBookingDate}
            clientTimeSlot={clientTimeSlot}
            clientLocationType={clientLocationType}
            clientPhotoLocationId={clientPhotoLocationId}
          />
        </>
      )}
    </section>
  );
}
