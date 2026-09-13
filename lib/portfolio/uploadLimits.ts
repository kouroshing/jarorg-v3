import "server-only";

import { prisma } from "@/lib/prisma";

export const PORTFOLIO_MAX_TOTAL = 40;
export const PORTFOLIO_MAX_PER_CATEGORY = 15;
export const PORTFOLIO_MAX_PER_HOUR = 10;
export const PORTFOLIO_MAX_PER_DAY = 30;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Caps + rate limits for specialist portfolio uploads.
 * Returns a Persian error message, or null if allowed.
 */
export async function checkPortfolioUploadLimits(
  specialistId: string,
  categorySlug: string
): Promise<string | null> {
  const now = Date.now();
  const sinceHour = new Date(now - HOUR_MS);
  const sinceDay = new Date(now - DAY_MS);

  const [totalCount, categoryCount, hourlyCount, dailyCount] = await Promise.all([
    prisma.portfolioItem.count({ where: { specialistId } }),
    prisma.portfolioItem.count({ where: { specialistId, categorySlug } }),
    prisma.portfolioItem.count({
      where: { specialistId, createdAt: { gte: sinceHour } },
    }),
    prisma.portfolioItem.count({
      where: { specialistId, createdAt: { gte: sinceDay } },
    }),
  ]);

  if (totalCount >= PORTFOLIO_MAX_TOTAL) {
    return `حداکثر ${PORTFOLIO_MAX_TOTAL} فایل نمونه‌کار مجاز است. برای بارگذاری جدید، ابتدا فایل‌های قبلی را حذف کنید.`;
  }

  if (categoryCount >= PORTFOLIO_MAX_PER_CATEGORY) {
    return `حداکثر ${PORTFOLIO_MAX_PER_CATEGORY} فایل در هر دسته‌بندی مجاز است. برای این دسته فایل‌های قبلی را حذف کنید.`;
  }

  if (hourlyCount >= PORTFOLIO_MAX_PER_HOUR) {
    return `حداکثر ${PORTFOLIO_MAX_PER_HOUR} بارگذاری در هر ساعت مجاز است. لطفاً کمی بعد دوباره تلاش کنید.`;
  }

  if (dailyCount >= PORTFOLIO_MAX_PER_DAY) {
    return `حداکثر ${PORTFOLIO_MAX_PER_DAY} بارگذاری در شبانه‌روز مجاز است. لطفاً فردا دوباره تلاش کنید.`;
  }

  return null;
}
