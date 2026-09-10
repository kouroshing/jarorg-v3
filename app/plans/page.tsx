import { getSession } from "@/lib/auth/session";
import { getPlansList } from "@/app/actions/planActions";
import PlansClientPage from "./PlansClientPage";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const session = await getSession();
  const result = await getPlansList();
  const plans = (result.data ?? []).map((plan) => ({
    key: plan.key,
    nameFa: plan.nameFa,
    price3Months: plan.price3Months,
    price12Months: plan.price12Months,
    features: plan.features,
  }));

  return <PlansClientPage isLoggedIn={!!session} plans={plans} />;
}
