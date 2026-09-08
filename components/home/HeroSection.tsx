"use client";

import Link from "next/link";
import {
  Calendar,
  Phone,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

export function HeroSection() {
  return (
    <section 
      className="relative w-full min-h-[calc(100dvh-5rem)] md:min-h-[calc(100dvh-6rem)] flex flex-col items-center justify-center text-center px-4 sm:px-8 lg:px-12 py-10 sm:py-16" 
      dir="rtl"
    >
      <div className="relative z-10 max-w-3xl mx-auto w-full space-y-6 sm:space-y-8 flex flex-col items-center justify-center">
        
        {/* Top Pill Tag */}
        <div className="flex justify-center">
          <div className="relative inline-flex items-center justify-center">
            <span className="relative inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-jar-border bg-jar-surface/95 px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-medium text-jar-primary backdrop-blur-xl shadow-xs transition-transform hover:scale-[1.01]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jar-logo opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-jar-logo" />
              </span>
              <span className="tracking-tight text-center">
                پلتفرم هوشمند رزرو مستقیم عکاس و تصویربردار
              </span>
            </span>
          </div>
        </div>

        {/* Mega Headline & Balanced Subtitle */}
        <div className="relative max-w-2xl mx-auto space-y-4 sm:space-y-5">
          {/* Luminous Soft White Halo Behind Headline for Supreme Legibility */}
          <div className="absolute -inset-x-12 -inset-y-8 -z-10 rounded-full bg-jar-surface/75 blur-2xl pointer-events-none" />

          <div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[4rem] font-black tracking-tight leading-[1.2] sm:leading-[1.15] text-jar-primary text-balance">
              رزرو مستقیم{" "}
              <span className="text-jar-logo font-black">
                عکاس و تصویربردار
              </span>
            </h1>
          </div>

          <div>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-jar-muted leading-relaxed sm:leading-loose max-w-xl mx-auto text-balance">
              دسترسی سریع به عکاسان و تصویربرداران حرفه‌ای با ضمانت کیفیت و برآورد آنی قیمت در جار.
            </p>
          </div>
        </div>

        {/* CTA Buttons with Symmetrical Proportion */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto pt-1 sm:pt-2">
          <Link
            href="/order"
            className="group inline-flex h-12 sm:h-13 w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white px-6 sm:px-8 text-xs sm:text-sm md:text-base font-medium shadow-none transition-colors duration-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Calendar className="h-4.5 w-4.5 shrink-0 text-white" />
            <span>ثبت هوشمند سفارش با بودجه دلخواه</span>
            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
          </Link>

          <a
            href="tel:09100138383"
            className="inline-flex h-12 sm:h-13 w-full sm:w-auto items-center justify-center gap-2.5 rounded-full border border-jar-border bg-jar-surface text-jar-primary px-6 sm:px-8 text-xs sm:text-sm md:text-base font-medium shadow-xs hover:bg-jar-soft transition-colors duration-200 cursor-pointer backdrop-blur-md whitespace-nowrap shrink-0"
          >
            <Phone className="h-4.5 w-4.5 shrink-0 text-jar-primary" />
            <span>مشاوره تلفنی رایگان (۰۹۱۰۰۱۳۸۳۸۳)</span>
          </a>
        </div>
      </div>

      {/* Scroll-Down Cue Button (مشاهده بیشتر) - Absolute bottom */}
      <div className="absolute bottom-20 sm:bottom-22 md:bottom-6 inset-x-0 flex justify-center pointer-events-auto z-20">
        <a
          href="#details"
          className="group inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-full border border-jar-border bg-jar-surface hover:bg-jar-soft px-5 text-xs sm:text-sm font-medium text-jar-primary shadow-xs transition-colors duration-200 cursor-pointer"
        >
          <span>مشاهده بیشتر</span>
          <ChevronDown className="w-3.5 h-3.5 text-jar-muted animate-bounce" />
        </a>
      </div>
    </section>
  );
}
