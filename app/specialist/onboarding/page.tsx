import { redirect } from "next/navigation";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";

export const dynamic = "force-dynamic";

export default async function SpecialistOnboardingPage() {
  const state = await getSpecialistOnboardingStateAction();

  if (!state.isLoggedIn) {
    redirect(encodeURI("/join"));
  }

  // Enforce structured onboarding routing
  if (!state.hasEligiblePortfolio) {
    redirect(encodeURI("/specialist/onboarding/portfolio"));
  }

  if (!state.hasCity || !state.hasNda) {
    redirect(encodeURI("/specialist/onboarding/details"));
  }

  // All criteria met -> redirect to marketplace feed
  redirect(encodeURI("/specialist/projects"));
}
