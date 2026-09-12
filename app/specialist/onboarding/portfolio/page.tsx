import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistCategoriesAndPortfolio } from "@/app/actions/specialistPortfolioActions";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistPortfolioManager from "@/components/specialist/SpecialistPortfolioManager";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";

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
  const maxCount = onboardingState.maxPortfolioInCategory || 0;

  return (
    <SpecialistOnboardingShell
      activeStep="portfolio"
      rightAction={
        hasEligible ? (
          <Link
            href="/specialist/onboarding/subscription"
            className="inline-flex items-center gap-1.5 rounded-full bg-jar-primary text-white px-4 py-1.5 text-xs font-medium"
          >
            مرحله بعد
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-[11px] font-bold text-jar-muted">
            {maxCount.toLocaleString("fa-IR")}/۱۰
          </span>
        )
      }
    >
      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 space-y-3 shadow-xs">
        <h1 className="text-lg font-black">نمونه‌کارها</h1>
        <p className="text-xs text-jar-muted leading-relaxed">
          حداقل ۱۰ نمونه‌کار واقعی در یکی از دسته‌های انتخاب‌شده بارگذاری کنید. ادمین همین فایل‌ها را بررسی می‌کند.
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
            ? "شرط نمونه‌کار تکمیل شد"
            : `${maxCount.toLocaleString("fa-IR")} از ۱۰ فایل در بهترین دسته`}
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
