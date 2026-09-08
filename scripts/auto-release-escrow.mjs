/**
 * Releases escrow for delivered projects the client never confirmed.
 *
 * A specialist finishes the shoot, reports delivery, and then waits on a client
 * who has stopped replying. Without this, their money sits with Jar forever.
 * After the grace period the payout goes through anyway; a client who has a
 * genuine complaint has had a week to raise it.
 *
 * Dry run by default. Pass --apply to release.
 *
 * Run it daily. On Liara, a scheduled job:
 *   node scripts/auto-release-escrow.mjs --apply
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const AUTO_RELEASE_DAYS = 7;

/** Mirrors settlementAmount() in lib/orders/settings.ts. */
function payoutFor(order) {
  const base = order.agreedBasePrice ?? 0;
  const travel = order.agreedTravelFee ?? 0;
  const rate = Math.min(100, Math.max(0, Math.round(order.commissionPercent ?? 0)));
  return base - Math.round((base * rate) / 100) + travel;
}

const toman = (n) => n.toLocaleString("en-US");

async function main() {
  console.log(APPLY ? "MODE: apply" : "MODE: dry run — pass --apply to release");
  console.log(`grace period: ${AUTO_RELEASE_DAYS} days after delivery\n`);

  const cutoff = new Date(Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000);

  const due = await prisma.order.findMany({
    where: {
      settledAt: null,
      paidAt: { not: null },
      status: "CONFIRMED",
      deliveredAt: { lte: cutoff },
      // A client who raised a dispute is not a client who went quiet; those
      // orders wait for an admin decision instead of paying out on schedule.
      disputedAt: null,
    },
    select: {
      id: true,
      categoryTitle: true,
      deliveredAt: true,
      selectedSpecialistId: true,
      agreedBasePrice: true,
      agreedTravelFee: true,
      commissionPercent: true,
    },
    orderBy: { deliveredAt: "asc" },
  });

  if (due.length === 0) {
    console.log("Nothing due for release.");
    await reportWaiting();
    return;
  }

  console.log(`${due.length} order(s) due:`);
  for (const o of due) {
    const days = Math.floor((Date.now() - o.deliveredAt.getTime()) / 86400000);
    console.log(
      `  ${o.id.slice(0, 8)}  ${String(days).padStart(3)}d since delivery  ` +
        `payout ${toman(payoutFor(o))} toman  ${o.categoryTitle || "—"}`
    );
  }

  if (!APPLY) {
    console.log("\nNothing written.");
    await reportWaiting();
    return;
  }

  let released = 0;
  let failed = 0;

  for (const order of due) {
    const amount = payoutFor(order);
    if (amount <= 0 || !order.selectedSpecialistId) {
      console.log(`  ! ${order.id.slice(0, 8)} skipped: no payable amount or no specialist`);
      failed++;
      continue;
    }

    try {
      // Guarded on settledAt inside the transaction, so a concurrent client
      // confirmation cannot cause a double payout.
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.order.findUnique({
          where: { id: order.id },
          select: { settledAt: true, disputedAt: true },
        });
        if (fresh?.settledAt) throw new Error("ALREADY_SETTLED");
        // Re-checked inside the transaction: a dispute raised between the
        // query above and this write must still stop the payout.
        if (fresh?.disputedAt) throw new Error("DISPUTED");

        const user = await tx.user.update({
          where: { id: order.selectedSpecialistId },
          data: { walletBalance: { increment: amount } },
          select: { walletBalance: true },
        });

        await tx.walletEntry.create({
          data: {
            userId: order.selectedSpecialistId,
            amount,
            type: "ORDER_SETTLEMENT",
            balanceAfter: user.walletBalance,
            orderId: order.id,
            note: `تسویه خودکار پروژه «${
              order.categoryTitle || "عکاسی"
            }» پس از ${AUTO_RELEASE_DAYS} روز از تحویل`,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: { status: "COMPLETED", settledAt: new Date(), settledAmount: amount },
        });

        await tx.notification.create({
          data: {
            userId: order.selectedSpecialistId,
            title: "تسویه خودکار انجام شد",
            message: `مبلغ ${amount.toLocaleString("fa-IR")} تومان بابت پروژه «${
              order.categoryTitle || "عکاسی"
            }» به کیف پول شما اضافه شد.`,
            type: "SUCCESS",
            link: "/dashboard/wallet",
          },
        });
      });

      console.log(`  ✓ ${order.id.slice(0, 8)} released ${toman(amount)} toman`);
      released++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const label =
        msg === "ALREADY_SETTLED" ? "already settled" : msg === "DISPUTED" ? "disputed — held" : msg;
      console.log(`  ! ${order.id.slice(0, 8)} ${label}`);
      failed++;
    }
  }

  console.log(`\nReleased ${released}, skipped ${failed}.`);
}

/** Orders inside the grace period, so a quiet run still says what is pending. */
async function reportWaiting() {
  const waiting = await prisma.order.count({
    where: { settledAt: null, paidAt: { not: null }, status: "CONFIRMED", deliveredAt: { not: null } },
  });
  const undelivered = await prisma.order.count({
    where: { settledAt: null, paidAt: { not: null }, status: "CONFIRMED", deliveredAt: null },
  });
  const disputed = await prisma.order.count({
    where: { settledAt: null, disputedAt: { not: null }, disputeResolvedAt: null },
  });
  console.log(
    `\nin grace period: ${waiting}   awaiting delivery: ${undelivered}   held by dispute: ${disputed}`
  );
}

main()
  .catch((e) => {
    console.error("Auto-release failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
