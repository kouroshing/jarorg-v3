import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistCategoriesAndPortfolio } from "@/app/actions/specialistPortfolioActions";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistPortfolioManager from "@/components/specialist/SpecialistPortfolioManager";
import BrandLogo from "@/components/BrandLogo";
import JarBillowBackground from "@/components/home/JarBillowBackground";

export const dynamic = "force-dynamic";

export default async function OnboardingPortfolioStepPage() {
  const session = await getSession();
  if (!session) {
    redirect(encodeURI("/join"));
  }

  const [portfolioData, onboardingState] = await Promise.all([
    getSpecialistCategoriesAndPortfolio(),
    getSpecialistOnboardingStateAction(),
  ]);

  const hasEligible = onboardingState.hasEligiblePortfolio;
  const maxCount = onboardingState.maxPortfolioInCategory || 0;

  return (
    <div className="jar-theme relative min-h-screen bg-jar-canvas text-jar-primary selection:bg-jar-primary/10 pb-24 overflow-x-hidden" dir="rtl">
      <JarBillowBackground />

      {/* Floating Onboarding Header */}
      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-full border border-jar-border bg-jar-surface/80 px-4 sm:px-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <BrandLogo />
            <div className="flex flex-col border-r border-jar-border pr-2.5 mr-1">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-jar-primary leading-none">
                احراز صلاحیت متخصصان
              </span>
              <span className="text-[10px] font-medium text-jar-logo leading-tight mt-0.5">
                گام ۱ از ۲: نمونه‌کارها
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasEligible ? (
              <Link
                href="/specialist/onboarding/details"
                className="inline-flex items-center gap-1.5 rounded-full bg-jar-primary hover:bg-jar-primaryHover text-white px-5 py-1.5 text-xs font-medium transition-colors"
              >
                <span>مرحله بعد: اطلاعات فردی</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-jar-canvas border border-jar-border text-jar-primary px-3 py-1 text-[11px] font-medium">
                <span>{maxCount}/۱۰ فایل بارگذاری شده</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Progress & Guidance Banner */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 space-y-6">
        <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 shadow-xs backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-jar-canvas border border-jar-border text-jar-logo px-3 py-0.5 text-[11px] font-bold">
                <Sparkles className="h-3 w-3 text-jar-logo" />
                <span>الزام استاندارد پلتفرم جار</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-jar-primary">
                بارگذاری حداقل ۱۰ نمونه‌کار باکیفیت در یک شاخه تخصصی
              </h1>
              <p className="text-xs text-jar-muted leading-relaxed font-medium max-w-2xl">
                برای فعال‌سازی کارتابل و معرفی شما به سفارشات و مشتریان، لازم است حداقل ۱۰ فایل نمونه‌کار واقعی در حداقل یک شاخه تخصصی بارگذاری فرمایید.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              {hasEligible ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2.5">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold">شرط نمونه‌کار تکمیل شد!</span>
                    <span className="text-[10px] text-emerald-800">حداقل ۱۰ نمونه‌کار با موفقیت ثبت شد</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-jar-canvas border border-jar-border text-jar-primary flex items-center gap-2.5">
                  <AlertCircle className="h-6 w-6 text-jar-logo shrink-0" />
                  <div>
                    <span className="block text-xs font-bold">در انتظار بارگذاری ({maxCount}/۱۰)</span>
                    <span className="text-[10px] text-jar-muted">حداقل ۱۰ فایل در یک دسته‌بندی نیاز است</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-jar-border text-xs font-medium">
            <div className="flex items-center gap-2 p-2.5 rounded-full bg-jar-primary text-white shadow-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-jar-primary text-[10px] font-bold">۱</span>
              <span>بارگذاری نمونه‌کارها ({hasEligible ? "تکمیل شد" : `${maxCount}/۱۰`})</span>
            </div>
            <Link
              href={hasEligible ? "/specialist/onboarding/details" : "#"}
              className={`flex items-center gap-2 p-2.5 rounded-full border transition-all ${
                hasEligible
                  ? "bg-jar-surface text-jar-primary border-jar-border hover:bg-jar-soft cursor-pointer"
                  : "bg-jar-canvas text-jar-muted/50 border-jar-border cursor-not-allowed"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-jar-border text-jar-muted text-[10px] font-bold">۲</span>
              <span>شهر و تعهدنامه حفظ محرمانگی (NDA)</span>
            </Link>
          </div>
        </div>

        {/* Portfolio Manager Component */}
        <SpecialistPortfolioManager
          initialSelectedCategories={portfolioData.selectedCategories || []}
          initialPortfolioItems={portfolioData.portfolioItems || []}
          initialAgreedToTerms={portfolioData.agreedToTerms || false}
        />
      </main>
    </div>
  );
}
