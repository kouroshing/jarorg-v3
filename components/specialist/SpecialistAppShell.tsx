import React from "react";
import ProfileAppShell, {
  type SpecialistGate,
} from "@/components/profile/ProfileAppShell";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";
import { getSession } from "@/lib/auth/session";

/**
 * Specialist pages share the same profile chrome (switcher + bottom nav).
 * Resolves gate from session so every specialist route stays consistent.
 */
export default async function SpecialistAppShell({
  active,
  phone,
  mineCount,
  children,
}: {
  active: "projects" | "mine" | "portfolio" | "profile" | "studio" | "identity";
  phone?: string | null;
  mineCount?: number;
  children: React.ReactNode;
}) {
  const session = await getSession();
  let gate: SpecialistGate = {
    state: "locked",
    href: "/specialist/onboarding/profile",
  };

  if (session?.userId) {
    await repairOrphanSpecialistRole(session.userId);
    const access = await getSpecialistAccess(session.userId);
    if (access.kind === "active") {
      gate = { state: "open", href: "/specialist/projects" };
    } else if (access.kind === "onboarding" || access.kind === "pending") {
      gate = { state: "open", href: access.landingPath };
    } else {
      gate = { state: "locked", href: "/specialist/onboarding/profile" };
    }
  }

  return (
    <ProfileAppShell
      panel="specialist"
      active={active}
      phone={phone ?? session?.phone}
      specialistGate={gate}
      mineCount={mineCount}
    >
      {children}
    </ProfileAppShell>
  );
}
