import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * A specialist may hold as many projects as they like — just not two at once.
 *
 * Checked when they apply, so they never make a promise they cannot keep, and
 * again when a client selects them, because a conflict can appear in between:
 * two clients can each pick the same specialist for the same Friday afternoon
 * within seconds of each other.
 *
 * Only commitments count. An open proposal is not a commitment — a specialist
 * can quote three overlapping Fridays and take whichever one is chosen first.
 */

/** Orders whose specialist is genuinely committed for that slot. */
const COMMITTED_STATUSES = ["AWAITING_PAYMENT", "CONFIRMED"];

export type ScheduleConflict = {
  orderId: string;
  categoryTitle: string | null;
  scheduledAt: Date;
  durationHours: number;
};

/** Buffer either side of a shoot: nobody teleports across Tehran. */
const TRAVEL_BUFFER_HOURS = 1;

/**
 * Returns the committed order that clashes with the given window, or null.
 *
 * An order with no `scheduledAt` — a flexible booking, or one predating the
 * scheduling column — cannot be checked, so it never blocks. Guessing would be
 * worse than not knowing: a false conflict silently costs the specialist work.
 */
export async function findScheduleConflict(
  specialistId: string,
  scheduledAt: Date | null | undefined,
  durationHours: number,
  excludeOrderId?: string
): Promise<ScheduleConflict | null> {
  if (!scheduledAt) return null;

  const HOUR = 60 * 60 * 1000;
  const bufferMs = TRAVEL_BUFFER_HOURS * HOUR;
  const windowStart = new Date(scheduledAt.getTime() - bufferMs);
  const windowEnd = new Date(scheduledAt.getTime() + durationHours * HOUR + bufferMs);

  // Widened by the longest plausible shoot so the database can use the index on
  // scheduledAt; exact overlap is decided in code below.
  const MAX_SHOOT_HOURS = 24;
  const candidates = await prisma.order.findMany({
    where: {
      selectedSpecialistId: specialistId,
      status: { in: COMMITTED_STATUSES },
      scheduledAt: {
        not: null,
        gte: new Date(windowStart.getTime() - MAX_SHOOT_HOURS * HOUR),
        lte: windowEnd,
      },
      ...(excludeOrderId ? { NOT: { id: excludeOrderId } } : {}),
    },
    select: { id: true, categoryTitle: true, scheduledAt: true, durationHours: true },
  });

  for (const other of candidates) {
    if (!other.scheduledAt) continue;
    const otherStart = other.scheduledAt.getTime();
    const otherEnd = otherStart + other.durationHours * HOUR;
    // Half-open intervals: a shoot ending exactly when the next begins is fine
    // once the buffer has been added to both sides.
    if (otherStart < windowEnd.getTime() && otherEnd > windowStart.getTime()) {
      return {
        orderId: other.id,
        categoryTitle: other.categoryTitle,
        scheduledAt: other.scheduledAt,
        durationHours: other.durationHours,
      };
    }
  }

  return null;
}

export function conflictMessage(conflict: ScheduleConflict): string {
  const when = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(conflict.scheduledAt);

  return (
    `در این بازه پروژه دیگری دارید: «${conflict.categoryTitle || "عکاسی"}» در ${when} ` +
    `(${conflict.durationHours.toLocaleString("fa-IR")} ساعت). ` +
    `می‌توانید چند پروژه همزمان داشته باشید، ولی نه در یک زمان.`
  );
}
