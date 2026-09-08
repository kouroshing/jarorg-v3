import "server-only";

import { prisma } from "@/lib/prisma";

/** Max submissions per phone within the rolling window. */
const MAX_SUBMISSIONS_PER_PHONE = 3;
const ROLLING_WINDOW_MS = 60 * 60 * 1000;

/** Minimum gap between two submissions from the same phone. */
const MIN_GAP_MS = 30_000;

/**
 * Returns a user-facing error message when rate limit is exceeded, otherwise null.
 */
export async function checkProjectSubmissionRateLimit(
  contactPhone: string
): Promise<string | null> {
  const now = Date.now();
  const windowStart = new Date(now - ROLLING_WINDOW_MS);

  const tooSoon = await prisma.project.findFirst({
    where: {
      contactPhone,
      createdAt: { gte: new Date(now - MIN_GAP_MS) },
    },
    select: { id: true },
  });

  if (tooSoon) {
    return "لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.";
  }

  const count = await prisma.project.count({
    where: {
      contactPhone,
      createdAt: { gte: windowStart },
    },
  });

  if (count >= MAX_SUBMISSIONS_PER_PHONE) {
    return "تعداد درخواست‌های شما در این بازه زیاد است. لطفاً یک ساعت دیگر تلاش کنید.";
  }

  return null;
}
