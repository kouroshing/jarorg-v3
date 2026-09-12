import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { phoneToLocalDisplay } from "@/lib/auth/phone";
import EditProfileForm from "./EditProfileForm";
import ProfileAppShell, {
  type SpecialistGate,
} from "@/components/profile/ProfileAppShell";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect(encodeURI("/login?redirect=/profile/edit"));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    redirect(encodeURI("/profile"));
  }

  await repairOrphanSpecialistRole(session.userId);
  const access = await getSpecialistAccess(session.userId);

  let specialistGate: SpecialistGate = {
    state: "locked",
    href: "/specialist/onboarding/profile",
  };
  if (access.kind === "active") {
    specialistGate = { state: "open", href: "/specialist/projects" };
  } else if (access.kind === "onboarding" || access.kind === "pending") {
    specialistGate = { state: "open", href: access.landingPath };
  }

  const phoneDisplay = phoneToLocalDisplay(session.phone);

  return (
    <ProfileAppShell
      panel="customer"
      phone={session.phone}
      displayName={user.displayName}
      specialistGate={specialistGate}
      customerActive="account"
    >
      <div className="mx-auto w-full max-w-2xl">
        <EditProfileForm
          initialName={user.displayName || ""}
          phoneDisplay={phoneDisplay}
        />
      </div>
    </ProfileAppShell>
  );
}
