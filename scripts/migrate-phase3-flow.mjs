/**
 * Data migration for the rebuilt order flow.
 *
 * Two states no longer have a path forward:
 *
 *   PENDING_REVIEW  — new orders used to land here and nothing moved them out.
 *                     They now go straight to MATCHING; the ones already stuck
 *                     need the same push.
 *   PENDING_DEPOSIT — left over from the upfront-deposit flow, which was
 *                     removed (createOrderAction sets depositAmount to 0).
 *                     Payment now happens after a specialist is chosen.
 *
 * Both become MATCHING: on the board, visible to specialists.
 *
 * Orders that already have a selected specialist are left alone — moving those
 * back onto the board would drop an existing match.
 *
 * Dry run by default. Pass --apply to write.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const STRANDED = ["PENDING_REVIEW", "PENDING_DEPOSIT"];

async function main() {
  console.log(APPLY ? "MODE: apply" : "MODE: dry run — pass --apply to write");
  console.log("");

  const stranded = await prisma.order.findMany({
    where: { status: { in: STRANDED }, selectedSpecialistId: null },
    select: { id: true, status: true, categoryTitle: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const withSpecialist = await prisma.order.count({
    where: { status: { in: STRANDED }, NOT: { selectedSpecialistId: null } },
  });

  console.log(`orders to put back on the board: ${stranded.length}`);
  for (const o of stranded) {
    console.log(
      `  ${o.id.slice(0, 8)}  ${o.status.padEnd(16)} -> MATCHING   ${o.categoryTitle || "—"}`
    );
  }
  if (withSpecialist > 0) {
    console.log(`\nleft alone (already matched to a specialist): ${withSpecialist}`);
  }

  // Orders predating the map change have no coordinates, so no travel fee can
  // be quoted for them. Worth knowing about rather than silently charging zero.
  const noCoords = await prisma.order.count({
    where: { locationLat: null, status: { in: ["MATCHING", "HAS_APPLICANTS"] } },
  });
  if (noCoords > 0) {
    console.log(
      `\nnote: ${noCoords} open order(s) have no coordinates — travel shows as "not calculated"`
    );
  }

  if (!APPLY) {
    console.log("\nNothing written.");
    return;
  }

  const res = await prisma.order.updateMany({
    where: { status: { in: STRANDED }, selectedSpecialistId: null },
    data: { status: "MATCHING" },
  });

  console.log(`\nApplied. ${res.count} order(s) moved to MATCHING.`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
