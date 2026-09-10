"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, ShieldCheck, Sparkles, Zap, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export type PublicPlan = {
  key: string;
  nameFa: string;
  price3Months: number;
  price12Months: number;
  features: string;
};

function parseFeatures(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\-\s*/, "").trim())
    .filter(Boolean);
}

function formatToman(amount: number): string {
  return amount.toLocaleString("fa-IR");
}

export default function PlansClientPage({
  isLoggedIn,
  plans,
}: {
  isLoggedIn: boolean;
  plans: PublicPlan[];
}) {
  const [billingPeriod, setBillingPeriod] = useState<"standard" | "annual">("standard");
  const router = useRouter();
  const isAnnual = billingPeriod === "annual";

  const ordered = ["basic", "pro", "ultra"]
    .map((key) => plans.find((p) => p.key === key))
    .filter((p): p is PublicPlan => Boolean(p));

  const handlePlanClick = (plan: PublicPlan) => {
    if (plan.key === "basic") {
      router.push(isLoggedIn ? "/join" : "/login?redirect=/join");
      return;
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-up text-right pb-20 px-4 pt-12" dir="rtl">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Sparkles className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-black text-black">سرمایه‌گذاری روی برند شخصی شما</h1>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              بیسیک رایگان و دائمی است. اشتراک پرو و اولترا فعلاً غیرفعال است.
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
            دوره ۳ ماهه
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
            دوره ۱۲ ماهه
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full pb-8">
        {ordered.map((plan) => {
          const isBasic = plan.key === "basic";
          const isPaidLocked = plan.key === "pro" || plan.key === "ultra";
          const isUltra = plan.key === "ultra";
          const price = isBasic ? 0 : isAnnual ? plan.price12Months : plan.price3Months;
          const periodLabel = isBasic
            ? "دائمی / همیشگی"
            : isAnnual
              ? "دوره ۱۲ ماهه"
              : "دوره ۳ ماهه";
          const buttonText = isBasic
            ? "شروع ثبت‌نام رایگان"
            : plan.key === "pro"
              ? "خرید اشتراک پرو"
              : "خرید اشتراک اولترا";

          return (
            <div
              key={plan.key}
              className={`w-full rounded-[32px] border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative overflow-hidden bg-white ${
                isPaidLocked ? "opacity-75" : ""
              } ${
                isUltra
                  ? "border-amber-400 ring-2 ring-amber-400/20"
                  : isBasic
                    ? "border-gray-200 ring-2 ring-gray-100/50"
                    : "border-slate-200"
              }`}
            >
              {isPaidLocked && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 rounded-[32px]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-200/90 text-gray-500 mb-2.5">
                    <Lock className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-black text-gray-700">فعلاً در دسترس نیست</span>
                  <span className="text-[9px] font-bold text-gray-400 mt-1">خرید اشتراک پرو و اولترا موقتاً غیرفعال است</span>
                </div>
              )}
              <div className="space-y-6">
                <div className="text-right">
                  <h3 className="text-base font-black text-slate-900">{plan.nameFa}</h3>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-4xl font-black tracking-tight text-slate-900">
                      {formatToman(price)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      تومان {isBasic ? "(رایگان)" : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{periodLabel}</p>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                <ul className="space-y-3.5">
                  {parseFeatures(plan.features).map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-right">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 leading-normal">
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => handlePlanClick(plan)}
                  disabled={isPaidLocked}
                  className={`w-full h-12 rounded-2xl text-xs font-black shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    isBasic
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                      : "bg-slate-900 text-white"
                  } ${isPaidLocked ? "pointer-events-none" : ""}`}
                >
                  {isBasic && <Zap className="h-3.5 w-3.5" />}
                  {buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-100/60 flex items-start gap-3.5 text-right">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-extrabold text-slate-900">پرداخت امن زرین‌پال و فعال‌سازی آنی</h4>
          <p className="mt-1 text-[10px] font-semibold text-slate-500 leading-relaxed">
            مبلغ پرو و اولترا از دیتابیس خوانده می‌شود. خرید این دو پلن فعلاً غیرفعال است.
          </p>
        </div>
      </footer>
    </div>
  );
}
