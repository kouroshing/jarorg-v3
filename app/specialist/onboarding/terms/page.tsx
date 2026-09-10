import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";
import SpecialistTermsForm from "@/components/specialist/SpecialistTermsForm";

export const dynamic = "force-dynamic";

export default async function OnboardingTermsStepPage() {
  const session = await getSession();
  if (!session) redirect("/join");

  const state = await getSpecialistOnboardingStateAction();

  if (state.status === "PENDING_REVIEW" || state.status === "SUSPENDED") {
    redirect("/specialist/onboarding/review");
  }
  if (state.status === "ACTIVE") {
    redirect(state.nextStep || "/specialist/projects");
  }
  if (!state.hasEligiblePortfolio) {
    redirect("/specialist/onboarding/portfolio");
  }
  if (!state.hasCity || !state.baseLat || !state.baseLng) {
    redirect("/specialist/onboarding/details");
  }

  return (
    <SpecialistOnboardingShell
      activeStep="terms"
      rightAction={
        <Link
          href="/specialist/onboarding/details"
          className="inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-4 py-1.5 text-xs font-medium"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          محل فعالیت
        </Link>
      }
    >
      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 space-y-2 shadow-xs">
        <h1 className="text-lg font-black">تعهدنامه و شرایط عضویت</h1>
        <p className="text-xs text-jar-muted leading-relaxed">
          متن کامل را بخوانید و در پایان بپذیرید. بدون این پذیرش، پرونده برای بررسی ادمین ارسال
          نمی‌شود.
        </p>
      </div>

      <SpecialistTermsForm initiallyAccepted={Boolean(state.agreedToTerms || state.hasNda)} />
    </SpecialistOnboardingShell>
  );
}
