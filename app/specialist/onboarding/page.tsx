import { redirect } from "next/navigation";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";

export const dynamic = "force-dynamic";

export default async function SpecialistOnboardingPage() {
  const state = await getSpecialistOnboardingStateAction();

  if (!state.isLoggedIn) {
    redirect(encodeURI("/join"));
  }

  // The job board is only reachable through an admin approval, so this hub just
  // forwards to whichever step is actually blocking the specialist.
  redirect(encodeURI(state.nextStep || "/specialist/onboarding/portfolio"));
}
