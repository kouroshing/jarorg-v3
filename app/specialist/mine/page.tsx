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
  title: "پروژه‌های من | پنل متخصص جار",
  description: "پیشنهادهای ارسال‌شده، انتخاب کارفرما و پروژه‌های قطعی",
};

export default async function SpecialistMinePage() {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect("/join");
  }

  await repairOrphanSpecialistRole(session.userId);
  const access = await getSpecialistAccess(session.userId);
  if (access.kind === "none") {
    redirect("/profile");
  }
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
      active="mine"
      phone={session.phone}
      mineCount={countSpecialistMineOrders(orders)}
    >
      <SpecialistProjectFeed
        variant="mine"
        initialOrders={orders}
        initialTokens={result.tokens}
        authError={authError}
        redirectTo={redirectTo}
        kycReady={result.kycReady !== false}
        kycStatus={result.kycStatus ?? null}
        specialistHasBase={Boolean(result.specialistHasBase)}
      />
    </SpecialistAppShell>
  );
}
