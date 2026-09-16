import "server-only";

import { prisma } from "@/lib/prisma";
import { storedValuesFor } from "@/lib/orders/status";

export type SpecialistFunnelSnapshot = {
  /** Stock by onboarding / activation status */
  incomplete: number;
  pendingReview: number;
  active: number;
  activeKycVerified: number;
  activeKycPending: number;
  activeKycMissing: number;
  /** Of ACTIVE specialists */
  withAtLeastOneApply: number;
  withAtLeastOneCompleted: number;
  /** 30-day flow */
  profilesCreated30d: number;
  applies30d: number;
  completedWithSpecialist30d: number;
  /** Token knobs currently live */
  freeMonthlyTokens: number;
  tokenCostApply: number;
  tokenCostDismiss: number;
};

function pct(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

export function funnelPercents(s: SpecialistFunnelSnapshot) {
  return {
    applyRate: pct(s.withAtLeastOneApply, s.active),
    completeRate: pct(s.withAtLeastOneCompleted, s.active),
    kycRate: pct(s.activeKycVerified, s.active),
  };
}

export async function getSpecialistFunnelSnapshot(
  since30d: Date
): Promise<SpecialistFunnelSnapshot> {
  const [
    incomplete,
    pendingReview,
    active,
    activeKycVerified,
    activeKycPending,
    activeKycMissing,
    profilesCreated30d,
    applies30d,
    completedWithSpecialist30d,
    appliedSpecialistIds,
    completedSpecialistIds,
    settings,
  ] = await Promise.all([
    prisma.specialistProfile.count({ where: { status: "INCOMPLETE" } }),
    prisma.specialistProfile.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.specialistProfile.count({ where: { status: "ACTIVE" } }),
    prisma.specialistProfile.count({
      where: { status: "ACTIVE", kycStatus: "VERIFIED" },
    }),
    prisma.specialistProfile.count({
      where: { status: "ACTIVE", kycStatus: "PENDING" },
    }),
    prisma.specialistProfile.count({
      where: {
        status: "ACTIVE",
        kycStatus: { in: ["NONE", "FAILED"] },
      },
    }),
    prisma.specialistProfile.count({ where: { createdAt: { gte: since30d } } }),
    prisma.projectInterest.count({
      where: {
        createdAt: { gte: since30d },
        status: { not: "NOT_INTERESTED" },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: storedValuesFor("COMPLETED") },
        selectedSpecialistId: { not: null },
        OR: [{ settledAt: { gte: since30d } }, { createdAt: { gte: since30d } }],
      },
    }),
    prisma.projectInterest.findMany({
      where: {
        specialist: { specialistProfile: { status: "ACTIVE" } },
        status: { not: "NOT_INTERESTED" },
      },
      distinct: ["specialistId"],
      select: { specialistId: true },
    }),
    prisma.order.findMany({
      where: {
        selectedSpecialistId: { not: null },
        OR: [
          { status: { in: storedValuesFor("COMPLETED") } },
          { settledAt: { not: null } },
        ],
        selectedSpecialist: { specialistProfile: { status: "ACTIVE" } },
      },
      distinct: ["selectedSpecialistId"],
      select: { selectedSpecialistId: true },
    }),
    prisma.pwaSettings.findUnique({
      where: { id: "system-config" },
      select: {
        freeMonthlyTokens: true,
        tokenCostApply: true,
        tokenCostDismiss: true,
      },
    }),
  ]);

  return {
    incomplete,
    pendingReview,
    active,
    activeKycVerified,
    activeKycPending,
    activeKycMissing,
    withAtLeastOneApply: appliedSpecialistIds.length,
    withAtLeastOneCompleted: completedSpecialistIds.length,
    profilesCreated30d,
    applies30d,
    completedWithSpecialist30d,
    freeMonthlyTokens: settings?.freeMonthlyTokens ?? 10,
    tokenCostApply: settings?.tokenCostApply ?? 1,
    tokenCostDismiss: settings?.tokenCostDismiss ?? 1,
  };
}
