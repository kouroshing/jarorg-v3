"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Sparkles, CheckCircle2, ShieldCheck, Video, Sliders, Volume2, Maximize2, Layers, TrendingUp, DollarSign, Camera, Smartphone } from "lucide-react";

export default function BillowHeroMockup() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState<"camera" | "retouch" | "business">("camera");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.95, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-4xl"
    >
      {/* Corner crosshairs like Framer/Billow */}
      <div className="absolute -top-3 -left-3 text-slate-300 font-mono text-sm select-none pointer-events-none">+</div>
      <div className="absolute -top-3 -right-3 text-slate-300 font-mono text-sm select-none pointer-events-none">+</div>
      <div className="absolute -bottom-3 -left-3 text-slate-300 font-mono text-sm select-none pointer-events-none">+</div>
      <div className="absolute -bottom-3 -right-3 text-slate-300 font-mono text-sm select-none pointer-events-none">+</div>

      {/* Billow.so Signature Cloud-Like Luminous Blue Halos */}
      <div className="absolute -inset-4 -z-10 pointer-events-none overflow-visible">
        {/* Left Cloud Bubble */}
        <div className="absolute -top-16 -left-12 sm:-left-20 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-sky-400/40 via-[#0080ff]/30 to-transparent blur-3xl opacity-75" />
        
        {/* Center Peak Cloud Bubble */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-b from-[#0080ff]/35 via-sky-300/30 to-transparent blur-3xl opacity-80" />
        
        {/* Right Cloud Bubble */}
        <div className="absolute -top-16 -right-12 sm:-right-20 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-bl from-cyan-400/40 via-sky-400/30 to-transparent blur-3xl opacity-75" />
        
        {/* Bottom Ambient Under-Glow */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[85%] h-40 rounded-full bg-gradient-to-t from-sky-400/25 to-transparent blur-2xl opacity-60" />
      </div>

      {/* Main Glass Window */}
      <div className="relative rounded-[26px] border border-slate-200/90 bg-white/85 backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,28,46,0.04),0_20px_50px_-15px_rgba(0,28,46,0.08)] overflow-hidden">
        
        {/* Top Window Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-50/80 px-4 sm:px-6 py-3">
          {/* Mac Traffic Dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]/50" />
          </div>

          {/* Center Pill */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 py-1 text-[11px] font-bold text-slate-700 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#006097] animate-pulse" />
            <span>استودیو جارآموز ⋅ Masterclass Studio Suite</span>
          </div>

          {/* Live Badge */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-500" dir="ltr">
            <span className="rounded bg-sky-50 border border-sky-200 px-2 py-0.5 font-bold text-[#006097]">4K PRORES</span>
          </div>
        </div>

        {/* Tab Controls Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/60 px-4 sm:px-6 py-2.5 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab("camera")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "camera"
                  ? "bg-[#006097] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/80"
              }`}
            >
              دوربین و نورپردازی
            </button>
            <button
              onClick={() => setActiveTab("retouch")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "retouch"
                  ? "bg-[#006097] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/80"
              }`}
            >
              پست‌تولید و رنگ
            </button>
            <button
              onClick={() => setActiveTab("business")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "business"
                  ? "bg-[#006097] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/80"
              }`}
            >
              قرارداد و درآمد B2B
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>پروژه‌محور ۱۰۰ روزه</span>
          </div>
        </div>

        {/* Tab Content Display */}
        {activeTab === "camera" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
            
            {/* Left Course Timeline (5 cols) */}
            <div className="md:col-span-5 border-b md:border-b-0 md:border-l border-slate-200/70 p-4 sm:p-5 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>سرفصل‌های استودیویی</span>
                <span className="text-[10px] font-mono text-[#006097]">پیشرفت: ۲۴٪</span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full w-1/4 bg-gradient-to-r from-[#006097] to-sky-400 rounded-full" />
              </div>

              {/* Micro-table rows (Billow style) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-bold text-slate-800">۰۱. ذهنیت عکاس تجاری</span>
                      <span className="block text-[10px] text-slate-400">۴ ویدیو ⋅ تکمیل شده</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    پایان
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#006097]/8 border border-[#006097]/30 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-[#006097] text-white flex items-center justify-center">
                      <Play className="h-3 w-3 fill-current" />
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-extrabold text-[#006097]">۰۲. مثلث نوردهی و لنزها</span>
                      <span className="block text-[10px] text-[#006097]/70">۷ ویدیو ⋅ در حال پخش</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#006097] px-2 py-0.5 text-[9px] font-bold text-white animate-pulse">
                    زنده
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-slate-200/60 opacity-80">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-mono text-xs">
                      ۰۳
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-semibold text-slate-700">۰۳. شیدرهای شیشه و فلز</span>
                      <span className="block text-[10px] text-slate-400">۶ ویدیو ⋅ قفل هوشمند</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">۵ ساعت</span>
                </div>
              </div>
            </div>

            {/* Right Camera Viewport (7 cols) */}
            <div className="md:col-span-7 p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-b-[24px] md:rounded-bl-[24px] md:rounded-br-none relative overflow-hidden min-h-[280px]">
              {/* Camera Grid overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#006097]/30 via-transparent to-transparent opacity-60 pointer-events-none" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

              {/* HUD Header */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300 backdrop-blur-md bg-black/40 p-2.5 rounded-xl border border-white/10" dir="ltr">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-red-400 font-bold">REC [00:14:28]</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-200">
                  <span>ISO 100</span>
                  <span>1/250s</span>
                  <span>f/1.4</span>
                  <span className="text-sky-400">5600K</span>
                </div>
              </div>

              {/* Focus Reticle & Play */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center py-4">
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-20 w-20 border border-dashed border-sky-400/40 rounded-full animate-spin [animation-duration:15s]" />
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 fill-current text-[#006097]" />
                    ) : (
                      <Play className="h-5 w-5 fill-current text-[#006097] mr-0.5" />
                    )}
                  </button>
                </div>
                <span className="mt-3 text-xs font-bold text-slate-200 drop-shadow-md">
                  جلسه ۷: تکنیک نورپردازی بطری شیشه‌ای و محصول براق
                </span>
              </div>

              {/* HUD Bottom */}
              <div className="relative z-10 flex items-center justify-between gap-3 text-xs text-slate-300 backdrop-blur-md bg-black/40 p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] font-mono text-slate-400">14:28</span>
                  <div className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full w-2/5 bg-sky-400 rounded-full" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">32:15</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Volume2 className="h-3.5 w-3.5 text-slate-300" />
                  <Maximize2 className="h-3.5 w-3.5 text-slate-300" />
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "retouch" && (
          <div className="p-6 bg-slate-50/60 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="block text-[10px] text-slate-400 font-mono">COLOR GRADING</span>
                <span className="block text-base font-black text-slate-900 mt-1">پالت لوکس سینمایی</span>
                <span className="text-[10px] text-slate-500">تفکیک رنگ پوست و سوژه</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="block text-[10px] text-slate-400 font-mono">HIGH-END RETOUCH</span>
                <span className="block text-base font-black text-slate-900 mt-1">رتوش فرکانسی و بافت</span>
                <span className="text-[10px] text-slate-500">حفظ ۱۰۰٪ تکسچر طبیعی</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="block text-[10px] text-slate-400 font-mono">COMPOSITING</span>
                <span className="block text-base font-black text-slate-900 mt-1">فتومونتاژ تبلیغاتی</span>
                <span className="text-[10px] text-slate-500">نورپردازی مصنوعی پس‌زمینه</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "business" && (
          <div className="p-6 bg-slate-50/60 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  جار
                </div>
                <div className="text-right">
                  <span className="block text-xs font-extrabold text-emerald-950">پروژه عکاسی برند نوشیدنی (ثبت‌شده در جار)</span>
                  <span className="block text-[11px] text-emerald-700">ارزش قرارداد: ۲۸,۵۰۰,۰۰۰ تومان ⋅ پیش‌پرداخت دریافت شد</span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-600 text-white font-bold text-xs px-3.5 py-1 shadow-xs">
                قرارداد رسمی تایید شد
              </span>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}
