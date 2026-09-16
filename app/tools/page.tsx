"use client";

import Link from "next/link";
import { Wrench, ChevronLeft, MapPin, BookOpen, Sparkles } from "lucide-react";

export default function ToolsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-up text-right px-4 sm:px-0" dir="rtl">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CC785C]/10 text-[#CC785C] border border-[#CC785C]/20 shrink-0">
          <Wrench className="h-6 w-6" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#141413]">ابزارهای کاربردی</h1>
          <p className="text-xs font-medium text-[#66605B]">
            ابزارهای هوشمند برای تسهیل فرآیندها و ارتقای فعالیت‌های شما
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/jaramooz"
          className="col-span-2 flex min-h-[144px] flex-col justify-between rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-6 sm:p-8 text-right transition-all duration-200 hover:scale-[1.01] hover:shadow-xs active:scale-95"
        >
          <div className="flex w-full items-start justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-600">
              <BookOpen className="h-6 w-6" strokeWidth={2} />
            </span>
            <ChevronLeft className="h-6 w-6 text-blue-600/70" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-extrabold text-slate-900">آکادمی آموزش جارآموز</h3>
            <p className="mt-1.5 text-xs font-semibold text-blue-800/80">
              مسترکلاس‌های عکاسی، نورپردازی و کسب درآمد از هنر
            </p>
          </div>
        </Link>

        <Link
          href="/tools/locations"
          className="col-span-2 flex h-28 flex-col justify-between rounded-2xl border border-[#E5E0D8] bg-white p-5 text-right shadow-xs transition-all hover:scale-[1.01] hover:shadow-sm active:scale-95"
        >
          <div className="flex w-full items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CC785C]/10 text-[#CC785C] border border-[#CC785C]/20">
              <MapPin className="h-5 w-5" strokeWidth={2} />
            </span>
            <ChevronLeft className="h-5 w-5 text-[#CC785C]/70" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#141413]">جار لوکیشن</h3>
            <p className="mt-1 text-[10px] font-medium text-[#66605B]">
              نقشه لوکیشن و عمارت عکاسی · نزدیک‌ترین‌ها · ثبت لوکیشن جدید
            </p>
          </div>
        </Link>

        <div className="col-span-2 relative overflow-hidden flex h-28 flex-col justify-between rounded-2xl border border-[#E5E0D8] bg-white p-5 text-right select-none shadow-xs">
          <div className="flex w-full items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141413]/10 text-[#141413] border border-[#141413]/15">
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </span>
            <ChevronLeft className="h-5 w-5 text-[#66605B]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#141413]">ادیت عکس هوشمند جار</h3>
            <p className="mt-1 text-[10px] font-medium text-[#66605B]">
              ویرایش و روتوش سریع تصاویر با هوش مصنوعی اختصاصی
            </p>
          </div>
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-xs">
            <span className="inline-flex items-center gap-1.5 bg-[#141413] text-white text-[10px] font-medium px-3.5 py-1.5 rounded-full shadow-xs">
              به زودی فعال می‌شود
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
