/**
 * Keeps orders from sitting on the board forever.
 *
 *   nobody applied (early)  -> flag for the team + soft client (still live).
 *   proposals unanswered    -> remind the client to pick someone.
 *   matching past N days    -> NO_MATCH: leave the specialist board, one
 *                              client notif encouraging budget/detail edit,
 *                              cancel pending interests. Visible mainly in admin.
 *
 * Thresholds come from PwaSettings (matchingTimeoutDays default 7).
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
  matchingTimeoutDays: 7,
};

/** Mirrors lib/orders/noMatch.ts — keep copy in sync. */
const NO_MATCH_ADMIN_NOTE =
  "متأسفانه برای این پروژه متخصص مناسبی پیدا نشد. پیشنهاد می‌کنیم بودجه یا جزئیات را کمی ویرایش کنید (مثلاً افزایش قیمت، انعطاف در زمان/محل) و دوباره منتشر کنید تا شانس بیشتری داشته باشید.";

const NO_MATCH_NOTIF_TITLE = "متأسفانه متخصصی پیدا نشد";

function noMatchNotifMessage(categoryTitle) {
  return `برای سفارش «${
    categoryTitle || "عکاسی"
  }» ظرف مهلت جستجو متخصص مناسبی اعلام آمادگی نکرد. می‌توانید قیمت یا جزئیات را ویرایش کنید و دوباره منتشر کنید — این کار معمولاً پیشنهادهای بیشتری می‌آورد.`;
}

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
        matchingTimeoutDays: true,
      },
    })) ?? FALLBACK;

  const matchingTimeoutDays =
    settings.matchingTimeoutDays ?? FALLBACK.matchingTimeoutDays;

  console.log(
    `thresholds: no applicants ${settings.noApplicantTimeoutHours}h, ` +
      `reminder ${settings.selectionReminderHours}h, ` +
      `selection close ${settings.selectionTimeoutDays}d, ` +
      `matching suspend ${matchingTimeoutDays}d\n`
  );

  await handleNoApplicants(settings);
  await handleUnansweredProposals(settings);
  await handleMatchingTimeout({ ...settings, matchingTimeoutDays });
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

/** Orders with live proposals that the client has not answered — remind only.
 * Hard close / suspend is handled by handleMatchingTimeout → NO_MATCH so the
 * client can edit budget and republish instead of losing the order. */
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

  console.log(`\n── proposals waiting on the client`);
  console.log(`   remind: ${needsReminder.length}`);
  for (const o of needsReminder) {
    console.log(`   remind  ${o.id.slice(0, 8)}  ${String(ageInHours(o.createdAt)).padStart(4)}h`);
  }

  if (!APPLY || needsReminder.length === 0) return;

  for (const o of needsReminder) {
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
          }» پیشنهادهایی ثبت شده است. لطفاً یکی را انتخاب کنید؛ در غیر این صورت پس از مهلت جستجو سفارش از بورد خارج می‌شود و می‌توانید با ویرایش بودجه دوباره منتشر کنید.`,
          type: "WARNING",
          link: `/order/${o.id}`,
        },
      });
    }
  }

  console.log(`   reminded ${needsReminder.length}`);
}

/**
 * After matchingTimeoutDays from publish (fallback: createdAt), unpaid matching
 * orders leave the specialist board as NO_MATCH — one client notif, admin note,
 * pending interests cancelled. Idempotent via noMatchAt.
 */
async function handleMatchingTimeout(settings) {
  const cutoff = daysAgo(settings.matchingTimeoutDays);
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
      createdAt: true,
      publishedAt: true,
      userId: true,
      districtOrCity: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n── matching timeout → NO_MATCH (${candidates.length})`);
  for (const o of candidates) {
    const anchor = o.publishedAt || o.createdAt;
    console.log(
      `   ${o.id.slice(0, 8)}  ${String(ageInHours(anchor)).padStart(4)}h since publish  ` +
        `${o.districtOrCity || "—"}  ${o.categoryTitle || "—"}`
    );
  }

  if (!APPLY || candidates.length === 0) return;

  for (const o of candidates) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: o.id },
        data: {
          status: "NO_MATCH",
          noMatchAt: new Date(),
          adminNote: NO_MATCH_ADMIN_NOTE,
        },
      });

      const freed = await tx.projectInterest.findMany({
        where: { orderId: o.id, status: "PENDING" },
        select: { specialistId: true },
      });

      if (freed.length > 0) {
        await tx.projectInterest.updateMany({
          where: { orderId: o.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });

        for (const { specialistId } of freed) {
          await tx.notification.create({
            data: {
              userId: specialistId,
              title: "پروژه از بورد خارج شد",
              message: `مهلت جستجوی پروژه «${
                o.categoryTitle || "عکاسی"
              }» به پایان رسید و از بورد فعال خارج شد. زمان شما آزاد است.`,
              type: "INFO",
              link: "/specialist/projects",
            },
          });
        }
      }

      if (o.userId) {
        await tx.notification.create({
          data: {
            userId: o.userId,
            title: NO_MATCH_NOTIF_TITLE,
            message: noMatchNotifMessage(o.categoryTitle),
            type: "INFO",
            link: `/order/${o.id}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: "cron:order-timeouts",
          action: "ORDER_NO_MATCH",
          targetModel: "Order",
          targetId: o.id,
          note: `matching timeout after ${settings.matchingTimeoutDays}d`,
        },
      });
    });
  }

  console.log(`   suspended ${candidates.length}`);
}

main()
  .catch((e) => {
    console.error("Timeout sweep failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
