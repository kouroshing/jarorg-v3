"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Crown,
  Loader2,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import { activateBasicPlan } from "@/app/actions/planActions";

export type OnboardingPlan = {
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

export default function SpecialistOnboardingPlans({
  plans,
  currentPlanKey,
}: {
  plans: OnboardingPlan[];
  currentPlanKey?: string | null;
}) {
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<"standard" | "annual">("standard");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAnnual = billingPeriod === "annual";

  const ordered = useMemo(
    () =>
      (["basic", "pro", "ultra"] as const)
        .map((key) => plans.find((p) => p.key === key))
        .filter((p): p is OnboardingPlan => Boolean(p)),
    [plans]
  );

  const continueWithBasic = () => {
    setError(null);
    startTransition(async () => {
      const res = await activateBasicPlan();
      if (!res.success) {
        setError(res.error || "فعال‌سازی اشتراک انجام نشد.");
        return;
      }
      router.push("/specialist/onboarding/details");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="relative inline-flex rounded-full border border-jar-border bg-jar-surface/80 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setBillingPeriod("standard")}
            className={`rounded-full px-5 py-2 text-[11px] font-black transition-all ${
              !isAnnual
                ? "bg-jar-primary text-white shadow-sm"
                : "text-jar-muted hover:text-jar-primary"
            }`}
          >
            دوره ۳ ماهه
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod("annual")}
            className={`rounded-full px-5 py-2 text-[11px] font-black transition-all ${
              isAnnual
                ? "bg-jar-primary text-white shadow-sm"
                : "text-jar-muted hover:text-jar-primary"
            }`}
          >
            دوره ۱۲ ماهه
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ordered.map((plan) => {
          const isBasic = plan.key === "basic";
          const isPaidLocked = plan.key === "pro" || plan.key === "ultra";
          const isUltra = plan.key === "ultra";
          const isCurrent = currentPlanKey === plan.key;
          const price = isBasic ? 0 : isAnnual ? plan.price12Months : plan.price3Months;
          const periodLabel = isBasic
            ? "دائمی و رایگان"
            : isAnnual
              ? "دوره ۱۲ ماهه"
              : "دوره ۳ ماهه";

          return (
            <article
              key={plan.key}
              className={`relative flex flex-col overflow-hidden rounded-[28px] border bg-jar-surface/90 p-5 sm:p-6 shadow-xs backdrop-blur-xl transition-transform duration-300 ${
                isUltra
                  ? "border-jar-logo/40 ring-1 ring-jar-logo/20 lg:-translate-y-1"
                  : isBasic
                    ? "border-emerald-200/80 ring-1 ring-emerald-100"
                    : "border-jar-border"
              }`}
            >
              {isUltra && (
                <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-jar-logo/15 blur-3xl" />
              )}
              {isPaidLocked && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[28px] bg-jar-canvas/75 backdrop-blur-[2px]">
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-jar-border bg-jar-surface text-jar-muted">
                    <Lock className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-jar-primary">فعلاً در دسترس نیست</span>
                  <span className="mt-1 text-[10px] font-bold text-jar-muted">
                    خرید پرو و اولترا به‌زودی فعال می‌شود
                  </span>
                </div>
              )}

              <div className="relative z-10 flex flex-1 flex-col space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-canvas px-2.5 py-1 text-[10px] font-bold text-jar-muted">
                      {isBasic ? (
                        <Zap className="h-3 w-3 text-emerald-600" />
                      ) : isUltra ? (
                        <Crown className="h-3 w-3 text-jar-logo" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-jar-primary" />
                      )}
                      {isBasic ? "شروع رایگان" : isUltra ? "بالاترین سطح" : "حرفه‌ای"}
                    </div>
                    <h3 className="text-base font-black text-jar-primary">{plan.nameFa}</h3>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                      فعال
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black tracking-tight text-jar-primary">
                      {formatToman(price)}
                    </span>
                    <span className="text-[11px] font-bold text-jar-muted">
                      تومان{isBasic ? " · رایگان" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] font-semibold text-jar-muted">{periodLabel}</p>
                </div>

                <ul className="space-y-2.5">
                  {parseFeatures(plan.features).map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-[11px] font-semibold leading-relaxed text-jar-primary/90">
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-2">
                  {isBasic ? (
                    <button
                      type="button"
                      onClick={continueWithBasic}
                      disabled={isPending}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-jar-primary text-xs font-black text-white transition-all hover:bg-jar-primaryHover active:scale-[0.98] disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      {isCurrent ? "ادامه با بیسیک" : "انتخاب بیسیک و ادامه"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-jar-canvas text-xs font-black text-jar-muted"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      به‌زودی
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
