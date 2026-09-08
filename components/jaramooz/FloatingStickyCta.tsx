"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowLeft, Play, Lock } from "lucide-react";
import JaramoozLogo from "@/components/JaramoozLogo";
import PurchaseButtonWrapper from "@/app/jaramooz/courses/[id]/PurchaseButtonWrapper";

interface FloatingStickyCtaProps {
  courseId?: string;
  isPurchased?: boolean;
  isLoggedIn?: boolean;
  phone?: string;
  price?: number;
  formattedPrice?: string;
}

export default function FloatingStickyCta({
  courseId = "cm5jaramoozmasterclass0001",
  isPurchased = false,
  isLoggedIn = false,
  phone = "",
  price = 9100000,
  formattedPrice = "۹,۱۰۰,۰۰۰ تومان",
}: FloatingStickyCtaProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when user scrolls down past 420px (past the hero fold)
      if (window.scrollY > 420) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isPurchased) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-3 inset-x-0 z-40 px-3 sm:px-6 pointer-events-none"
        >
          <div className="relative mx-auto max-w-4xl rounded-2xl sm:rounded-full border border-white/80 bg-white/75 backdrop-blur-2xl backdrop-saturate-150 p-2.5 sm:py-2.5 sm:px-6 shadow-[0_12px_40px_rgba(0,96,151,0.14),0_2px_10px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.9)] pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-3 overflow-hidden">
            
            {/* Subtle Inner Ambient Frosted Tint */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-[#006097]/5 to-white/40 pointer-events-none -z-10" />
            
            {/* Left Info: Title & Guarantee (Desktop + Mobile) */}
            <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 text-right">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 shrink-0 rounded-xl sm:rounded-full bg-white/90 border border-slate-200/80 p-1.5 flex items-center justify-center shadow-xs">
                  <JaramoozLogo className="w-full h-full" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                      مسترکلاس ۱۰۰ روزه عکاسی تجاری
                    </span>
                    <span className="hidden md:inline-flex rounded-md bg-amber-100 text-amber-900 px-1.5 py-0.2 text-[10px] font-extrabold border border-amber-200">
                      ظرفیت محدود
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>ضمانت ۱۰۰٪ بازگشت وجه تا ۷ روز + دسترسی دائمی</span>
                  </span>
                </div>
              </div>

              {/* Mobile Price Display */}
              <div className="sm:hidden text-left shrink-0">
                <span className="text-[10px] text-slate-400 block">شهریه دوره</span>
                <span className="text-xs font-black text-[#006097] font-mono">{formattedPrice}</span>
              </div>
            </div>

            {/* Right Action: Price Tag & One-Click CTA */}
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0">
              {/* Desktop Price */}
              <div className="hidden sm:block text-left pl-2">
                <span className="text-[10px] text-slate-400 block font-medium">سرمایه‌گذاری دوره</span>
                <span className="text-sm font-black text-[#006097] font-mono">{formattedPrice}</span>
              </div>

              {/* Direct Purchase Button */}
              <div className="w-full sm:w-auto shrink-0 min-w-[200px]">
                <PurchaseButtonWrapper
                  courseId={courseId}
                  isLoggedIn={isLoggedIn}
                  initialPhone={phone}
                  customText="ثبت‌نام در مسترکلاس"
                  className="h-10 sm:h-11 px-5 rounded-xl sm:rounded-full text-xs font-black shadow-md shadow-[#006097]/25"
                />
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
