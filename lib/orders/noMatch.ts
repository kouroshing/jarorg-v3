import "server-only";

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

/** Copy when a matching order times out with no specialist selected. */
export const NO_MATCH_ADMIN_NOTE =
  "متأسفانه برای این پروژه متخصص مناسبی پیدا نشد. پیشنهاد می‌کنیم بودجه یا جزئیات را کمی ویرایش کنید (مثلاً افزایش قیمت، انعطاف در زمان/محل) و دوباره منتشر کنید تا شانس بیشتری داشته باشید.";

export const NO_MATCH_NOTIF_TITLE = "متأسفانه متخصصی پیدا نشد";

export function noMatchNotifMessage(categoryTitle: string | null | undefined): string {
  return `برای سفارش «${
    categoryTitle || "عکاسی"
  }» ظرف مهلت جستجو متخصص مناسبی اعلام آمادگی نکرد. می‌توانید قیمت یا جزئیات را ویرایش کنید و دوباره منتشر کنید — این کار معمولاً پیشنهادهای بیشتری می‌آورد.`;
}

/**
 * Idempotent NO_MATCH for timed-out matching orders (cron + lazy page fallback).
 */
export async function applyDueNoMatches(options?: { limit?: number }): Promise<number> {
  const limit = Math.min(30, options?.limit ?? 15);
  const settings = await prisma.pwaSettings.findUnique({
    where: { id: "system-config" },
    select: { matchingTimeoutDays: true },
  });
  const days = Math.max(1, settings?.matchingTimeoutDays ?? 3);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const candidates = await prisma.order.findMany({
    where: {
      status: { in: ["MATCHING", "HAS_APPLICANTS"] },
      selectedSpecialistId: null,
      paidAt: null,
      noMatchAt: null,
      OR: [
        { publishedAt: { lte: cutoff } },
        { AND: [{ publishedAt: null }, { createdAt: { lte: cutoff } }] },
      ],
    },
    select: {
      id: true,
      categoryTitle: true,
      userId: true,
    },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let closed = 0;
  for (const o of candidates) {
    const claimed = await prisma.order.updateMany({
      where: {
        id: o.id,
        noMatchAt: null,
        status: { in: ["MATCHING", "HAS_APPLICANTS"] },
        selectedSpecialistId: null,
      },
      data: {
        status: "NO_MATCH",
        noMatchAt: new Date(),
        adminNote: NO_MATCH_ADMIN_NOTE,
      },
    });
    if (claimed.count !== 1) continue;
    closed += 1;

    const pending = await prisma.projectInterest.findMany({
      where: { orderId: o.id, status: "PENDING" },
      select: { specialistId: true },
    });
    if (pending.length > 0) {
      await prisma.projectInterest.updateMany({
        where: { orderId: o.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      for (const { specialistId } of pending) {
        await createNotification({
          userId: specialistId,
          title: "پروژه از بورد خارج شد",
          message: `مهلت جستجوی پروژه «${
            o.categoryTitle || "عکاسی"
          }» به پایان رسید و از بورد فعال خارج شد.`,
          type: "INFO",
          link: "/specialist/projects",
        }).catch(() => undefined);
      }
    }
    if (o.userId) {
      await createNotification({
        userId: o.userId,
        title: NO_MATCH_NOTIF_TITLE,
        message: noMatchNotifMessage(o.categoryTitle),
        type: "INFO",
        link: `/order/${o.id}`,
      }).catch(() => undefined);
    }
  }
  return closed;
}
