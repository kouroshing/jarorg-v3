"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Radio, Sparkles, Users } from "lucide-react";
import {
  ApplicantSpecialistView,
  getOrderApplicantsForClientAction,
} from "@/app/actions/marketplaceActions";
import OrderMatchingRadar from "./OrderMatchingRadar";
import OrderApplicantsList from "./OrderApplicantsList";
import { isOnMarket, parseOrderStatus } from "@/lib/orders/status";

const SEARCH_LINES = [
  "درخواست برای متخصصان واجد شرایط ارسال شد",
  "رادار جار در محدوده پروژه روشن است",
  "به محض اعلام آمادگی، کارت متخصص اینجا ظاهر می‌شود",
];

function faNum(value: number): string {
  return value.toLocaleString("fa-IR");
}

interface OrderMatchingStageProps {
  orderId: string;
  categoryTitle: string;
  categorySlug?: string | null;
  districtOrCity?: string | null;
  orderStatus: string;
  initialApplicants: ApplicantSpecialistView[];
  isOwnerOrAdmin: boolean;
  selectedSpecialistId?: string | null;
  agreedTotalPrice?: number | null;
  clientIsFlexible?: boolean;
  clientBookingDate?: string | null;
  clientTimeSlot?: string | null;
  clientLocationType?: string | null;
  clientPhotoLocationId?: string | null;
}

export default function OrderMatchingStage({
  orderId,
  categoryTitle,
  categorySlug,
  districtOrCity,
  orderStatus,
  initialApplicants,
  isOwnerOrAdmin,
  selectedSpecialistId,
  agreedTotalPrice,
  clientIsFlexible = false,
  clientBookingDate = null,
  clientTimeSlot = null,
  clientLocationType = null,
  clientPhotoLocationId = null,
}: OrderMatchingStageProps) {
  const router = useRouter();
  const [applicants, setApplicants] = useState(initialApplicants);
  const [status, setStatus] = useState(orderStatus);
  const [lineIndex, setLineIndex] = useState(0);
  const previousCount = useRef(initialApplicants.length);
  const [justFound, setJustFound] = useState(false);

  useEffect(() => {
    setApplicants(initialApplicants);
    setStatus(orderStatus);
  }, [initialApplicants, orderStatus]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % SEARCH_LINES.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isOwnerOrAdmin) return;

    let cancelled = false;

    const poll = async () => {
      const res = await getOrderApplicantsForClientAction(orderId);
      if (cancelled || !res.success) return;

      const next = res.applicants ?? [];
      if (next.length > previousCount.current) {
        setJustFound(true);
        window.setTimeout(() => setJustFound(false), 2400);
      }
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
    <section className="relative overflow-hidden rounded-[32px] border border-jar-border bg-jar-surface shadow-xs" dir="rtl">
      <div className="pointer-events-none absolute -top-28 -left-20 h-72 w-72 rounded-full bg-jar-logo/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />

      <div className="relative z-10 space-y-8 p-6 sm:p-9">
        <div className="flex flex-col items-center text-center gap-5">
          <OrderMatchingRadar size={220} foundCount={foundCount} />

          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-jar-logo/25 bg-jar-logo/10 px-3 py-1 text-[11px] font-bold text-jar-logo">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jar-logo opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-jar-logo" />
              </span>
              {waiting ? "صفحه انتظار فعال است" : `${faNum(foundCount)} متخصص اعلام آمادگی کردند`}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-jar-primary tracking-tight">
              {waiting
                ? `در حال پیدا کردن متخصص برای ${categoryTitle}`
                : "متخصصان آماده بررسی هستند"}
            </h1>

            <AnimatePresence mode="wait">
              <motion.p
                key={waiting ? lineIndex : "found"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="text-xs sm:text-sm text-jar-muted font-medium leading-relaxed"
              >
                {waiting
                  ? SEARCH_LINES[lineIndex]
                  : "یکی را انتخاب کنید. بعد از انتخاب، پروژه با پرداخت شما قطعی می‌شود."}
              </motion.p>
            </AnimatePresence>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-medium text-jar-muted">
              {districtOrCity && (
                <span className="inline-flex items-center gap-1 rounded-full border border-jar-border bg-jar-canvas px-2.5 py-1">
                  <MapPin className="h-3 w-3 text-jar-logo" />
                  {districtOrCity}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-jar-border bg-jar-canvas px-2.5 py-1">
                <Radio className="h-3 w-3 text-jar-logo" />
                {parsed === "HAS_APPLICANTS" ? "پیشنهادها رسیده" : "منتشرشده برای متخصصان"}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {justFound && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800"
              >
                <Sparkles className="h-4 w-4" />
                متخصص جدیدی اعلام آمادگی کرد
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {waiting ? (
          <div className="rounded-3xl border border-dashed border-jar-border bg-jar-canvas/70 p-6 text-center space-y-2">
            <Users className="mx-auto h-6 w-6 text-jar-logo" />
            <p className="text-sm font-bold text-jar-primary">هنوز کسی اعلام آمادگی نکرده</p>
            <p className="text-xs text-jar-muted leading-relaxed max-w-md mx-auto">
              این صفحه خودش به‌روز می‌شود. لازم نیست دوباره ثبت کنید یا از صفحه خارج شوید.
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </section>
  );
}
