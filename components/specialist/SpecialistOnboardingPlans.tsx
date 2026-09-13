"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
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

export default function SpecialistOnboardingPlans({
  plans,
  currentPlanKey,
}: {
  plans: OnboardingPlan[];
  currentPlanKey?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const basic = useMemo(
    () => plans.find((p) => p.key === "basic") || plans[0],
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

  if (!basic) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
        پلن پایه‌ای در سیستم تعریف نشده است.
      </div>
    );
  }

  const isCurrent = currentPlanKey === basic.key || !currentPlanKey;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}

      <div className="rounded-[28px] border border-emerald-200/80 bg-jar-surface p-6 sm:p-7 ring-1 ring-emerald-100 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-canvas px-2.5 py-1 text-[10px] font-bold text-jar-muted">
              <Zap className="h-3 w-3 text-emerald-600" />
              شروع رایگان
            </div>
            <h3 className="text-base font-black text-jar-primary">{basic.nameFa}</h3>
          </div>
          {isCurrent && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
              فعال
            </span>
          )}
        </div>

        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black tracking-tight text-jar-primary">۰</span>
            <span className="text-[11px] font-bold text-jar-muted">تومان · رایگان دائمی</span>
          </div>
        </div>

        <ul className="space-y-2.5">
          {parseFeatures(basic.features).map((feat) => (
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

        <button
          type="button"
          onClick={continueWithBasic}
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-jar-primary text-xs font-black text-white transition-all hover:bg-jar-primaryHover active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          ادامه با اشتراک رایگان
        </button>
      </div>

      <p className="text-center text-[11px] font-medium text-jar-muted leading-relaxed">
        پلن‌های حرفه‌ای پولی بعداً اضافه می‌شوند؛ الان با بیسیک می‌توانید پرونده را کامل و برای بررسی بفرستید.
      </p>
    </div>
  );
}
