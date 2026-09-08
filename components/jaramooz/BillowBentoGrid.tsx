"use client";

import React from "react";
import { motion } from "framer-motion";
import { Camera, Smartphone, Palette, TrendingUp, Sparkles, Sliders, CheckCircle2, Shield, ArrowUpRight, Award, Zap } from "lucide-react";
import { StudioOpticsIllustration, ColorGradingIllustration, VerifiedContractIllustration } from "./BillowVisuals";

export default function BillowBentoGrid() {
  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#006097]/10 px-3.5 py-1 text-xs font-extrabold text-[#006097]">
          <Sparkles className="h-3.5 w-3.5" />
          معماری دوره جامع جارآموز
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          همه‌چیز برای تبدیل شدن به یک <span className="text-[#006097]">عکاس تجاری درجه‌یک</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          فرمول تست‌شده بیش از ۱۰۰ پروژه ملی، از تنظیمات فنی دوربین تا نورپردازی هالیوودی و بستن قراردادهای حقوقی B2B.
        </p>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Bento Card 1 (Span 2 Cols Desktop): Camera & Pro Lighting Rig */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.25 }}
          className="md:col-span-2 rounded-[28px] border border-slate-200/80 bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between group"
        >
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-400/10 rounded-full blur-3xl pointer-events-none -z-10 group-hover:bg-sky-400/20 transition-all duration-500" />

          {/* Interactive Rig Vector Visual */}
          <div className="mb-6">
            <StudioOpticsIllustration />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-[#006097]" />
              <span className="text-xs font-bold text-[#006097] uppercase tracking-wider">سرفصل ۰۱ و ۰۲</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-2">
              تسلط بر دوربین، زاویه و چیدمان نورهای استودیویی
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              آموزش علمی شیدرها، انعکاس روی شیشه و فلزات، و چیدمان Key / Rim / Fill Light بدون نیاز به تجهیزات میلیاردی.
            </p>
          </div>
        </motion.div>

        {/* Bento Card 2 (Span 1 Col Desktop): Mobilegraphy Pro */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.25 }}
          className="rounded-[28px] border border-slate-200/80 bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between group"
        >
          <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10 group-hover:bg-indigo-500/20 transition-all duration-500" />

          {/* Micro Mobile Mockup (Frosted Glass Theme) */}
          <div className="rounded-2xl border border-white/90 bg-gradient-to-br from-white/95 via-indigo-50/30 to-white/85 p-4 mb-6 text-slate-800 text-center space-y-2.5 shadow-[0_4px_24px_rgba(99,102,241,0.06),inset_0_1px_2px_rgba(255,255,255,0.9)] backdrop-blur-xl">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono" dir="ltr">
              <span className="font-bold text-slate-600">RAW CAMERA</span>
              <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-black">48MP PRO</span>
            </div>
            <div className="h-20 rounded-xl bg-gradient-to-tr from-indigo-50 via-sky-50 to-white border border-indigo-200/50 flex items-center justify-center p-2 shadow-2xs">
              <span className="text-xs font-black text-indigo-900">خروجی بیلبوردی با موبایل</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
              <span>سنسور و لنز</span>
              <span className="text-emerald-700 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">بدون افت کیفیت</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">سرفصل ۰۳</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              موبایلگرافی و ولاگری تجاری
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              تنظیمات دستی Pro، فریم‌ریت‌های استاندارد و تکنیک‌های اختصاصی تولید محتوای پربازدید اینستاگرام.
            </p>
          </div>
        </motion.div>

        {/* Bento Card 3 (Span 1 Col Desktop): High-End Retouching */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.25 }}
          className="rounded-[28px] border border-slate-200/80 bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between group"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -z-10 group-hover:bg-rose-500/20 transition-all duration-500" />

          {/* Color Curve Visual */}
          <div className="mb-6">
            <ColorGradingIllustration />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">سرفصل ۰۴</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              رتوش فرکانسی و کالرگریدینگ
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              اصلاح بافت پوست، تفکیک رنگ در فتوشاپ و لایت‌روم و طراحی پالت رنگ اختصاصی برای برندها.
            </p>
          </div>
        </motion.div>

        {/* Bento Card 4 (Span 2 Cols Desktop): B2B Contract Machine & Jar Integration */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.25 }}
          className="md:col-span-2 rounded-[28px] border border-slate-200/80 bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between group"
        >
          <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10 group-hover:bg-emerald-500/20 transition-all duration-500" />

          {/* Verified Contract Visual */}
          <div className="mb-6">
            <VerifiedContractIllustration />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">سرفصل ۰۵ ⋅ تضمین ورود به بازار</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mb-2">
              ماشین بستن قراردادهای شرکتی و معرفی به پروژه‌های جار
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              آموزش نحوه قیمت‌گذاری پروژه‌ها، فرم‌های استاندارد قرارداد حقوقی و اتصال مستقیم به عنوان متخصص تاییدشده در سامانه سراسری «جار».
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
