"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X as CloseIcon, ArrowRight, ShieldCheck, Sparkles, Zap, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

type PlanFeature = {
  text: string;
  included: boolean;
};

type PlanData = {
  id: string;
  name: string;
  price: string;
  periodLabel: string;
  features: PlanFeature[];
  buttonText: string;
  colorClass: string;
  borderColorClass: string;
  disabled: boolean;
};

export default function PlansClientPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [billingPeriod, setBillingPeriod] = useState<"standard" | "annual">("standard");
  const router = useRouter();

  // Basic Plan: Independent of billing switcher
  const basicPlan: PlanData = {
    id: "basic",
    name: "جار بیسیک (Basic)",
    price: "۰",
    periodLabel: "دائمی / همیشگی",
    features: [
      { text: "ثبت پروفایل کاربری", included: true },
      { text: "دسترسی به لوکیشن‌ها", included: true },
      { text: "۵۰۰ مگابایت فضای اختصاصی", included: true },
      { text: "دسترسی کامل به سیستم جار شاتی (فروش با QR)", included: true }
    ],
    buttonText: "💼 ثبت‌نام متخصصین (موقتاً غیرفعال)",
    colorClass: "bg-white dark:bg-slate-900",
    borderColorClass: "border-gray-200 ring-2 ring-gray-100/50 shadow-md",
    disabled: true
  };

  // Pro Plan: Connected to billing period switcher
  const proPlan: PlanData = {
    id: "pro",
    name: "جار پرو (Jar Pro)",
    price: billingPeriod === "standard" ? "۹۹۰,۰۰۰" : "۴,۹۰۰,۰۰۰",
    periodLabel: billingPeriod === "standard" ? "دوره ۱ ماهه" : "دوره ۶ ماهه",
    features: [
      { text: "ثبت پروفایل کاربری", included: true },
      { text: "دسترسی لوکیشن استاندارد", included: true },
      { text: "۲ گیگابایت فضای ابری اختصاصی", included: true },
      { text: "بج تاییدیه نقره‌ای در پروفایل", included: true }
    ],
    buttonText: "خرید اشتراک پرو",
    colorClass: "bg-white dark:bg-slate-900",
    borderColorClass: "border-slate-200 shadow-md",
    disabled: true
  };

  // Ultra Plan: Connected to billing period switcher
  const ultraPlan: PlanData = {
    id: "ultra",
    name: "جار اولترا (Jar Ultra)",
    price: billingPeriod === "standard" ? "۱,۹۹۰,۰۰۰" : "۹,۵۰۰,۰۰۰",
    periodLabel: billingPeriod === "standard" ? "دوره ۱ ماهه" : "دوره ۶ ماهه",
    features: [
      { text: "ثبت پروفایل کاربری", included: true },
      { text: "دسترسی لوکیشن اولویت‌دار (VIP)", included: true },
      { text: "۱۰۰ گیگابایت فضای ابری اختصاصی", included: true },
      { text: "بج تاییدیه طلایی در پروفایل", included: true },
      { text: "نمایش در رتبه اول لیست منتخب پلتفرم در صفحه اصلی", included: true },
      { text: "دسترسی کاملاً رایگان به آزمون تیک آبی", included: true }
    ],
    buttonText: "خرید اشتراک اولترا",
    colorClass: "bg-gradient-to-br from-amber-50/40 to-white dark:from-slate-900 dark:to-slate-950",
    borderColorClass: "border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-400/5",
    disabled: true
  };

  const handlePlanClick = (planId: string) => {
    if (planId === "basic") {
      if (!isLoggedIn) {
        router.push("/login?redirect=/specialist/portfolio");
      } else {
        router.push("/specialist/portfolio");
      }
    } else {
      alert("خرید اشتراک‌های پرو و اولترا به‌زودی فعال خواهد شد. در حال حاضر می‌توانید از پلن جار بیسیک به صورت رایگان استفاده کنید.");
    }
  };

  const plans = [basicPlan, proPlan, ultraPlan];

  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-up text-right pb-20 px-4 pt-12" dir="rtl">
      
      {/* Header with back button */}
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Sparkles className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-black text-black">سرمایه‌گذاری روی برند شخصی شما</h1>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              ابزاری که عکاسان، فیلمبرداران، تدوینگران، ادیتورها و مدلهای حرفه‌ای برای رشد درآمدشان استفاده می‌کنند.
            </p>
          </div>
        </div>
        <Link
          href="/profile"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-150 bg-white hover:bg-gray-55 transition-colors active:scale-95 shadow-sm"
          title="بازگشت به پروفایل"
        >
          <ArrowRight className="h-5 w-5 text-gray-500" />
        </Link>
      </header>

      {/* Period Toggle Switcher */}
      <div className="mb-10 flex justify-center">
        <div className="relative flex rounded-2xl bg-gray-100/80 p-1 border border-gray-200/20">
          <button
            type="button"
            onClick={() => setBillingPeriod("standard")}
            className={`relative rounded-xl px-6 py-2.5 text-xs font-black transition-all ${
              billingPeriod === "standard"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-black"
            }`}
          >
            دوره ۱ ماهه
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod("annual")}
            className={`relative rounded-xl px-6 py-2.5 text-xs font-black transition-all ${
              billingPeriod === "annual"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-black"
            }`}
          >
            دوره ۶ ماهه
          </button>
        </div>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full pb-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`w-full rounded-[32px] border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${plan.colorClass} ${plan.borderColorClass} ${plan.disabled ? "opacity-75" : ""}`}
          >
            {/* "Coming Soon" Lock Overlay for Pro & Ultra plans */}
            {plan.disabled && plan.id !== "basic" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-[1px] rounded-[32px]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-200/90 text-gray-500 mb-2.5">
                  <Lock className="h-6 w-6" />
                </div>
                <span className="text-xs font-black text-gray-700">فعلاً در دسترس نیست</span>
                <span className="text-[9px] font-bold text-gray-400 mt-1">به‌زودی فعال خواهد شد</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Title & Price */}
              <div className="text-right">
                <h3 className="text-base font-black text-slate-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-4xl font-black tracking-tight text-slate-900">{plan.price}</span>
                  <span className="text-xs font-bold text-slate-400">تومان {plan.id === "basic" && "(رایگان)"}</span>
                </div>
                <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{plan.periodLabel}</p>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100 w-full" />

              {/* Features List */}
              <ul className="space-y-3.5">
                {plan.features.map((feat, index) => (
                  <li key={index} className={`flex items-start gap-2.5 text-right ${!feat.included ? "opacity-45" : ""}`}>
                    {feat.included ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-650 mt-0.5">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400 mt-0.5">
                        <CloseIcon className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    )}
                    <span className={`text-[11px] font-semibold text-slate-700 leading-normal ${!feat.included ? "line-through" : ""}`}>
                      {feat.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subscribe Action Button */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => handlePlanClick(plan.id)}
                className={`w-full h-12 rounded-2xl text-xs font-black shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  plan.id === "basic"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {plan.id === "basic" ? (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    {plan.buttonText}
                  </>
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Trust Badge Footer */}
      <footer className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-100/60 flex items-start gap-3.5 text-right shadow-sm">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-extrabold text-slate-900">تضمین امنیت پرداخت و فعال‌سازی آنی</h4>
          <p className="mt-1 text-[10px] font-semibold text-slate-450 leading-relaxed">
            کلیه پلن‌های اشتراک به محض پرداخت، فعال شده و فاکتور رسمی آن از طریق پیامک برای شما ارسال خواهد شد. در صورت بروز هرگونه مشکل، پشتیبانی شبانه‌روزی جار همراه شماست.
          </p>
        </div>
      </footer>
    </div>
  );
}
