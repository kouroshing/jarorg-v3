"use client";

import React from "react";
import { Star, Users, ShieldCheck, Award, MessageCircle, ArrowDown } from "lucide-react";

export default function HeroTrustBar() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pt-4">
      {/* 1. Rating & Student Social Proof Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-2xl sm:rounded-full py-2.5 px-5 shadow-xs">
        
        {/* Stars & Score */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="font-black text-slate-900 text-xs font-mono mr-1">۴.۹</span>
          <span className="text-[11px] text-slate-500 font-medium">از ۵ (۲۸۰+ هنرجوی فعال)</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200" />

        {/* Student Count & Avatars */}
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 space-x-reverse">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-[#006097] text-[10px] font-black border border-white">
              ک
            </span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-white">
              م
            </span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-white">
              س
            </span>
          </div>
          <span className="text-xs font-extrabold text-slate-800">
            +۵۴۰ دانشجو
          </span>
          <span className="text-[11px] text-slate-500 font-medium">در حال یادگیری مهارت</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200" />

        {/* Guarantee Tag */}
        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>ضمانت ۱۰۰٪ بازگشت وجه تا ۷ روز</span>
        </div>

      </div>

      {/* 2. Compact Instructor Anchor Capsule */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-sky-50/70 via-white/80 to-sky-50/70 backdrop-blur-xl border border-sky-200/60 rounded-2xl p-3 sm:px-4 shadow-2xs max-w-xl mx-auto">
        <a href="#instructor" className="flex items-center gap-3 group text-right">
          <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-[#006097]/30 shadow-xs relative">
            <img
              src="/jaramooz/instructor.jpg"
              alt="کوروش چنان مدرس مسترکلاس عکاسی"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 group-hover:text-[#006097] transition-colors">
                مدرس: کوروش چنان
              </span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-md">
                بنیان‌گذار جار و جارآموز
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              ۷ سال تجربه عکاسی تبلیغاتی و مجری ۲,۰۰۰+ پروژه در سراسر کشور
            </span>
          </div>
        </a>

        <a
          href="#instructor"
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#006097] hover:text-[#005080] bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all"
        >
          <span>بیوگرافی کامل</span>
          <ArrowDown className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
