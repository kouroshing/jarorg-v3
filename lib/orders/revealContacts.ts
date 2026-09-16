import "server-only";

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const LEAD_HOURS = 24;

/**
 * Idempotent contact reveal for due CONFIRMED orders.
 * Cron (scripts/reveal-contacts.mjs) still runs in background; this covers lag.
 */
export async function revealDueOrderContacts(options?: {
  /** Limit work when called from a page render. */
  limit?: number;
  orderIds?: string[];
}): Promise<number> {
  const limit = Math.min(40, options?.limit ?? 20);
  const threshold = new Date(Date.now() + LEAD_HOURS * 60 * 60 * 1000);

  const due = await prisma.order.findMany({
    where: {
      paidAt: { not: null },
      contactRevealedAt: null,
      status: "CONFIRMED",
      OR: [
        { scheduledAt: { not: null, lte: threshold } },
        { scheduledAt: null },
      ],
      ...(options?.orderIds?.length ? { id: { in: options.orderIds } } : {}),
    },
    select: {
      id: true,
      categoryTitle: true,
      selectedSpecialistId: true,
      userId: true,
    },
    take: limit,
    orderBy: { scheduledAt: "asc" },
  });

  let revealed = 0;
  for (const o of due) {
    const claimed = await prisma.order.updateMany({
      where: { id: o.id, contactRevealedAt: null },
      data: { contactRevealedAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    revealed += 1;
    const project = o.categoryTitle || "عکاسی";
    if (o.selectedSpecialistId) {
      await createNotification({
        userId: o.selectedSpecialistId,
        title: "اطلاعات تماس آزاد شد",
        message: `شماره تماس و نشانی دقیق پروژه «${project}» حالا در دسترس شماست.`,
        type: "INFO",
        link: `/order/${o.id}`,
      }).catch(() => undefined);
    }
    if (o.userId) {
      await createNotification({
        userId: o.userId,
        title: "هماهنگی نهایی",
        message: `شماره تماس شما برای هماهنگی نهایی پروژه «${project}» در اختیار متخصص قرار گرفت.`,
        type: "INFO",
        link: `/order/${o.id}`,
      }).catch(() => undefined);
    }
  }
  return revealed;
}
