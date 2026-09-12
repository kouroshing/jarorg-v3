import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";

export const dynamic = "force-dynamic";

/**
 * Specialist hub: intentional specialists continue onboarding / board.
 * Pure customers (no specialist profile) go to /join — never auto-enroll them.
 */
export default async function SpecialistHomePage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/join");
  }

  await repairOrphanSpecialistRole(session.userId);
  const access = await getSpecialistAccess(session.userId);

  if (access.kind === "none") {
    redirect("/join");
  }

  redirect(access.landingPath || "/specialist/onboarding/profile");
}
