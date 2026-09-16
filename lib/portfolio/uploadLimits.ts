import "server-only";

import { prisma } from "@/lib/prisma";

/** Soft rate limit across all categories (rolling 24h). No per-hour / per-category / total hard caps. */
export const PORTFOLIO_MAX_PER_DAY = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Rate limit for specialist portfolio uploads.
 * Returns a Persian error message, or null if allowed.
 */
export async function checkPortfolioUploadLimits(
  specialistId: string,
  _categorySlug: string
): Promise<string | null> {
  const sinceDay = new Date(Date.now() - DAY_MS);

  const dailyCount = await prisma.portfolioItem.count({
    where: { specialistId, createdAt: { gte: sinceDay } },
  });

  if (dailyCount >= PORTFOLIO_MAX_PER_DAY) {
    return `حداکثر ${PORTFOLIO_MAX_PER_DAY} بارگذاری در شبانه‌روز مجاز است. لطفاً فردا دوباره تلاش کنید.`;
  }

  return null;
}
