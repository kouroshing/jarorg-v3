/**
 * Releases contact details 24 hours before each shoot.
 *
 * Chat opens the moment a client pays. Phone numbers and the exact address do
 * not: when both arrive together, everyone just phones each other, the chat
 * goes unused, and Jar has no record of what was agreed — which is exactly what
 * it needs when someone later disputes the work.
 *
 * Twenty-four hours is the point where withholding a phone number stops
 * protecting anything and starts being an obstacle to the shoot happening.
 *
 * Dry run by default. Pass --apply. Run hourly.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const LEAD_HOURS = 24;

const faTime = (d) =>
  new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(d);

async function main() {
  console.log(APPLY ? "MODE: apply" : "MODE: dry run — pass --apply to release");
  console.log(`releasing contacts ${LEAD_HOURS}h before the shoot\n`);

  const threshold = new Date(Date.now() + LEAD_HOURS * 60 * 60 * 1000);

  const due = await prisma.order.findMany({
    where: {
      paidAt: { not: null },
      contactRevealedAt: null,
      status: "CONFIRMED",
      scheduledAt: { not: null, lte: threshold },
    },
    select: {
      id: true,
      categoryTitle: true,
      scheduledAt: true,
      selectedSpecialistId: true,
      userId: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  // A flexible booking has no date to count back from. Those are released as
  // soon as they are paid — there is no shoot day to wait for.
  const flexible = await prisma.order.findMany({
    where: {
      paidAt: { not: null },
      contactRevealedAt: null,
      status: "CONFIRMED",
      scheduledAt: null,
    },
    select: { id: true, categoryTitle: true, selectedSpecialistId: true, userId: true },
  });

  console.log(`scheduled shoots within ${LEAD_HOURS}h: ${due.length}`);
  for (const o of due) {
    console.log(`  ${o.id.slice(0, 8)}  ${faTime(o.scheduledAt)}  ${o.categoryTitle || "—"}`);
  }
  console.log(`flexible bookings (no fixed date): ${flexible.length}`);
  for (const o of flexible) {
    console.log(`  ${o.id.slice(0, 8)}  —  ${o.categoryTitle || "—"}`);
  }

  if (!APPLY) {
    console.log("\nNothing written.");
    return;
  }

  const all = [...due, ...flexible];
  for (const o of all) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({
        where: { id: o.id },
        select: { contactRevealedAt: true },
      });
      if (fresh?.contactRevealedAt) return;

      await tx.order.update({
        where: { id: o.id },
        data: { contactRevealedAt: new Date() },
      });

      const project = o.categoryTitle || "عکاسی";
      for (const [userId, message] of [
        [
          o.selectedSpecialistId,
          `شماره تماس و نشانی دقیق پروژه «${project}» حالا در دسترس شماست.`,
        ],
        [o.userId, `شماره تماس شما برای هماهنگی نهایی پروژه «${project}» در اختیار متخصص قرار گرفت.`],
      ]) {
        if (!userId) continue;
        await tx.notification.create({
          data: { userId, title: "اطلاعات تماس آزاد شد", message, type: "INFO", link: `/order/${o.id}` },
        });
      }
    });
    console.log(`  ✓ ${o.id.slice(0, 8)} released`);
  }

  console.log(`\nReleased ${all.length}.`);
}

main()
  .catch((e) => {
    console.error("Contact release failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
