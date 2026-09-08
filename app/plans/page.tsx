import { getSession } from "@/lib/auth/session";
import PlansClientPage from "./PlansClientPage";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const session = await getSession();
  const isLoggedIn = !!session;

  return <PlansClientPage isLoggedIn={isLoggedIn} />;
}
