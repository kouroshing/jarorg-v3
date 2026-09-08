"use client";

import React from "react";
import { motion } from "framer-motion";
import { XCircle, CheckCircle2, Sparkles, ArrowLeft } from "lucide-react";

export default function BillowComparison() {
  return (
    <div className="w-full space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-3.5 py-1 text-xs font-bold text-slate-700">
          <Sparkles className="h-3.5 w-3.5 text-[#006097]" />
          تفاوت رویکرد جارآموز
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          چرا بیشتر عکاس‌ها با وجود داشتن دوربین، <span className="text-red-500">درآمد ندارند؟</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          مقایسه مسیر آزمون‌وخطا با یک نقشه راه عملی ۱۰۰ روزه.
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Seamless Soft Blue Ambient Halos behind comparison grid */}
        <div className="absolute -inset-x-12 -inset-y-16 -z-10 pointer-events-none overflow-visible">
          <div 
            className="absolute -top-20 -left-20 w-[450px] sm:w-[650px] h-[350px] sm:h-[480px] rounded-full blur-[85px] sm:blur-[120px] pointer-events-none will-change-transform"
            style={{
              background: "radial-gradient(ellipse at center, rgba(56,189,248,0.26) 0%, rgba(0,128,255,0.12) 35%, rgba(0,128,255,0.03) 55%, rgba(255,255,255,0) 70%)"
            }}
          />
          <div 
            className="absolute -top-24 -right-20 w-[450px] sm:w-[650px] h-[350px] sm:h-[480px] rounded-full blur-[85px] sm:blur-[120px] pointer-events-none will-change-transform"
            style={{
              background: "radial-gradient(ellipse at center, rgba(34,211,238,0.24) 0%, rgba(56,189,248,0.12) 35%, rgba(56,189,248,0.03) 55%, rgba(255,255,255,0) 70%)"
            }}
          />
        </div>
        
        {/* The Old / Traditional Way */}
        <div className="rounded-[28px] border border-slate-200 bg-white/50 backdrop-blur-md p-6 sm:p-8 space-y-6 opacity-85">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-700">روش سنتی و آزمون‌و‌خطا</h3>
              <span className="text-xs text-slate-400">سردرگمی و بدون استراتژی درآمدی</span>
            </div>
            <span className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
              ✕
            </span>
          </div>

          <ul className="space-y-3.5 text-xs text-slate-600">
            <li className="flex items-start gap-2.5">
              <XCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
              <span>هزینه‌های ۳۰ تا ۱۰۰ میلیون تومانی برای تجهیزات بدون داشتن حتی یک مشتری واقعی</span>
            </li>
            <li className="flex items-start gap-2.5">
              <XCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
              <span>ترس از قیمت دادن و پذیرفتن پروژه‌های ارزان ۲-۳ میلیونی</span>
            </li>
            <li className="flex items-start gap-2.5">
              <XCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
              <span>آموزش‌های طولانی و تئوری بدون تمرین پروژه‌محور در بازار کار واقعی</span>
            </li>
            <li className="flex items-start gap-2.5">
              <XCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
              <span>از دست دادن کارفرما بعد از اعلام قیمت و نداشتن قرارداد رسمی و استاندارد</span>
            </li>
          </ul>
        </div>

        {/* The JarAmooz Masterclass Way */}
        <div className="relative rounded-[28px] border border-[#006097]/40 bg-gradient-to-b from-[#006097]/5 via-white/80 to-white/95 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-lg shadow-[#006097]/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#006097] via-cyan-400 to-[#006097]" />
          
          <div className="flex items-center justify-between border-b border-[#006097]/20 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#006097]">مسترکلاس ۱۰۰ روزه جارآموز</h3>
              <span className="text-xs text-slate-500 font-medium">نقشه راه ورود به پروژه‌های حرفه‌ای و پردرآمد</span>
            </div>
            <span className="h-8 w-8 rounded-full bg-[#006097] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ✓
            </span>
          </div>

          <ul className="space-y-3.5 text-xs text-slate-700 font-semibold">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-[#006097] shrink-0 mt-0.5" />
              <span>شروع حتی بدون دوربین و یادگیری اصول نورپردازی و عکاسی حرفه‌ای</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-[#006097] shrink-0 mt-0.5" />
              <span>نقشه راه و فرمول قیمت‌گذاری پروژه‌هایی با دستمزد ۱۵ تا ۵۰ میلیون تومان</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-[#006097] shrink-0 mt-0.5" />
              <span>روش مذاکره، بستن قراردادهای حقوقی و تحویل حرفه‌ای به برندهای بزرگ</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-[#006097] shrink-0 mt-0.5" />
              <span>۱۰۰ روز تمرین پروژه‌محور و اولویت در معرفی پروژه‌های تجاری پلتفرم «جار»</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
