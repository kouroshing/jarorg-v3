/**
 * Keeps orders from sitting on the board forever.
 *
 * Two different failures, two different remedies:
 *
 *   nobody applied      -> flag it for the team and tell the client we are
 *                          still looking. No money has moved, so there is
 *                          nothing to unwind; the risk is a client who feels
 *                          ignored and never comes back.
 *
 *   applied, no choice  -> the client has proposals and has not picked one.
 *                          This one costs other people: several specialists are
 *                          holding a date for an order that may never happen.
 *                          Remind, then close and free them.
 *
 * Thresholds come from the admin panel (PwaSettings), so they can be tuned
 * without a deploy.
 *
 * Dry run by default. Pass --apply to write. Run daily.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const FALLBACK = {
  noApplicantTimeoutHours: 48,
  selectionReminderHours: 72,
  selectionTimeoutDays: 7,
};

const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000);
const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const ageInHours = (d) => Math.floor((Date.now() - d.getTime()) / 3600000);

async function main() {
  console.log(APPLY ? "MODE: apply" : "MODE: dry run — pass --apply to write");

  const settings =
    (await prisma.pwaSettings.findUnique({
      where: { id: "system-config" },
      select: {
        noApplicantTimeoutHours: true,
        selectionReminderHours: true,
        selectionTimeoutDays: true,
      },
    })) ?? FALLBACK;

  console.log(
    `thresholds: no applicants ${settings.noApplicantTimeoutHours}h, ` +
      `reminder ${settings.selectionReminderHours}h, close ${settings.selectionTimeoutDays}d\n`
  );

  await handleNoApplicants(settings);
  await handleUnansweredProposals(settings);
}

/** Orders on the board that nobody has applied to. */
async function handleNoApplicants(settings) {
  const stale = await prisma.order.findMany({
    where: {
      status: { in: ["MATCHING", "HAS_APPLICANTS"] },
      createdAt: { lte: hoursAgo(settings.noApplicantTimeoutHours) },
      noApplicantsAt: null,
      interests: {
        none: { status: { in: ["PENDING", "SELECTED", "ACCEPTED"] } },
      },
    },
    select: { id: true, categoryTitle: true, createdAt: true, userId: true, districtOrCity: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`── no applicants (${stale.length})`);
  for (const o of stale) {
    console.log(
      `   ${o.id.slice(0, 8)}  ${String(ageInHours(o.createdAt)).padStart(4)}h old  ` +
        `${o.districtOrCity || "—"}  ${o.categoryTitle || "—"}`
    );
  }

  if (!APPLY || stale.length === 0) return;

  for (const o of stale) {
    // Flagged rather than cancelled: the order stays live and applicable. The
    // flag is what puts it in front of the team, and stops this repeating daily.
    await prisma.order.update({
      where: { id: o.id },
      data: { noApplicantsAt: new Date() },
    });

    if (o.userId) {
      await prisma.notification.create({
        data: {
          userId: o.userId,
          title: "هنوز دنبال متخصص مناسب هستیم",
          message: `برای سفارش «${
            o.categoryTitle || "عکاسی"
          }» هنوز پیشنهادی ثبت نشده است. تیم جار پیگیر است و به‌محض پیدا شدن متخصص مناسب خبر می‌دهیم.`,
          type: "INFO",
          link: `/order/${o.id}`,
        },
      });
    }
  }
  console.log(`   flagged ${stale.length}`);
}

/** Orders with live proposals that the client has not answered. */
async function handleUnansweredProposals(settings) {
  const needsReminder = await prisma.order.findMany({
    where: {
      status: "HAS_APPLICANTS",
      createdAt: { lte: hoursAgo(settings.selectionReminderHours) },
      clientRemindedAt: null,
      selectedSpecialistId: null,
      interests: { some: { status: "PENDING" } },
    },
    select: { id: true, categoryTitle: true, createdAt: true, userId: true },
  });

  const dueToClose = await prisma.order.findMany({
    where: {
      status: "HAS_APPLICANTS",
      createdAt: { lte: daysAgo(settings.selectionTimeoutDays) },
      selectedSpecialistId: null,
      interests: { some: { status: "PENDING" } },
    },
    select: { id: true, categoryTitle: true, createdAt: true, userId: true },
  });

  const closingIds = new Set(dueToClose.map((o) => o.id));
  const remindOnly = needsReminder.filter((o) => !closingIds.has(o.id));

  console.log(`\n── proposals waiting on the client`);
  console.log(`   remind: ${remindOnly.length}   close: ${dueToClose.length}`);
  for (const o of remindOnly) {
    console.log(`   remind  ${o.id.slice(0, 8)}  ${String(ageInHours(o.createdAt)).padStart(4)}h`);
  }
  for (const o of dueToClose) {
    console.log(`   close   ${o.id.slice(0, 8)}  ${String(ageInHours(o.createdAt)).padStart(4)}h`);
  }

  if (!APPLY) return;

  for (const o of remindOnly) {
    await prisma.order.update({
      where: { id: o.id },
      data: { clientRemindedAt: new Date() },
    });
    if (o.userId) {
      await prisma.notification.create({
        data: {
          userId: o.userId,
          title: "متخصصان منتظر پاسخ شما هستند",
          message: `برای سفارش «${
            o.categoryTitle || "عکاسی"
          }» پیشنهادهایی ثبت شده است. تا ${settings.selectionTimeoutDays} روز فرصت دارید یکی را انتخاب کنید؛ پس از آن سفارش بسته می‌شود.`,
          type: "WARNING",
          link: `/order/${o.id}`,
        },
      });
    }
  }

  for (const o of dueToClose) {
    // Closing frees every specialist who was holding this date. The client can
    // post again; the specialists get their availability back either way.
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: o.id },
        data: {
          status: "CANCELLED",
          adminCancelNote: `بسته شد: کارفرما ظرف ${settings.selectionTimeoutDays} روز متخصصی انتخاب نکرد.`,
        },
      });

      const freed = await tx.projectInterest.findMany({
        where: { orderId: o.id, status: "PENDING" },
        select: { specialistId: true },
      });

      await tx.projectInterest.updateMany({
        where: { orderId: o.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      for (const { specialistId } of freed) {
        await tx.notification.create({
          data: {
            userId: specialistId,
            title: "سفارش بسته شد",
            message: `کارفرمای پروژه «${
              o.categoryTitle || "عکاسی"
            }» در مهلت مقرر متخصصی انتخاب نکرد و سفارش بسته شد. زمان شما آزاد است.`,
            type: "INFO",
            link: "/specialist/projects",
          },
        });
      }

      if (o.userId) {
        await tx.notification.create({
          data: {
            userId: o.userId,
            title: "سفارش شما بسته شد",
            message: `سفارش «${
              o.categoryTitle || "عکاسی"
            }» به دلیل عدم انتخاب متخصص بسته شد. هر زمان خواستید می‌توانید دوباره ثبت کنید.`,
            type: "INFO",
            link: "/order",
          },
        });
      }
    });
  }

  console.log(`\n   reminded ${remindOnly.length}, closed ${dueToClose.length}`);
}

main()
  .catch((e) => {
    console.error("Timeout sweep failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
