import "server-only";

import { prisma, ensurePrismaSchemaReady } from "@/lib/prisma";
import { REVIEW_DIRECTION } from "@/lib/orders/reviews";

export type SpecialistPublicStats = {
  completedProjects: number;
  approvedPortfolio: number;
  avgRating: number | null;
  ratingCount: number;
};

/** Trust signals for client-facing specialist cards / public profile. */
export async function getSpecialistPublicStats(
  userId: string,
  specialistProfileId?: string | null
): Promise<SpecialistPublicStats> {
  await ensurePrismaSchemaReady();

  const [completedProjects, approvedPortfolio, ratingAgg] = await Promise.all([
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
    prisma.orderReview.aggregate({
      where: {
        revieweeId: userId,
        direction: REVIEW_DIRECTION.CLIENT_TO_SPECIALIST,
      },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const count = ratingAgg._count._all;
  const avg = ratingAgg._avg.rating;

  return {
    completedProjects,
    approvedPortfolio,
    avgRating: count > 0 && avg != null ? Math.round(avg * 10) / 10 : null,
    ratingCount: count,
  };
}

/**
 * Batch average ratings for specialist user IDs (client→specialist only).
 */
export async function getSpecialistRatingAggregates(
  specialistUserIds: string[]
): Promise<Map<string, { avgRating: number; ratingCount: number }>> {
  const ids = [...new Set(specialistUserIds.filter(Boolean))];
  const map = new Map<string, { avgRating: number; ratingCount: number }>();
  if (ids.length === 0) return map;

  await ensurePrismaSchemaReady();

  const groups = await prisma.orderReview.groupBy({
    by: ["revieweeId"],
    where: {
      revieweeId: { in: ids },
      direction: REVIEW_DIRECTION.CLIENT_TO_SPECIALIST,
    },
    _avg: { rating: true },
    _count: { _all: true },
  });

  for (const g of groups) {
    const avg = g._avg.rating;
    if (avg == null || g._count._all <= 0) continue;
    map.set(g.revieweeId, {
      avgRating: Math.round(avg * 10) / 10,
      ratingCount: g._count._all,
    });
  }

  return map;
}
