import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistCategoriesAndPortfolio } from "@/app/actions/specialistPortfolioActions";
import SpecialistPortfolioManager from "@/components/specialist/SpecialistPortfolioManager";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";

export const dynamic = "force-dynamic";

export default async function SpecialistPortfolioPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/specialist/portfolio");
  }

  const result = await getSpecialistCategoriesAndPortfolio();

  return (
    <SpecialistAppShell active="portfolio" phone={session.phone}>
      <SpecialistPortfolioManager
        initialSelectedCategories={result.selectedCategories || []}
        initialPortfolioItems={result.portfolioItems || []}
      />
    </SpecialistAppShell>
  );
}
