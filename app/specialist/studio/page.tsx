import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSpecialistOnboardingStateAction } from "@/app/actions/specialistOnboardingActions";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";
import SpecialistOnboardingShell from "@/components/specialist/SpecialistOnboardingShell";
import SpecialistStudioForm from "@/components/specialist/SpecialistStudioForm";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";

export const dynamic = "force-dynamic";

export default async function SpecialistStudioPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login?redirect=/specialist/studio");
  }

  await repairOrphanSpecialistRole(session.userId);
  const access = await getSpecialistAccess(session.userId);
  if (access.kind === "none") {
    redirect("/profile");
  }
  if (access.kind === "suspended") {
    redirect(access.landingPath);
  }
  // pending → allow edit from review wait; onboarding + active OK

  const state = await getSpecialistOnboardingStateAction();
  if (!state.hasAvatar || !state.hasDisplayName) {
    redirect("/specialist/onboarding/profile");
  }

  const form = (
    <SpecialistStudioForm
      initialName={state.studioName}
      initialLat={state.studioLat}
      initialLng={state.studioLng}
      initialAddress={state.studioAddress}
      requireApproval={access.kind === "active"}
      profileEditStatus={state.profileEditStatus}
      profileEditNote={state.profileEditNote}
    />
  );

  if (access.kind === "active") {
    return (
      <SpecialistAppShell active="studio" phone={session.phone}>
        <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 shadow-xs space-y-2">
          <h1 className="text-lg sm:text-xl font-black text-jar-primary">استودیو و فضای ثابت</h1>
          <p className="text-xs text-jar-muted leading-relaxed font-medium max-w-2xl">
            مبدأ حرکت برای پروژه‌های بیرون است؛ اینجا لوکیشن استودیو/فضای خودتان را جدا ثبت می‌کنید.
          </p>
        </div>
        {form}
      </SpecialistAppShell>
    );
  }

  return (
    <SpecialistOnboardingShell activeStep="details">
      <div className="rounded-3xl border border-jar-border bg-jar-surface p-5 sm:p-7 shadow-xs space-y-2">
        <h1 className="text-lg font-black text-jar-primary">استودیو و فضای ثابت</h1>
        <p className="text-xs text-jar-muted leading-relaxed">
          اختیاری است و جدا از مبدأ حرکت ثبت می‌شود. بعد از ذخیره می‌توانید به محل فعالیت برگردید.
        </p>
      </div>
      {form}
    </SpecialistOnboardingShell>
  );
}
