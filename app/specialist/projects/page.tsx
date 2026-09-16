import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAvailableOrdersForSpecialistAction } from "@/app/actions/marketplaceActions";
import SpecialistProjectFeed from "@/components/specialist/SpecialistProjectFeed";
import SpecialistAppShell from "@/components/specialist/SpecialistAppShell";
import { countSpecialistMineOrders } from "@/lib/orders/specialist-feed";
import {
  getSpecialistAccess,
  repairOrphanSpecialistRole,
} from "@/lib/specialists/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "کارتابل پروژه‌های باز | پنل متخصص جار",
  description: "مشاهده سفارشات جدید و اعلام آمادگی برای پروژه‌های عکاسی و فیلمبرداری",
};

export default async function SpecialistProjectsFeedPage() {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect("/join");
  }

  await repairOrphanSpecialistRole(session.userId);
  const access = await getSpecialistAccess(session.userId);

  // Pure customers must not see the specialist shell at all.
  if (access.kind === "none") {
    redirect("/profile");
  }

  // Incomplete / pending → hard redirect to the right onboarding step
  // instead of rendering an empty shell with an error card.
  if (access.kind !== "active") {
    redirect(access.landingPath);
  }

  const result = await getAvailableOrdersForSpecialistAction();

  if (!result.success && result.redirectTo) {
    redirect(result.redirectTo);
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
        kycReady={result.kycReady !== false}
        kycStatus={result.kycStatus ?? null}
        kycDeadlineDaysLeft={result.kycDeadlineDaysLeft ?? null}
        kycDeadlineExpired={Boolean(result.kycDeadlineExpired)}
        kycDeadlineMessage={result.kycDeadlineMessage ?? null}
        specialistCity={result.specialistCity ?? null}
        specialistHasBase={Boolean(result.specialistHasBase)}
      />
    </SpecialistAppShell>
  );
}
