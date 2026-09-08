import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import JaramoozLogo from "@/components/JaramoozLogo";

export function JoinUsBanner() {
  return (
    <section className="w-full pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto" dir="rtl">
      <div className="relative overflow-hidden rounded-[32px] border border-[#006097]/25 bg-gradient-to-br from-[#006097]/[0.09] via-white/95 to-[#006097]/[0.04] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(0,96,151,0.12)]">
        
        {/* Soft Ambient Blue Glows */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#006097]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#006097]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white border border-[#006097]/25 shadow-xs transition-transform duration-200 hover:scale-105">
              <JaramoozLogo className="h-7 w-7" fill="#006097" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-jar-primary">
                  عکاس، فیلمبردار یا تدوین‌گر هستید؟
                </h3>
                <span className="rounded-full bg-[#006097]/10 border border-[#006097]/25 px-2.5 py-0.5 text-[10px] font-bold text-[#006097]">
                  عضویت رایگان
                </span>
              </div>
              <p className="text-xs sm:text-sm text-jar-muted font-medium leading-relaxed max-w-xl">
                به جمع صدها متخصص برگزیده جار بپیوندید؛ پورتفولیوی اختصاصی خود را بسازید و پروژه‌های آماده دریافت کنید.
              </p>
            </div>
          </div>

          <Link
            href="/join"
            className="group inline-flex h-11 sm:h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#006097] text-white px-7 text-xs sm:text-sm font-medium transition-all duration-200 hover:bg-[#004f7c] hover:shadow-[0_6px_20px_rgba(0,96,151,0.3)] cursor-pointer whitespace-nowrap"
          >
            <span>عضویت در سامانه متخصصین</span>
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
          </Link>

        </div>

      </div>
    </section>
  );
}

