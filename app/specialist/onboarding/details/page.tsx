import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistDetailsForm from "@/components/specialist/SpecialistDetailsForm";
import BrandLogo from "@/components/BrandLogo";
import JarBillowBackground from "@/components/home/JarBillowBackground";

export const dynamic = "force-dynamic";

export default async function OnboardingDetailsStepPage() {
  const session = await getSession();
  if (!session) {
    redirect(encodeURI("/join"));
  }

  const onboardingState = await getSpecialistOnboardingStateAction();

  const hasEligible = onboardingState.hasEligiblePortfolio ?? false;
  const maxCount = onboardingState.maxPortfolioInCategory || 0;

  return (
    <div className="jar-theme relative min-h-screen bg-jar-canvas text-jar-primary selection:bg-jar-primary/10 pb-24 overflow-x-hidden" dir="rtl">
      <JarBillowBackground />

      {/* Floating Onboarding Header */}
      <header className="fixed inset-x-0 top-3 z-50 px-4 md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between rounded-full border border-jar-border bg-jar-surface/80 px-4 sm:px-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <BrandLogo />
            <div className="flex flex-col border-r border-jar-border pr-2.5 mr-1">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-jar-primary leading-none">
                احراز صلاحیت متخصصان
              </span>
              <span className="text-[10px] font-medium text-jar-logo leading-tight mt-0.5">
                گام ۲ از ۲: مشخصات فردی و تعهدنامه
              </span>
            </div>
          </div>

          <Link
            href="/specialist/onboarding/portfolio"
            className="inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface hover:bg-jar-soft px-4 py-1.5 text-xs font-medium text-jar-primary transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>بازگشت به نمونه‌کارها</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 space-y-6">
        {/* Stepper and Status Header */}
        <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 shadow-xs backdrop-blur-xl space-y-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-jar-canvas border border-jar-border text-jar-logo px-3 py-0.5 text-[11px] font-bold">
              <Sparkles className="h-3 w-3 text-jar-logo" />
              <span>مرحله نهایی تکمیل مدارک</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-jar-primary">
              مشخصات کاری، محدوده فعالیت و تعهد حفظ حریم خصوصی
            </h1>
            <p className="text-xs text-jar-muted leading-relaxed font-medium">
              اطلاعات این بخش برای هماهنگی اعزام و تطبیق سفارشات با لوکیشن و تجهیزات شما مورد نیاز است. همچنین پذیرش رسمی تعهدنامه عدم انتشار (NDA) ضامن امنیت فایل‌های کارفرمایان است.
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-jar-border text-xs font-medium">
            <Link
              href="/specialist/onboarding/portfolio"
              className="flex items-center gap-2 p-2.5 rounded-full border border-jar-border bg-jar-surface hover:bg-jar-soft transition-colors text-jar-primary"
            >
              <CheckCircle2 className={`h-4 w-4 ${hasEligible ? "text-emerald-600" : "text-amber-500"}`} />
              <span>۱. نمونه‌کارها ({hasEligible ? "تکمیل شد" : `${maxCount}/۱۰`})</span>
            </Link>
            <div className="flex items-center gap-2 p-2.5 rounded-full bg-jar-primary text-white shadow-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-jar-primary text-[10px] font-bold">۲</span>
              <span>۲. شهر و تعهدنامه حفظ محرمانگی (NDA)</span>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <SpecialistDetailsForm
          initialCity={onboardingState.city}
          initialWorkArea={onboardingState.workArea}
          initialBio={onboardingState.bio}
          initialEquipment={onboardingState.equipmentSummary}
          initialAgreedToTerms={onboardingState.agreedToTerms ?? onboardingState.hasNda}
          initialBaseLat={onboardingState.baseLat}
          initialBaseLng={onboardingState.baseLng}
          initialBaseAddress={onboardingState.baseAddress}
          hasEligiblePortfolio={hasEligible}
        />
      </main>
    </div>
  );
}
