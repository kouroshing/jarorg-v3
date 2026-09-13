import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistKycForm from "@/components/specialist/SpecialistKycForm";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";

export const dynamic = "force-dynamic";

export default async function SpecialistIdentityPage() {
  const session = await getSession();
  if (!session) redirect("/join");

  const state = await getSpecialistOnboardingStateAction();

  if (state.status !== "ACTIVE") {
    redirect(state.nextStep || "/specialist/onboarding");
  }

  return (
    <SpecialistAppShell active="identity" phone={session.phone}>
      <div className="max-w-xl mx-auto space-y-4">
        <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-6 shadow-xs space-y-1">
          <h1 className="text-lg font-black text-jar-primary">احراز هویت</h1>
          <p className="text-sm text-jar-muted leading-relaxed">
            بعد از تایید کیفی پرونده، برای تسویه کیف‌پول مالکیت موبایل، کد ملی و
            مطابقت شبا به‌صورت آنلاین استعلام می‌شود.
          </p>
        </div>
        <SpecialistKycForm
          kycStatus={state.kycStatus || "NONE"}
          nationalIdMask={state.kycNationalIdMask}
          shabaMask={state.kycShabaMask}
          failureReason={state.kycFailureReason}
          bankName={state.kycBankName}
        />
      </div>
    </SpecialistAppShell>
  );
}
