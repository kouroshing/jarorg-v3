import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistKycForm from "@/components/specialist/SpecialistKycForm";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";
import { isKycDeadlineSuspension, KYC_DEADLINE_DAYS } from "@/lib/kyc/gates";
import { enforceKycDeadlineForSpecialist } from "@/lib/kyc/deadline";

export const dynamic = "force-dynamic";

export default async function SpecialistIdentityPage() {
  const session = await getSession();
  if (!session) redirect("/join");

  if (session.userId) {
    await enforceKycDeadlineForSpecialist(session.userId);
  }

  const state = await getSpecialistOnboardingStateAction();

  const deadlineSuspended =
    state.status === "SUSPENDED" && isKycDeadlineSuspension(state.reviewNote);
  if (state.status !== "ACTIVE" && !deadlineSuspended) {
    redirect(state.nextStep || "/specialist/onboarding");
  }

  return (
    <SpecialistAppShell active="identity" phone={session.phone}>
      <div className="max-w-xl mx-auto space-y-4">
        <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-6 shadow-xs space-y-1">
          <h1 className="text-lg font-black text-jar-primary">احراز هویت</h1>
          <p className="text-sm text-jar-muted leading-relaxed">
            از زمان تایید پرونده توسط جار، {KYC_DEADLINE_DAYS.toLocaleString("fa-IR")} روز
            فرصت دارید هویت و شبا را تکمیل کنید. بدون احراز تاییدشده، اعلام آمادگی روی
            پروژه‌ها و تسویه ممکن نیست.
          </p>
        </div>
        <SpecialistKycForm
          kycStatus={state.kycStatus || "NONE"}
          nationalIdMask={state.kycNationalIdMask}
          shabaMask={state.kycShabaMask}
          failureReason={state.kycFailureReason}
          bankName={state.kycBankName}
          firstName={state.kycFirstName}
          lastName={state.kycLastName}
          fatherName={state.kycFatherName}
          deadlineDaysLeft={state.kycDeadlineDaysLeft ?? null}
          deadlineExpired={Boolean(state.kycDeadlineExpired) || deadlineSuspended}
          deadlineDays={state.kycDeadlineDays ?? KYC_DEADLINE_DAYS}
        />
      </div>
    </SpecialistAppShell>
  );
}
