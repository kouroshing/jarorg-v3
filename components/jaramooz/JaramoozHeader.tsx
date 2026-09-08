"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ArrowRight,
  Sliders,
  Calculator,
  Film,
  UserCheck,
  HelpCircle,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import JaramoozLogo from "@/components/JaramoozLogo";
import { useJarAmoozPurchaseModal } from "@/components/jaramooz/JarAmoozPurchaseContext";

type Props = {
  isPurchased: boolean;
  session: any;
  courseId?: string;
};

export default function JaramoozHeader({ isPurchased, session, courseId }: Props) {
  const { openPurchaseModal } = useJarAmoozPurchaseModal();
  const [isOpen, setIsOpen] = useState(false);

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    openPurchaseModal({
      courseId: courseId || "photography-masterclass",
      title: "مسترکلاس ۱۰۰ روزه عکاسی",
      price: 9100000,
      initialPhone: session?.phone || "",
    });
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const navItems = [
    { label: "مقایسه دوره", href: "#comparison", icon: Sliders, desc: "تفاوت جارآموز با دوره‌های بازار" },
    { label: "محاسبه درآمد", href: "#calculator", icon: Calculator, desc: "تخمین درآمد ماه اول و بازگشت سرمایه" },
    { label: "درباره مدرس", href: "#instructor", icon: UserCheck, desc: "رزومه و پروژه‌های کوروش اینگ" },
    { label: "سوالات متداول", href: "#faq", icon: HelpCircle, desc: "پاسخ به سوالات و ابهامات شما" },
    { label: "متخصص شو", href: "/join", icon: Sparkles, desc: "ثبت‌نام رایگان به عنوان عکاس و فیلمبردار", isDirectLink: true },
  ];

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-full border border-white/80 bg-white/70 px-4 sm:px-6 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] relative z-50">
        
        {/* Right Side: Logo (Both Mobile & Desktop) */}
        <div className="flex items-center gap-2.5">
          <Link href="/jaramooz" className="flex items-center gap-2 sm:gap-2.5 group">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105">
              <JaramoozLogo className="w-full h-full" />
            </div>
            <span className="text-sm font-black tracking-tight text-slate-900 sm:text-base">
              جارآموز
            </span>
          </Link>
        </div>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-600">
          <a href="#comparison" className="hover:text-[#006097] transition-colors">مقایسه</a>
          <a href="#calculator" className="hover:text-[#006097] transition-colors">محاسبه درآمد</a>
          <a href="#instructor" className="hover:text-[#006097] transition-colors">مدرس</a>
          <a href="#faq" className="hover:text-[#006097] transition-colors">سوالات</a>
          <Link href="/join" className="hover:text-[#006097] transition-colors">متخصص شو</Link>
        </nav>

        {/* Left Side: Actions on Desktop & Mobile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {!isPurchased && (
            <button
              type="button"
              onClick={handleRegisterClick}
              className="hidden sm:inline-flex h-8 items-center justify-center rounded-full bg-[#006097] px-3.5 text-[11px] font-black text-white shadow-xs hover:bg-[#056297] transition-all hover:scale-105 cursor-pointer"
            >
              ثبت‌نام مسترکلاس
            </button>
          )}

          <Link
            href="/"
            className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-all hover:text-slate-900 shadow-2xs"
          >
            <span>ورود به جار</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {session && (
            <Link
              href="/profile"
              className="hidden sm:inline-flex h-8 items-center justify-center rounded-full bg-slate-900 px-3.5 text-[11px] font-bold text-white shadow-xs hover:bg-slate-800 transition-all"
            >
              پنل کاربری
            </Link>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-700 shadow-2xs hover:bg-slate-100 transition-all duration-300 ease-out active:scale-[0.98] shrink-0"
            aria-label="منوی ناوبری"
          >
            {isOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Animated Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Floating Glassmorphic Menu Box */}
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="absolute inset-x-4 top-16 z-50 mx-auto max-w-lg rounded-[28px] border border-white/90 bg-white/95 p-5 shadow-[0_20px_50px_rgba(0,96,151,0.16)] backdrop-blur-2xl md:hidden max-h-[calc(100dvh-5rem)] overflow-y-auto"
            >
              <div className="space-y-4">
                
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#006097]" />
                    <span>فهرست بخش‌های دوره</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    ظرفیت محدود
                  </span>
                </div>

                {/* Nav items list */}
                <div className="space-y-1.5">
                  {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={idx}
                        href={item.href}
                        onClick={handleLinkClick}
                        className="flex items-center justify-between rounded-2xl p-2.5 text-slate-700 hover:bg-sky-50/70 hover:text-[#006097] transition-all group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-[#006097] group-hover:text-white transition-colors">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-right">
                            <span className="block text-xs font-black text-slate-900 group-hover:text-[#006097]">
                              {item.label}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-medium">
                              {item.desc}
                            </span>
                          </div>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-slate-400 group-hover:text-[#006097] transition-transform group-hover:-translate-x-0.5" />
                      </Link>
                    );
                  })}
                </div>

                {/* Bottom Actions for Mobile */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  {!isPurchased && (
                    <button
                      type="button"
                      onClick={handleRegisterClick}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:bg-emerald-700 transition-all active:scale-98 cursor-pointer"
                    >
                      <span>ثبت‌نام مستقیم و شروع مسترکلاس</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <div className={`grid ${session ? "grid-cols-2" : "grid-cols-1"} gap-2 pt-1`}>
                    <Link
                      href="/"
                      onClick={handleLinkClick}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-all"
                    >
                      <span>صفحه اصلی جار</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>

                    {session && (
                      <Link
                        href="/profile"
                        onClick={handleLinkClick}
                        className="flex h-9 items-center justify-center rounded-xl bg-slate-900 text-[11px] font-bold text-white shadow-xs hover:bg-slate-800 transition-all"
                      >
                        داشبورد کاربری
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
