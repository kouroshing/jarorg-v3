"use client";

import Link from "next/link";
import {
  Calendar,
  Phone,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { SUPPORT_PHONE_TEL } from "@/lib/support/contact";

export function HeroSection({
  coverageCount = 0,
  specialistCount = 0,
}: {
  coverageCount?: number;
  specialistCount?: number;
}) {
  const coverageHint =
    specialistCount > 0
      ? `پوشش زنده ${specialistCount.toLocaleString("fa-IR")} متخصص فعال روی نقشه`
      : "پوشش واقعی متخصصان به‌زودی روی نقشه";

  return (
    <section
      className="relative w-full min-h-[calc(100dvh-5rem)] md:min-h-[calc(100dvh-6rem)] flex flex-col items-center justify-center text-center px-4 sm:px-8 lg:px-12 py-10 sm:py-16"
      dir="rtl"
    >
      <div className="relative z-10 max-w-3xl mx-auto w-full space-y-6 sm:space-y-8 flex flex-col items-center justify-center">
        <div className="flex justify-center">
          <div className="relative inline-flex items-center justify-center">
            <span className="relative inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-jar-border/80 bg-jar-surface/90 px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-medium text-jar-primary backdrop-blur-md shadow-xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jar-logo opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-jar-logo" />
              </span>
              <span className="tracking-tight text-center">{coverageHint}</span>
            </span>
          </div>
        </div>

        <div className="relative max-w-2xl mx-auto space-y-4 sm:space-y-5">
          <div className="absolute -inset-x-10 -inset-y-6 -z-10 rounded-[2rem] bg-[#F7F5F0]/80 blur-2xl pointer-events-none sm:-inset-x-16 sm:-inset-y-10" />

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[4rem] font-black tracking-tight leading-[1.2] sm:leading-[1.15] text-jar-primary text-balance">
            رزرو مستقیم{" "}
            <span className="text-jar-logo font-black">عکاس و تصویربردار</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-jar-muted leading-relaxed sm:leading-loose max-w-xl mx-auto text-balance">
            {coverageCount > 0
              ? "دایره‌ها همان محدوده‌ای هستند که متخصصان فعال برای پروژه‌ها مشخص کرده‌اند — واقعی، نه تزئینی."
              : "دسترسی سریع به عکاسان و تصویربرداران حرفه‌ای با ضمانت کیفیت و برآورد آنی قیمت."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto pt-1 sm:pt-2">
          <Link
            href="/order"
            className="group inline-flex h-12 sm:h-13 w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white px-6 sm:px-8 text-xs sm:text-sm md:text-base font-medium shadow-none transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Calendar className="h-4.5 w-4.5 shrink-0 text-white" />
            <span>ثبت سفارش در محدوده پوشش</span>
            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
          </Link>

          <a
            href={SUPPORT_PHONE_TEL}
            className="inline-flex h-12 sm:h-13 w-full sm:w-auto items-center justify-center gap-2.5 rounded-full border border-jar-border bg-jar-surface/95 text-jar-primary px-6 sm:px-8 text-xs sm:text-sm md:text-base font-medium shadow-xs hover:bg-jar-soft transition-colors duration-200 cursor-pointer backdrop-blur-md whitespace-nowrap shrink-0"
          >
            <Phone className="h-4.5 w-4.5 shrink-0 text-jar-primary" />
            <span>مشاوره تلفنی رایگان</span>
          </a>
        </div>
      </div>

      <div className="absolute bottom-20 sm:bottom-22 md:bottom-6 inset-x-0 flex justify-center pointer-events-auto z-20">
        <a
          href="#details"
          className="group inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-full border border-jar-border bg-jar-surface/95 hover:bg-jar-soft px-5 text-xs sm:text-sm font-medium text-jar-primary shadow-xs transition-colors duration-200 cursor-pointer backdrop-blur-md"
        >
          <span>مشاهده بیشتر</span>
          <ChevronDown className="w-3.5 h-3.5 text-jar-muted animate-bounce" />
        </a>
      </div>
    </section>
  );
}
