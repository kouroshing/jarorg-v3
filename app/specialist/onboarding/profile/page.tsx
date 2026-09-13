import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";
import SpecialistProfileBasicsForm from "@/components/specialist/SpecialistProfileBasicsForm";

export const dynamic = "force-dynamic";

export default async function SpecialistOnboardingProfilePage() {
  const session = await getSession();
  if (!session) redirect("/join");

  const state = await getSpecialistOnboardingStateAction();
  if (state.status === "PENDING_REVIEW" || state.status === "SUSPENDED") {
    redirect("/specialist/onboarding/review");
  }
  // ACTIVE specialists missing a required avatar must stay here to upload.
  if (state.status === "ACTIVE" && state.hasAvatar) {
    redirect(state.nextStep || "/specialist/projects");
  }

  return (
    <SpecialistOnboardingShell activeStep="profile">
      {!state.hasAvatar ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-950 leading-relaxed">
          عکس پروفایل الزامی است. تا وقتی عکس آپلود نکنید، پروفایل شما برای کارفرما
          نمایش داده نمی‌شود و دسترسی به پروژه‌ها باز نمی‌شود.
        </div>
      ) : null}
      <SpecialistProfileBasicsForm
        initialDisplayName={state.displayName || ""}
        initialAvatarUrl={state.avatarUrl || null}
        phoneDisplay={state.phoneDisplay || ""}
      />
    </SpecialistOnboardingShell>
  );
}
