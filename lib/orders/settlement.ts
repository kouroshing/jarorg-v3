import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { settlementAmount } from "@/lib/orders/settings";
import type { OrderStatus } from "@/lib/orders/status";

/**
 * Releasing escrow to the specialist.
 *
 * The client pays Jar in full when they choose someone. That money sits with
 * Jar until the work is delivered; this is where it moves. The specialist's
 * share lands in the wallet they already withdraw gallery earnings from, so
 * there is one payout rail rather than two.
 *
 * Commission comes out of the specialist's own fee only — travel reimburses a
 * cost they have already borne, and taking a cut of it would quietly penalise
 * whoever had to drive furthest.
 */

/** How long the client has to confirm delivery before Jar releases anyway. */
export const AUTO_RELEASE_DAYS = 7;

export type SettlementResult =
  | { ok: true; amount: number; alreadySettled: false }
  | { ok: true; amount: number; alreadySettled: true }
  | { ok: false; error: string };

/**
 * Marks an order complete and pays the specialist.
 *
 * Idempotent on `settledAt`: a double click, a retried cron run, or an admin
 * pressing the button after the client already confirmed must not pay twice.
 * The balance update and the ledger entry share one transaction, so the running
 * total and its explanation can never disagree.
 */
export async function settleOrder(
  orderId: string,
  reason: "CLIENT_CONFIRMED" | "AUTO_RELEASED" | "ADMIN_RELEASED"
): Promise<SettlementResult> {
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          paidAt: true,
          settledAt: true,
          settledAmount: true,
          disputedAt: true,
          disputeResolvedAt: true,
          selectedSpecialistId: true,
          categoryTitle: true,
          agreedBasePrice: true,
          agreedTravelFee: true,
          commissionPercent: true,
        },
      });

      if (!order) return { kind: "error" as const, error: "سفارش یافت نشد." };

      if (order.settledAt) {
        return { kind: "already" as const, amount: order.settledAmount ?? 0 };
      }

      if (!order.paidAt) {
        return {
          kind: "error" as const,
          error: "این سفارش هنوز پرداخت نشده است؛ مبلغی برای تسویه وجود ندارد.",
        };
      }

      // An open dispute freezes the payout. resolveDisputeAction closes the
      // dispute before calling back in, so an admin decision still gets through.
      if (order.disputedAt && !order.disputeResolvedAt && reason !== "ADMIN_RELEASED") {
        return {
          kind: "error" as const,
          error: "کارفرما برای این پروژه اعتراض ثبت کرده است؛ تسویه تا بررسی متوقف است.",
        };
      }

      if (!order.selectedSpecialistId) {
        return { kind: "error" as const, error: "متخصصی برای این سفارش انتخاب نشده است." };
      }

      const amount = settlementAmount(order);
      if (amount <= 0) {
        return { kind: "error" as const, error: "مبلغ قابل تسویه صفر است." };
      }

      const specialist = await tx.user.update({
        where: { id: order.selectedSpecialistId },
        data: { walletBalance: { increment: amount } },
        select: { id: true, walletBalance: true },
      });

      await tx.walletEntry.create({
        data: {
          userId: specialist.id,
          amount,
          type: "ORDER_SETTLEMENT",
          balanceAfter: specialist.walletBalance,
          orderId: order.id,
          note: noteFor(reason, order.categoryTitle),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "COMPLETED" satisfies OrderStatus,
          settledAt: new Date(),
          settledAmount: amount,
        },
      });

      return {
        kind: "settled" as const,
        amount,
        specialistId: specialist.id,
        categoryTitle: order.categoryTitle,
      };
    });

    if (outcome.kind === "error") return { ok: false, error: outcome.error };
    if (outcome.kind === "already") {
      return { ok: true, amount: outcome.amount, alreadySettled: true };
    }

    await createNotification({
      userId: outcome.specialistId,
      title: "تسویه انجام شد",
      message: `مبلغ ${outcome.amount.toLocaleString("fa-IR")} تومان بابت پروژه «${
        outcome.categoryTitle || "عکاسی"
      }» به کیف پول شما اضافه شد.`,
      type: "SUCCESS",
      link: "/dashboard/wallet",
    });

    return { ok: true, amount: outcome.amount, alreadySettled: false };
  } catch (error) {
    console.error("[settleOrder] failed:", error);
    return { ok: false, error: "خطا در تسویه سفارش." };
  }
}

function noteFor(
  reason: "CLIENT_CONFIRMED" | "AUTO_RELEASED" | "ADMIN_RELEASED",
  categoryTitle: string | null
): string {
  const project = categoryTitle || "عکاسی";
  switch (reason) {
    case "CLIENT_CONFIRMED":
      return `تسویه پروژه «${project}» پس از تأیید کارفرما`;
    case "AUTO_RELEASED":
      return `تسویه خودکار پروژه «${project}» پس از ${AUTO_RELEASE_DAYS} روز از تحویل`;
    case "ADMIN_RELEASED":
      return `تسویه دستی پروژه «${project}» توسط پشتیبانی جار`;
  }
}

/**
 * Orders whose client never responded to a delivery report. Used by the
 * auto-release script; without it, money sits with Jar indefinitely whenever a
 * client simply stops replying.
 */
export async function findOrdersDueForAutoRelease(now = new Date()) {
  const cutoff = new Date(now.getTime() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000);
  return prisma.order.findMany({
    where: {
      settledAt: null,
      paidAt: { not: null },
      deliveredAt: { lte: cutoff },
      status: "CONFIRMED",
      // A client who complained is not a client who went quiet.
      disputedAt: null,
    },
    select: {
      id: true,
      categoryTitle: true,
      deliveredAt: true,
      agreedTotalPrice: true,
      selectedSpecialistId: true,
    },
    orderBy: { deliveredAt: "asc" },
  });
}
