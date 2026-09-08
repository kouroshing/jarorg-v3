import Link from "next/link";
import { ArrowLeft, Calendar, Sparkles, CheckCircle2 } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="w-full py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto" dir="rtl">
      <div className="relative overflow-hidden rounded-3xl bg-jar-primary p-8 sm:p-12 text-white border border-jar-primaryHover shadow-xs">
        
        {/* Ambient Terracotta Light Orb */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-jar-logo/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-jar-logo/10 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-jar-logo/30 bg-jar-logo/15 px-3.5 py-1 text-xs font-medium text-jar-logo">
              <Sparkles className="h-3.5 w-3.5 fill-jar-logo text-jar-logo" />
              <span>استعلام و مشاوره کاملاً رایگان</span>
            </span>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              پروژه خاصی در ذهن دارید؟
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
              درخواست خود را در کمتر از ۲ دقیقه ثبت کنید؛ کارشناسان آتلیه جار بلافاصله برای هماهنگی و تعیین برترین متخصص متناسب با بودجه با شما هماهنگ می‌شوند.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-jar-logo" />
                پشتیبانی ۲۴ ساعته
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-jar-logo" />
                ضمانت بازگشت وجه
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-jar-logo" />
                قرارداد رسمی الکترونیک
              </span>
            </div>
          </div>

          <Link
            href="/order"
            className="group inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full bg-jar-surface hover:bg-jar-soft text-jar-primary px-8 py-3.5 text-sm sm:text-base font-medium shadow-none transition-colors duration-200 cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-jar-primary" />
            <span>ثبت رایگان سفارش</span>
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
          </Link>
        </div>

      </div>
    </section>
  );
}
