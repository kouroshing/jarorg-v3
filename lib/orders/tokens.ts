import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Monthly tokens: what a specialist spends to act on a project.
 *
 * This replaces a daily cap. Both ration the same thing, but they read
 * completely differently: "10 tokens this month" describes a pool you own,
 * while "3 per day" describes a door being held shut. The pool also lets
 * someone spend six on a good Thursday instead of losing the ones they did not
 * use on a quiet Tuesday.
 *
 * A token is spent per decision — applying or dismissing. Dismissing is not
 * free on purpose: a specialist who can clear the whole board for nothing finds
 * out in one afternoon exactly how many projects there are.
 */

/** Interest statuses that represent a spent token. */
const SPENT_APPLY = ["PENDING", "SELECTED", "ACCEPTED", "REJECTED", "WITHDRAWN", "DECLINED"];
const SPENT_DISMISS = ["NOT_INTERESTED"];

/** Keep NOT_INTERESTED for token burn; feed can show the order again after undismiss. */
export const UNDISMISS_SHOW_MARKER = "__SHOW_AFTER_DISMISS__";

export type TokenBalance = {
  granted: number;
  spent: number;
  remaining: number;
  planName: string;
  costApply: number;
  costDismiss: number;
  /** First moment of next month in Tehran — when the grant renews. */
  renewsAt: Date;
};

/** Start of the current Persian month, as a UTC instant. */
export function startOfMonthTehran(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).formatToParts(now);

  const day = Number(parts.find((p) => p.type === "day")?.value ?? 1);
  // Step back to the first of the Persian month, then to that day's midnight.
  const firstOfMonth = new Date(now.getTime() - (day - 1) * 24 * 60 * 60 * 1000);
  const OFFSET_MS = 3.5 * 60 * 60 * 1000;
  const local = new Date(firstOfMonth.getTime() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET_MS);
}

/** First moment of the next Persian month. */
export function startOfNextMonthTehran(now = new Date()): Date {
  // Persian months are 29–31 days; walk forward from this month's start until
  // the month number changes, rather than assuming a length.
  const start = startOfMonthTehran(now);
  const monthOf = (d: Date) =>
    new Intl.DateTimeFormat("en-US-u-ca-persian", {
      month: "numeric",
      timeZone: "Asia/Tehran",
    }).format(d);
  const thisMonth = monthOf(start);
  for (let i = 28; i <= 32; i += 1) {
    const candidate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    if (monthOf(candidate) !== thisMonth) return startOfMonthTehran(candidate);
  }
  return new Date(start.getTime() + 31 * 24 * 60 * 60 * 1000);
}

export async function getTokenBalance(
  specialistId: string,
  now = new Date(),
  db: typeof prisma = prisma
): Promise<TokenBalance> {
  const [user, settings] = await Promise.all([
    db.user.findUnique({
      where: { id: specialistId },
      select: { planId: true, planExpiresAt: true },
    }),
    db.pwaSettings.findUnique({
      where: { id: "system-config" },
      select: {
        freeMonthlyTokens: true,
        tokenCostApply: true,
        tokenCostDismiss: true,
      },
    }),
  ]);

  const costApply = Math.max(1, settings?.tokenCostApply ?? 1);
  const costDismiss = Math.max(0, settings?.tokenCostDismiss ?? 1);

  let granted = Math.max(0, settings?.freeMonthlyTokens ?? 10);
  let planName = "پلن رایگان";

  // An expired plan falls back to the free grant rather than silently renewing.
  const planActive =
    user?.planId && (!user.planExpiresAt || user.planExpiresAt.getTime() > now.getTime());

  if (planActive && user?.planId) {
    const plan = await db.plan.findUnique({
      where: { id: user.planId },
      select: { nameFa: true, monthlyTokens: true },
    });
    if (plan) {
      granted = Math.max(0, plan.monthlyTokens);
      planName = plan.nameFa;
    }
  }

  const since = startOfMonthTehran(now);
  const [applied, dismissed] = await Promise.all([
    db.projectInterest.count({
      where: { specialistId, status: { in: SPENT_APPLY }, createdAt: { gte: since } },
    }),
    db.projectInterest.count({
      where: { specialistId, status: { in: SPENT_DISMISS }, updatedAt: { gte: since } },
    }),
  ]);

  const spent = applied * costApply + dismissed * costDismiss;

  return {
    granted,
    spent,
    remaining: Math.max(0, granted - spent),
    planName,
    costApply,
    costDismiss,
    renewsAt: startOfNextMonthTehran(now),
  };
}

export function canAfford(balance: TokenBalance, action: "apply" | "dismiss"): boolean {
  const cost = action === "apply" ? balance.costApply : balance.costDismiss;
  return balance.remaining >= cost;
}

export function outOfTokensMessage(balance: TokenBalance, action: "apply" | "dismiss"): string {
  const cost = action === "apply" ? balance.costApply : balance.costDismiss;
  const what = action === "apply" ? "ثبت پیشنهاد" : "رد کردن پروژه";
  return (
    `${what} ${cost.toLocaleString("fa-IR")} توکن نیاز دارد و توکن‌های این ماه شما ` +
    `(${balance.granted.toLocaleString("fa-IR")} توکن در ${balance.planName}) تمام شده است. ` +
    `با ارتقای پلن، توکن بیشتری بگیرید.`
  );
}
