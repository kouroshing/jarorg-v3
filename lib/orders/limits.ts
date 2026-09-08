import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * How many projects a specialist may apply to in a day.
 *
 * The cap exists so a handful of specialists cannot blanket every new order,
 * which buries the clients' shortlists in noise and leaves newer specialists
 * with nothing. Tying it to the subscription plan makes it the one thing a paid
 * plan sells that is actually worth money to a specialist: more work. The
 * existing tiers sell badges and cloud storage, which nobody upgrades for.
 */

/** Statuses that consume the daily allowance. Dismissals do not. */
const COUNTED_STATUSES = ["PENDING", "SELECTED", "ACCEPTED", "REJECTED", "WITHDRAWN", "DECLINED"];

export type ApplicationAllowance = {
  /** Proposals allowed today. */
  limit: number;
  used: number;
  remaining: number;
  /** Plan the limit came from, for the message shown to the specialist. */
  planName: string;
  /** True when the specialist can still apply. */
  canApply: boolean;
  /** Local midnight tonight — when the allowance resets. */
  resetsAt: Date;
};

/** Start of the current day in Tehran, expressed as a UTC instant. */
export function startOfDayTehran(now = new Date()): Date {
  // Iran dropped daylight saving in 2022, so the offset is a constant +03:30.
  const OFFSET_MS = 3.5 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET_MS);
}

export function endOfDayTehran(now = new Date()): Date {
  return new Date(startOfDayTehran(now).getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Resolves the allowance for one specialist. A plan that has expired stops
 * counting — the limit falls back to the free tier rather than silently
 * granting a paid allowance forever.
 */
export async function getApplicationAllowance(
  specialistId: string,
  now = new Date()
): Promise<ApplicationAllowance> {
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: specialistId },
      select: { planId: true, planExpiresAt: true },
    }),
    prisma.pwaSettings.findUnique({
      where: { id: "system-config" },
      select: { freeDailyApplicationLimit: true },
    }),
  ]);

  const freeLimit = Math.max(0, settings?.freeDailyApplicationLimit ?? 3);

  let limit = freeLimit;
  let planName = "پلن رایگان";

  const planActive =
    user?.planId && (!user.planExpiresAt || user.planExpiresAt.getTime() > now.getTime());

  if (planActive && user?.planId) {
    const plan = await prisma.plan.findUnique({
      where: { id: user.planId },
      select: { nameFa: true, dailyApplicationLimit: true },
    });
    if (plan) {
      limit = Math.max(0, plan.dailyApplicationLimit);
      planName = plan.nameFa;
    }
  }

  const used = await prisma.projectInterest.count({
    where: {
      specialistId,
      status: { in: COUNTED_STATUSES },
      createdAt: { gte: startOfDayTehran(now) },
    },
  });

  // A limit of 0 in the admin panel means unlimited, not "cannot apply" —
  // otherwise setting a tier to 0 would silently lock those specialists out.
  const unlimited = limit === 0;
  const remaining = unlimited ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);

  return {
    limit,
    used,
    remaining,
    planName,
    canApply: unlimited || remaining > 0,
    resetsAt: endOfDayTehran(now),
  };
}

/** Message shown when a specialist has used up the day's allowance. */
export function allowanceExhaustedMessage(allowance: ApplicationAllowance): string {
  return (
    `سقف درخواست‌های امروز شما (${allowance.limit.toLocaleString("fa-IR")} پروژه در ${allowance.planName}) ` +
    `تکمیل شده است. فردا دوباره می‌توانید درخواست بدهید، یا با ارتقای پلن سقف بیشتری بگیرید.`
  );
}
