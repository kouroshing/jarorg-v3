import "server-only";
import { prisma } from "@/lib/prisma";
import { toEnglishDigits } from "@/lib/auth/phone";
import type { SpecialistAgendaEvent } from "@/lib/orders/agendaShared";

export type { SpecialistAgendaEvent } from "@/lib/orders/agendaShared";

const COMMITTED_STATUSES = ["AWAITING_PAYMENT", "CONFIRMED"];

function toJalaliKeys(d: Date): { fa: string; en: string } {
  const fa = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const en = toEnglishDigits(fa);
  return { fa, en };
}

/**
 * Committed shoots for the specialist over the next `daysAhead` days (Tehran).
 * Used by the interest-modal work calendar (GitHub-style heatmap).
 */
export async function listSpecialistCommittedAgenda(
  specialistId: string,
  daysAhead = 28
): Promise<SpecialistAgendaEvent[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const rows = await prisma.order.findMany({
    where: {
      selectedSpecialistId: specialistId,
      status: { in: COMMITTED_STATUSES },
      scheduledAt: { not: null, gte: now, lte: horizon },
    },
    select: {
      id: true,
      categoryTitle: true,
      scheduledAt: true,
      durationHours: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  return rows
    .filter((r): r is typeof r & { scheduledAt: Date } => Boolean(r.scheduledAt))
    .map((r) => {
      const start = r.scheduledAt;
      const end = new Date(start.getTime() + Math.max(1, r.durationHours) * 60 * 60 * 1000);
      const keys = toJalaliKeys(start);
      return {
        orderId: r.id,
        categoryTitle: r.categoryTitle,
        scheduledAt: start.toISOString(),
        durationHours: r.durationHours,
        endAt: end.toISOString(),
        dateKeyFa: keys.fa,
        dateKeyEn: keys.en,
      };
    });
}
