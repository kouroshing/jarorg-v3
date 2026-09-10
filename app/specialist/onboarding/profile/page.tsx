import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";
import SpecialistProfileBasicsForm from "@/components/specialist/SpecialistProfileBasicsForm";

export const dynamic = "force-dynamic";

export default async function SpecialistOnboardingProfilePage() {
  const session = await getSession();
  if (!session) redirect("/join");

  const state = await getSpecialistOnboardingStateAction();
  if (state.status === "PENDING_REVIEW" || state.status === "SUSPENDED") {
    redirect("/specialist/onboarding/review");
  }
  if (state.status === "ACTIVE") {
    redirect(state.nextStep || "/specialist/projects");
  }

  return (
    <SpecialistOnboardingShell activeStep="profile">
      <SpecialistProfileBasicsForm
        initialDisplayName={state.displayName || ""}
        initialAvatarUrl={state.avatarUrl || null}
        phoneDisplay={state.phoneDisplay || ""}
      />
    </SpecialistOnboardingShell>
  );
}
