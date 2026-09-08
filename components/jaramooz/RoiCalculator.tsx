"use client";

import React, { useState } from "react";
import { Calculator, TrendingUp, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react";

interface ProjectPreset {
  label: string;
  defaultFee: number;
  description: string;
}

const PRESETS: ProjectPreset[] = [
  { label: "پرتره و شخصی", defaultFee: 7000000, description: "۷ میلیون" },
  { label: "محصول و تجاری", defaultFee: 15000000, description: "۱۵ میلیون" },
  { label: "مدلینگ و فشن", defaultFee: 25000000, description: "۲۵ میلیون" },
];

const COURSE_PRICE = 9100000;

export default function RoiCalculator() {
  const [projectFee, setProjectFee] = useState<number>(7000000);
  const [monthlyProjects, setMonthlyProjects] = useState<number>(2);

  // Calculations
  const monthlyRevenue = projectFee * monthlyProjects;
  const netFirstMonthProfit = monthlyRevenue - COURSE_PRICE;
  const projectsToBreakEven = Math.max(1, Math.ceil(COURSE_PRICE / projectFee));
  const roiPercentage = Math.round(((monthlyRevenue - COURSE_PRICE) / COURSE_PRICE) * 100);

  const formatToman = (num: number) => {
    return new Intl.NumberFormat("fa-IR").format(num);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6" dir="rtl">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-1.5 px-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#006097]/10 px-3 py-0.5 text-[11px] font-black text-[#006097]">
          <Calculator className="h-3 w-3" />
          <span>ماشین‌حساب بازگشت سرمایه (ROI)</span>
        </span>
        <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
          هزینه نیست؛ <span className="text-[#006097]">سرمایه‌گذاری زودبازده</span> است
        </h2>
        <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed max-w-lg mx-auto">
          با گرفتن تنها چند سفارش از شبکه کارفرمایان «جار»، کل شهریه دوره در همان ماه اول تسویه می‌شود.
        </p>
      </div>

      {/* Main Glassmorphic Calculator Bento */}
      <div className="relative max-w-3xl mx-auto rounded-3xl border border-slate-200/90 bg-white/85 backdrop-blur-2xl p-4 sm:p-6 shadow-xl shadow-[#006097]/5">
        {/* Seamless Soft Blue Background Halos */}
        <div className="absolute -inset-x-8 -inset-y-10 -z-10 pointer-events-none overflow-visible">
          <div 
            className="absolute -top-16 -left-16 w-[350px] sm:w-[500px] h-[250px] sm:h-[350px] rounded-full blur-[80px] pointer-events-none will-change-transform"
            style={{
              background: "radial-gradient(ellipse at center, rgba(56,189,248,0.22) 0%, rgba(0,128,255,0.08) 35%, rgba(0,128,255,0.02) 55%, rgba(255,255,255,0) 70%)"
            }}
          />
          <div 
            className="absolute -bottom-16 -right-16 w-[350px] sm:w-[500px] h-[250px] sm:h-[350px] rounded-full blur-[80px] pointer-events-none will-change-transform"
            style={{
              background: "radial-gradient(ellipse at center, rgba(34,211,238,0.2) 0%, rgba(56,189,248,0.08) 35%, rgba(56,189,248,0.02) 55%, rgba(255,255,255,0) 70%)"
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center">
          
          {/* Inputs Column (7 cols on desktop) */}
          <div className="lg:col-span-7 space-y-3.5">
            
            {/* Quick Presets Tabs */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#006097]" />
                <span>نوع پروژه در جار:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map((preset, idx) => {
                  const isSelected = projectFee === preset.defaultFee;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProjectFee(preset.defaultFee)}
                      className={`text-center py-2 px-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#006097] bg-[#006097]/10 text-[#006097] font-black shadow-2xs"
                          : "border-slate-200/80 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block font-black text-[11px] sm:text-xs truncate">{preset.label}</span>
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{preset.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider 1: Project Fee */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 sm:p-3.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">دستمزد هر سفارش:</span>
                <span className="font-black text-[#006097] font-mono text-xs sm:text-sm">
                  {formatToman(projectFee)} <span className="text-[10px] font-normal text-slate-500">تومان</span>
                </span>
              </div>
              <input
                type="range"
                min="3000000"
                max="35000000"
                step="500000"
                value={projectFee}
                onChange={(e) => setProjectFee(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#006097]"
              />
              <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono">
                <span>۳ میلیون</span>
                <span>۱۵ م (محصول)</span>
                <span>۳۵ میلیون</span>
              </div>
            </div>

            {/* Slider 2: Monthly Projects */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 sm:p-3.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">تعداد سفارش در ماه:</span>
                <span className="font-black text-[#006097] font-mono text-xs sm:text-sm">
                  {monthlyProjects} <span className="text-[10px] font-normal text-slate-500">پروژه</span>
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={monthlyProjects}
                onChange={(e) => setMonthlyProjects(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#006097]"
              />
              <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono">
                <span>۱ پروژه</span>
                <span>۴ پروژه</span>
                <span>۸ پروژه در ماه</span>
              </div>
            </div>

          </div>

          {/* Right Results Card (5 cols on desktop) */}
          <div className="lg:col-span-5 rounded-2xl border-2 border-[#006097]/20 bg-gradient-to-b from-[#006097]/6 via-white to-white p-4 sm:p-5 space-y-3 shadow-md relative overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-[11px] font-bold text-slate-600">نتیجه شبیه‌سازی مالی:</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 px-2 py-0.5 text-[10px] font-black">
                <TrendingUp className="h-3 w-3" />
                <span>+{roiPercentage}% بازدهی ماه اول</span>
              </span>
            </div>

            {/* Main Monthly Revenue */}
            <div className="space-y-0.5">
              <span className="block text-[11px] text-slate-500 font-medium">درآمد ناخالص ماهانه شما:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                  {formatToman(monthlyRevenue)}
                </span>
                <span className="text-[11px] font-bold text-slate-500">تومان / ماه</span>
              </div>
            </div>

            {/* Break-even badge */}
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 p-2.5 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-950 font-medium leading-relaxed">
                تسویه ۱۰۰٪ شهریه دوره تنها با <span className="font-black text-emerald-800">{projectsToBreakEven} سفارش</span> و <span className="font-black text-emerald-700">+{formatToman(Math.max(0, netFirstMonthProfit))} تومان</span> سود خالص در ماه اول!
              </p>
            </div>

            {/* Direct CTA Button */}
            <a
              href="#instructor"
              className="inline-flex w-full h-10 items-center justify-center gap-1.5 rounded-xl bg-[#006097] text-xs font-black text-white shadow-md hover:bg-[#056297] transition-all hover:scale-[1.01] active:scale-98 cursor-pointer"
            >
              <span>ثبت‌نام در مسترکلاس ۱۰۰ روزه</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </a>

          </div>

        </div>
      </div>
    </div>
  );
}
