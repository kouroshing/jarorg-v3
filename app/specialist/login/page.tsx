import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";

export const dynamic = "force-dynamic";

export default async function SpecialistLoginPage() {
  const session = await getSession();
  // Sole unauthenticated specialist entry is /join (not customer /login).
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
