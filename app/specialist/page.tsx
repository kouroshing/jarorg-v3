import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";

export const dynamic = "force-dynamic";

export default async function SpecialistHomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/join");
  }

  // `nextStep` already accounts for the review queue, so an approved specialist
  // lands on the board and everyone else lands on the step that is actually
  // blocking them.
  const state = await getSpecialistOnboardingStateAction();
  redirect(state.nextStep || "/specialist/onboarding/portfolio");
}
