"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
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

interface OrderClientWaitingProps {
  orderId: string;
  categoryTitle: string;
  categorySlug?: string | null;
  orderStatus: string;
  initialApplicants: ApplicantSpecialistView[];
  isOwnerOrAdmin: boolean;
  selectedSpecialistId?: string | null;
  agreedTotalPrice?: number | null;
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
}: OrderClientWaitingProps) {
  const router = useRouter();
  const [applicants, setApplicants] = useState(initialApplicants);
  const [status, setStatus] = useState(orderStatus);
  const previousCount = useRef(initialApplicants.length);

  useEffect(() => {
    setApplicants(initialApplicants);
    setStatus(orderStatus);
  }, [initialApplicants, orderStatus]);

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

  return (
    <section className="space-y-6" dir="rtl">
      {waiting ? (
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
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
          />
        </>
      )}
    </section>
  );
}
