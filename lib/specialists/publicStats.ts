import "server-only";

import { prisma } from "@/lib/prisma";

export type SpecialistPublicStats = {
  completedProjects: number;
  approvedPortfolio: number;
};

/** Trust signals for client-facing specialist cards / public profile. */
export async function getSpecialistPublicStats(
  userId: string,
  specialistProfileId?: string | null
): Promise<SpecialistPublicStats> {
  const [completedProjects, approvedPortfolio] = await Promise.all([
    prisma.order.count({
      where: {
        selectedSpecialistId: userId,
        OR: [{ status: "COMPLETED" }, { settledAt: { not: null } }],
      },
    }),
    specialistProfileId
      ? prisma.portfolioItem.count({
          where: {
            specialistId: specialistProfileId,
            reviewStatus: "APPROVED",
          },
        })
      : prisma.portfolioItem.count({
          where: {
            specialist: { userId },
            reviewStatus: "APPROVED",
          },
        }),
  ]);

  return { completedProjects, approvedPortfolio };
}
