import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistCategoriesAndPortfolio } from "@/app/actions/specialistPortfolioActions";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistPortfolioManager from "@/components/specialist/SpecialistPortfolioManager";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";
import { MIN_PORTFOLIO_ITEMS_PER_CATEGORY } from "@/lib/specialists/eligibility";

export const dynamic = "force-dynamic";

export default async function OnboardingPortfolioStepPage() {
  const session = await getSession();
  if (!session) redirect("/join");

  const [portfolioData, onboardingState] = await Promise.all([
    getSpecialistCategoriesAndPortfolio(),
    getSpecialistOnboardingStateAction(),
  ]);

  if (onboardingState.status === "PENDING_REVIEW" || onboardingState.status === "SUSPENDED") {
    redirect("/specialist/onboarding/review");
  }
  if (onboardingState.status === "ACTIVE") {
    redirect(onboardingState.nextStep || "/specialist/projects");
  }
  if (!onboardingState.hasAvatar || !onboardingState.hasDisplayName) {
    redirect("/specialist/onboarding/profile");
  }
  if (!onboardingState.hasCategories) {
    redirect("/specialist/onboarding/categories");
  }

  const hasEligible = onboardingState.hasEligiblePortfolio;
  const fulfilledCount = onboardingState.fulfilledPortfolioCategories ?? 0;
  const selectedCount = onboardingState.selectedCategoryCount ?? 0;

  return (
    <SpecialistOnboardingShell
      activeStep="portfolio"
      rightAction={
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/specialist/onboarding/categories"
            className="inline-flex items-center gap-1 rounded-full border border-jar-border bg-jar-canvas px-2.5 sm:px-3 py-1.5 text-[11px] font-bold text-jar-primary hover:bg-jar-soft transition-colors"
          >
            <ArrowRight className="h-3 w-3" />
            <span className="hidden sm:inline">قبل</span>
          </Link>
          {hasEligible ? (
            <Link
              href="/specialist/onboarding/subscription"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 sm:px-3 py-1.5 text-[11px] font-bold hover:bg-emerald-700 transition-colors"
            >
              <span className="hidden sm:inline">بعد</span>
              <ArrowLeft className="h-3 w-3" />
            </Link>
          ) : (
            <span
              title={`${fulfilledCount.toLocaleString("fa-IR")} از ${Math.max(selectedCount, 1).toLocaleString("fa-IR")} دسته کامل`}
              className="inline-flex items-center gap-1 rounded-full border border-jar-border bg-jar-canvas px-2.5 sm:px-3 py-1.5 text-[11px] font-bold text-jar-muted cursor-not-allowed"
            >
              <span className="hidden sm:inline">بعد</span>
              <ArrowLeft className="h-3 w-3 opacity-50" />
            </span>
          )}
        </div>
      }
    >
      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 space-y-3 shadow-xs">
        <h1 className="text-lg font-black">نمونه‌کارها</h1>
        <p className="text-xs text-jar-muted leading-relaxed">
          برای هر دسته‌بندی انتخاب‌شده حداقل{" "}
          {MIN_PORTFOLIO_ITEMS_PER_CATEGORY.toLocaleString("fa-IR")} نمونه‌کار واقعی بارگذاری
          کنید. ادمین همین فایل‌ها را بررسی می‌کند.
        </p>
        <div
          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${
            hasEligible
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-jar-canvas border-jar-border text-jar-primary"
          }`}
        >
          {hasEligible ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-jar-logo" />
          )}
          {hasEligible
            ? "شرط نمونه‌کار در همه دسته‌ها تکمیل شد"
            : `${fulfilledCount.toLocaleString("fa-IR")} از ${Math.max(selectedCount, 1).toLocaleString("fa-IR")} دسته کامل (${MIN_PORTFOLIO_ITEMS_PER_CATEGORY.toLocaleString("fa-IR")} فایل در هر دسته)`}
        </div>
      </div>

      <SpecialistPortfolioManager
        initialSelectedCategories={portfolioData.selectedCategories || []}
        initialPortfolioItems={portfolioData.portfolioItems || []}
        mode="onboarding"
        continueHref="/specialist/onboarding/subscription"
      />
    </SpecialistOnboardingShell>
  );
}
