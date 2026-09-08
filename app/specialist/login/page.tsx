import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SpecialistLoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/specialist/portfolio");
  }
  redirect(encodeURI("/login?redirect=/specialist/portfolio"));
}
