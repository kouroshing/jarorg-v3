import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import CheckoutForm from "@/components/payment/CheckoutForm";
import { redirect } from "next/navigation";

export const metadata = {
  title: "پیش‌فاکتور خرید اشتراک | پلتفرم جار",
};

interface PageProps {
  params: {
    planId: string;
  };
  searchParams: {
    period?: string;
  };
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    const period = searchParams.period || "standard";
    redirect(encodeURI(`/login?redirect=${encodeURIComponent(`/checkout/${params.planId}?period=${period}`)}`));
  }

  // 1. Fetch Plan by key first (e.g. 'pro', 'ultra'), fallback to UUID
  let plan = await prisma.plan.findUnique({
    where: { key: params.planId }
  });

  if (!plan) {
    try {
      plan = await prisma.plan.findUnique({
        where: { id: params.planId }
      });
    } catch {
      // Ignored if planId is not a valid UUID format
    }
  }

  if (!plan) {
    redirect("/profile/upgrade");
  }

  const serializedPlan = {
    id: plan.id,
    key: plan.key,
    nameFa: plan.nameFa,
    price3Months: plan.price3Months,
    price12Months: plan.price12Months,
    features: plan.features
  };

  const period = searchParams.period || "standard";

  return (
    <div className="flex min-h-[50vh] items-center justify-center py-6">
      <CheckoutForm plan={serializedPlan} period={period} />
    </div>
  );
}
