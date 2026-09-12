import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";

export const dynamic = "force-dynamic";

export default async function SpecialistLoginPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect(encodeURI("/login?redirect=/specialist"));
  }

  await repairOrphanSpecialistRole(session.userId);
  const access = await getSpecialistAccess(session.userId);
  if (access.kind === "none") {
    redirect("/join");
  }
  redirect(access.landingPath || "/specialist/onboarding/profile");
}
