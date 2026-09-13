import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistCategoriesAndPortfolio } from "@/app/actions/specialistPortfolioActions";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistPortfolioManager from "@/components/specialist/SpecialistPortfolioManager";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";
import ProfileEditPendingBanner from "@/components/specialist/ProfileEditPendingBanner";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";

export const dynamic = "force-dynamic";

export default async function SpecialistPortfolioPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login?redirect=/specialist/portfolio");
  }

  await repairOrphanSpecialistRole(session.userId);
  const access = await getSpecialistAccess(session.userId);
  if (access.kind === "none") {
    redirect("/profile");
  }
  // Incomplete specialists edit portfolio from onboarding, not the app shell.
  if (access.kind === "onboarding" || access.kind === "pending") {
    redirect(access.landingPath);
  }

  const [result, state] = await Promise.all([
    getSpecialistCategoriesAndPortfolio(),
    getSpecialistOnboardingStateAction(),
  ]);

  return (
    <SpecialistAppShell active="portfolio" phone={session.phone}>
      <div className="space-y-4">
        <ProfileEditPendingBanner
          status={state.profileEditStatus}
          note={state.profileEditNote}
        />
        <SpecialistPortfolioManager
          initialSelectedCategories={result.selectedCategories || []}
          initialPortfolioItems={result.portfolioItems || []}
          mode="manage"
        />
      </div>
    </SpecialistAppShell>
  );
}
