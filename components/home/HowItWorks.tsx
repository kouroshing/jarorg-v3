import { ClipboardList, Camera, Sparkles, ChevronLeft } from "lucide-react";

const STEPS = [
  {
    number: "۰۱",
    title: "انتخاب یا ثبت درخواست",
    description: "متخصص موردنظرتان را مستقیماً رزرو کنید یا با ثبت رایگان پروژه، انتخاب بهترین عکاس را به جار بسپارید.",
    icon: ClipboardList
  },
  {
    number: "۰۲",
    title: "عکاسی و اجرای پروژه",
    description: "پس از هماهنگی نهایی، تیم حرفه‌ای و تایید شده در زمان و محل مقرر برای اجرای پروژه شما حاضر می‌شود.",
    icon: Camera
  },
  {
    number: "۰۳",
    title: "تحویل آنلاین فایل‌ها",
    description: "خروجی نهایی و ادیت شده پروژه را به صورت آلبوم دیجیتال و با بالاترین کیفیت در پنل اختصاصی خود تحویل بگیرید.",
    icon: Sparkles
  }
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24 bg-slate-50/10 border-t border-slate-100" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        
        {/* Section Header */}
        <div className="mb-12 text-right sm:mb-16">
          <h2
            id="how-it-works-heading"
            className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
          >
            چگونه جار کار می‌کند؟
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            مسیر ساده و مطمئن برای اجرای پروژه‌های عکاسی و فیلمبرداری شما
          </p>
        </div>

        {/* 3-Step Grid / Layout */}
        <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-stretch justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            
            return (
              <div key={idx} className="relative flex-1 flex flex-col justify-between group rounded-[24px] border border-slate-100 bg-white p-6 sm:p-8 shadow-sm transition-all duration-300 hover:border-slate-200 hover:shadow-lg">
                
                {/* Step Top Section */}
                <div className="space-y-4 text-right">
                  {/* Icon & Number Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xl sm:text-2xl font-black text-amber-500 select-none">
                      {step.number}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-colors duration-300 group-hover:bg-amber-500 group-hover:text-white">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Connecting Arrow for Desktop (only between steps) */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -left-4 -translate-y-1/2 items-center justify-center text-slate-200 z-10" aria-hidden="true">
                    <ChevronLeft className="h-6 w-6 stroke-[1.5]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
