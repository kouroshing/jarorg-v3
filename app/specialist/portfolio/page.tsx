import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistCategoriesAndPortfolio } from "@/app/actions/specialistPortfolioActions";
import SpecialistPortfolioManager from "@/components/specialist/SpecialistPortfolioManager";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";
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

  const result = await getSpecialistCategoriesAndPortfolio();

  return (
    <SpecialistAppShell active="portfolio" phone={session.phone}>
      <SpecialistPortfolioManager
        initialSelectedCategories={result.selectedCategories || []}
        initialPortfolioItems={result.portfolioItems || []}
        mode="manage"
      />
    </SpecialistAppShell>
  );
}
