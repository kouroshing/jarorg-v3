import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistDetailsForm from "@/components/specialist/SpecialistDetailsForm";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";

export const dynamic = "force-dynamic";

export default async function OnboardingDetailsStepPage() {
  const session = await getSession();
  if (!session) redirect("/join");

  const onboardingState = await getSpecialistOnboardingStateAction();

  if (onboardingState.status === "PENDING_REVIEW" || onboardingState.status === "SUSPENDED") {
    redirect("/specialist/onboarding/review");
  }
  if (onboardingState.status === "ACTIVE") {
    redirect(onboardingState.nextStep || "/specialist/projects");
  }
  if (!onboardingState.hasEligiblePortfolio) {
    redirect("/specialist/onboarding/portfolio");
  }
  if (!onboardingState.hasPlan) {
    redirect("/specialist/onboarding/subscription");
  }

  return (
    <SpecialistOnboardingShell
      activeStep="details"
      rightAction={
        <Link
          href="/specialist/onboarding/subscription"
          className="inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-4 py-1.5 text-xs font-medium"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          اشتراک
        </Link>
      }
    >
      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 space-y-2 shadow-xs">
        <h1 className="text-lg font-black">محل فعالیت</h1>
        <p className="text-xs text-jar-muted leading-relaxed">
          اول مبدأ حرکت را روی نقشه تأیید کنید، بعد شعاع پوشش را ببینید و تنظیم کنید. استودیو مسیر
          جداگانه دارد.
        </p>
      </div>

      <SpecialistDetailsForm
        initialCity={onboardingState.city}
        initialWorkArea={onboardingState.workArea}
        initialEquipment={onboardingState.equipmentSummary}
        initialBaseLat={onboardingState.baseLat}
        initialBaseLng={onboardingState.baseLng}
        initialBaseAddress={onboardingState.baseAddress}
        initialHasStudio={Boolean(onboardingState.hasStudio)}
        initialIsMobileGrapher={Boolean(onboardingState.isMobileGrapher)}
        hasEligiblePortfolio={true}
      />
    </SpecialistOnboardingShell>
  );
}
