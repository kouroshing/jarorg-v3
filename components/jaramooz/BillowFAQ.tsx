"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "آیا برای شرکت در دوره نیاز به دوربین حرفه‌ای دارم؟",
    a: "خیر! فصل دوم دوره به طور کامل به موبایلگرافی پیشرفته و تنظیمات دستی Manual اختصاص دارد. شما بدون داشتن دوربین و فقط با یک گوشی هوشمند می‌توانید پروژه‌های واقعی اجرا کرده و از درآمد حاصل از آن‌ها دوربین تهیه کنید.",
  },
  {
    q: "دوره چگونه برگزار می‌شود و تا چه زمانی به ویدیوها دسترسی دارم؟",
    a: "تمامی ویدیوها با کیفیت سینمایی 4K ضبط شده و بلافاصله پس از ثبت‌نام در پنل کاربری شما فعال می‌شوند. دسترسی شما به محتوای دوره دائمی و نامحدود است و آپدیت‌های آینده را نیز رایگان دریافت خواهید کرد.",
  },
  {
    q: "چگونه بعد از دوره از طریق پلتفرم جار پروژه دریافت می‌کنم؟",
    a: "هنرجویان برتر دوره در پلتفرم کشوری «جار» به عنوان متخصص تاییدشده ثبت می‌شوند و در اولویت ارجاع سفارش‌های عکاسی صنعتی، تبلیغاتی و محصول برندها قرار می‌گیرند.",
  },
  {
    q: "آیا نمونه قراردادها و فایل‌های تمرینی هم ارائه می‌شود؟",
    a: "بله، در بخش بونوس دوره، قالب خام قرارداد رسمی عکاسی (قابل ویرایش در Word)، چک‌لیست تجهیزات روز آفیش، مودبوردهای آماده و پالت‌های رنگی برای دانلود قرار داده شده است.",
  },
];

export default function BillowFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-3 mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-3.5 py-1 text-xs font-bold text-slate-700">
          <HelpCircle className="h-3.5 w-3.5 text-[#006097]" />
          سوالات متداول
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          پاسخ به سوالات پرتکرار هنرجویان
        </h2>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md overflow-hidden transition-all shadow-2xs hover:border-[#006097]/30"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between p-5 text-right font-bold text-xs sm:text-sm text-slate-800 hover:bg-slate-50/50 transition-colors gap-4"
              >
                <span>{item.q}</span>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-[#006097] shrink-0" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-slate-200/50 bg-slate-50/40"
                  >
                    <p className="p-5 text-xs text-slate-600 leading-relaxed font-medium">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
