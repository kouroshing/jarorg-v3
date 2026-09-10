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

  return (
    <SpecialistOnboardingShell
      activeStep="details"
      rightAction={
        <Link
          href="/specialist/onboarding/portfolio"
          className="inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-4 py-1.5 text-xs font-medium"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          نمونه‌کارها
        </Link>
      }
    >
      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 space-y-2 shadow-xs">
        <h1 className="text-lg font-black">محل فعالیت</h1>
        <p className="text-xs text-jar-muted leading-relaxed">
          شهر و نقطه پایه روی نقشه برای هماهنگی اعزام و محاسبه ایاب‌وذهاب لازم است. تعهدنامه در گام بعدی است.
        </p>
      </div>

      <SpecialistDetailsForm
        initialCity={onboardingState.city}
        initialWorkArea={onboardingState.workArea}
        initialBio={onboardingState.bio}
        initialEquipment={onboardingState.equipmentSummary}
        initialBaseLat={onboardingState.baseLat}
        initialBaseLng={onboardingState.baseLng}
        initialBaseAddress={onboardingState.baseAddress}
        hasEligiblePortfolio={true}
      />
    </SpecialistOnboardingShell>
  );
}
