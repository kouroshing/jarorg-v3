"use client";

import React from "react";
import { motion } from "framer-motion";
import OrderMatchingRadar from "./OrderMatchingRadar";

export default function OrderSubmitWaiting({ categoryTitle }: { categoryTitle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-jar-canvas/92 backdrop-blur-xl px-6"
      dir="rtl"
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-jar-logo/20 blur-3xl" />
      <div className="relative z-10 flex max-w-md flex-col items-center text-center gap-5">
        <OrderMatchingRadar size={200} />
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-jar-logo">پروژه ثبت شد</p>
          <h2 className="text-xl font-black text-jar-primary leading-snug">
            در حال ارسال درخواست {categoryTitle} به متخصصان
          </h2>
          <p className="text-xs text-jar-muted leading-relaxed">
            صفحه انتظار الان باز می‌شود. هر متخصصی اعلام آمادگی کند، همان‌جا می‌بینید.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
