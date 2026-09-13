import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import { getPlansList } from "@/app/actions/planActions";
import { prisma } from "@/lib/prisma";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";
import SpecialistOnboardingPlans from "@/components/specialist/SpecialistOnboardingPlans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "انتخاب اشتراک | ثبت‌نام متخصص جار",
};

export default async function SpecialistOnboardingSubscriptionPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/join");

  const state = await getSpecialistOnboardingStateAction();

  if (state.status === "PENDING_REVIEW" || state.status === "SUSPENDED") {
    redirect("/specialist/onboarding/review");
  }
  if (state.status === "ACTIVE") {
    redirect(state.nextStep || "/specialist/projects");
  }
  if (!state.hasAvatar || !state.hasDisplayName) {
    redirect("/specialist/onboarding/profile");
  }
  if (!state.hasCategories) {
    redirect("/specialist/onboarding/categories");
  }
  if (!state.hasEligiblePortfolio) {
    redirect("/specialist/onboarding/portfolio");
  }

  const [plansRes, user] = await Promise.all([
    getPlansList(),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { planId: true },
    }),
  ]);

  if (!plansRes.success || !plansRes.data?.length) {
    redirect("/specialist/onboarding/details");
  }

  const plans = plansRes.data.map((p) => ({
    key: p.key,
    nameFa: p.nameFa,
    price3Months: p.price3Months,
    price12Months: p.price12Months,
    features: p.features,
  }));

  const currentPlanKey =
    plansRes.data.find((p) => p.id === user?.planId)?.key ?? null;

  return (
    <SpecialistOnboardingShell
      activeStep="subscription"
      subtitle="سطح دسترسی خود را انتخاب کنید"
      rightAction={
        <Link
          href="/specialist/onboarding/portfolio"
          className="inline-flex items-center gap-1.5 rounded-full border border-jar-border bg-jar-surface px-4 py-1.5 text-xs font-medium"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          نمونه‌کارها
        </Link>
      }
    >
      <section className="relative overflow-hidden rounded-[32px] border border-jar-border bg-jar-surface/90 p-6 sm:p-8 shadow-xs backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-jar-logo/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-jar-logo/25 bg-jar-logo/10 px-3 py-1 text-[11px] font-bold text-jar-logo">
            <Sparkles className="h-3.5 w-3.5" />
            اشتراک متخصص
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            با کدام سطح وارد جار می‌شوید؟
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm text-jar-muted leading-relaxed font-medium">
            بیسیک رایگان و دائمی است. پلن‌های پولی بعداً فعال می‌شوند. بعد از ادامه، محل
            فعالیت را تکمیل می‌کنید.
          </p>
        </div>
      </section>

      <SpecialistOnboardingPlans plans={plans} currentPlanKey={currentPlanKey} />
    </SpecialistOnboardingShell>
  );
}
