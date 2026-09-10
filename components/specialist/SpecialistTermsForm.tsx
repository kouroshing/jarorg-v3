"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import SpecialistMembershipTerms from "@/components/legal/SpecialistMembershipTerms";
import { acceptSpecialistTermsAction } from "@/app/actions/specialistOnboardingActions";

export default function SpecialistTermsForm({
  initiallyAccepted = false,
}: {
  initiallyAccepted?: boolean;
}) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(initiallyAccepted);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!accepted) {
      setError("برای ادامه، پذیرش تعهدنامه الزامی است.");
      return;
    }

    startTransition(async () => {
      const res = await acceptSpecialistTermsAction();
      if (!res.success) {
        setError(res.error || "خطا در ثبت پذیرش تعهدنامه.");
        return;
      }
      router.push(res.redirect || "/specialist/onboarding/review");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-8 shadow-xs max-h-[min(70vh,640px)] overflow-y-auto">
        <SpecialistMembershipTerms />
      </div>

      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-6 shadow-xs space-y-4">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-jar-border text-jar-primary focus:ring-jar-primary cursor-pointer"
          />
          <span className="text-xs sm:text-sm font-bold text-jar-primary leading-relaxed">
            تعهدنامه حسن انجام کار، محرمانگی (NDA) و شرایط عضویت متخصصین جار را به‌طور کامل
            خوانده‌ام و می‌پذیرم. ثبت این پذیرش به‌منزله امضای الکترونیکی الزام‌آور است.
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending || !accepted}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-jar-primary text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          تعهدنامه را خواندم و می‌پذیرم
        </button>

        {initiallyAccepted && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            قبلاً پذیرفته‌اید؛ با تایید مجدد، زمان پذیرش به‌روز می‌شود.
          </p>
        )}
      </div>
    </form>
  );
}
