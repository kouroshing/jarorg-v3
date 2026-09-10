import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAvailableOrdersForSpecialistAction } from "@/app/actions/marketplaceActions";
import SpecialistProjectFeed from "@/components/specialist/SpecialistProjectFeed";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";
import { countSpecialistMineOrders } from "@/lib/orders/specialist-feed";
import { SPECIALIST_REVIEW_PATH } from "@/lib/specialists/eligibility";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "کارتابل پروژه‌های باز | پنل متخصص جار",
  description: "مشاهده سفارشات جدید و اعلام آمادگی برای پروژه‌های عکاسی و فیلمبرداری",
};

export default async function SpecialistProjectsFeedPage() {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect(encodeURI("/login?redirect=/specialist/projects"));
  }

  const result = await getAvailableOrdersForSpecialistAction();

  // Someone still in the review queue gets the waiting room, not an error box
  // inside a panel they are not allowed to use.
  if (!result.success && result.redirectTo === SPECIALIST_REVIEW_PATH) {
    redirect(SPECIALIST_REVIEW_PATH);
  }

  const orders = result.success && result.orders ? result.orders : [];
  const authError = !result.success ? result.error : undefined;
  const redirectTo = !result.success ? result.redirectTo : undefined;

  return (
    <SpecialistAppShell
      active="projects"
      phone={session.phone}
      mineCount={countSpecialistMineOrders(orders)}
    >
      <SpecialistProjectFeed
        variant="open"
        initialOrders={orders}
        initialTokens={result.tokens}
        authError={authError}
        redirectTo={redirectTo}
      />
    </SpecialistAppShell>
  );
}
