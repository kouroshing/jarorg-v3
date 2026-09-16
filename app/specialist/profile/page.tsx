import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Work-profile editor lives inside the unified Instagram-style studio. */
export default function SpecialistWorkingProfilePage() {
  redirect("/specialist/portfolio?tab=work");
}
