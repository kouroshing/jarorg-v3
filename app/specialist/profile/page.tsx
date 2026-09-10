import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";
import SpecialistDetailsForm from "@/components/specialist/SpecialistDetailsForm";

export const dynamic = "force-dynamic";

export default async function SpecialistWorkingProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirect=/specialist/profile");
  }

  const state = await getSpecialistOnboardingStateAction();
  if (!state.hasEligiblePortfolio) {
    redirect("/specialist/onboarding/portfolio");
  }

  return (
    <SpecialistAppShell active="profile" phone={session.phone}>
      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 shadow-xs space-y-2">
        <h1 className="text-lg sm:text-xl font-black text-jar-primary">پروفایل کاری</h1>
        <p className="text-xs text-jar-muted leading-relaxed font-medium max-w-2xl">
          شهر، مبدأ حرکت و تجهیزات اینجا ذخیره می‌شود. ایاب‌وذهاب هر پروژه از روی مبدأ شما حساب
          می‌شود. قیمت هر پروژه را هنگام اعلام آمادگی جداگانه می‌توانید تغییر دهید.
        </p>
      </div>

      <SpecialistDetailsForm
        mode="edit"
        returnTo="/specialist/profile"
        initialCity={state.city}
        initialWorkArea={state.workArea}
        initialBio={state.bio}
        initialEquipment={state.equipmentSummary}
        initialAgreedToTerms={state.agreedToTerms}
        initialBaseLat={state.baseLat}
        initialBaseLng={state.baseLng}
        initialBaseAddress={state.baseAddress}
        hasEligiblePortfolio={Boolean(state.hasEligiblePortfolio)}
      />
    </SpecialistAppShell>
  );
}
