import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";
import SpecialistCategoriesForm from "@/components/specialist/SpecialistCategoriesForm";

export const dynamic = "force-dynamic";

export default async function SpecialistOnboardingCategoriesPage() {
  const session = await getSession();
  if (!session) redirect("/join");

  const state = await getSpecialistOnboardingStateAction();
  if (state.status === "PENDING_REVIEW" || state.status === "SUSPENDED") {
    redirect("/specialist/onboarding/review");
  }
  if (state.status === "ACTIVE") {
    redirect(state.nextStep || "/specialist/projects");
  }
  if (!state.hasAvatar || !state.hasDisplayName) {
    redirect("/specialist/onboarding/profile");
  }

  return (
    <SpecialistOnboardingShell activeStep="categories">
      <SpecialistCategoriesForm initialSelected={state.selectedCategories || []} />
    </SpecialistOnboardingShell>
  );
}
