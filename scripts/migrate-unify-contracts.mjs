/**
 * Data migration for the "unify contracts" change.
 *
 * Brings existing rows onto the single contract the code now assumes:
 *
 *   1. users.phone and orders.contact_phone use the canonical 98XXXXXXXXXX form.
 *      Test scripts wrote the local 09XXXXXXXXX form directly, so the same
 *      person could exist as two accounts and profile lookups on contact_phone
 *      missed their own orders.
 *   2. Where normalizing a phone collides with an existing account, the two are
 *      merged rather than one being dropped.
 *   3. orders.status uses the canonical names from lib/orders/status.ts.
 *      Rows holding MATCHED / CANCELED / PENDING were invisible to the filters
 *      that read them.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   node scripts/migrate-unify-contracts.mjs            # report only
 *   node scripts/migrate-unify-contracts.mjs --apply    # write
 *
 * Back up the database file first. On Liara: cp /app/data/jar.db /app/data/jar.db.bak
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

/** Mirrors normalizePhoneDigits() in lib/auth/phone.ts. */
function normalizePhone(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `98${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) digits = `98${digits}`;
  return digits;
}

const STATUS_ALIASES = {
  MATCHED: "CONFIRMED",
  CANCELED: "CANCELLED",
  PENDING: "PENDING_REVIEW",
};

const log = [];
function record(line) {
  log.push(line);
  console.log(line);
}

/**
 * Moves every row owned by `loserId` to `winnerId`, respecting the unique
 * constraints that would otherwise make the update fail.
 */
async function reassignOwnership(tx, loserId, winnerId) {
  const moved = {};

  moved.orders = (
    await tx.order.updateMany({ where: { userId: loserId }, data: { userId: winnerId } })
  ).count;

  moved.assignedOrders = (
    await tx.order.updateMany({
      where: { selectedSpecialistId: loserId },
      data: { selectedSpecialistId: winnerId },
    })
  ).count;

  moved.projects = (
    await tx.project.updateMany({ where: { userId: loserId }, data: { userId: winnerId } })
  ).count;

  moved.notifications = (
    await tx.notification.updateMany({ where: { userId: loserId }, data: { userId: winnerId } })
  ).count;

  moved.transactions = (
    await tx.transaction.updateMany({ where: { userId: loserId }, data: { userId: winnerId } })
  ).count;

  moved.galleryProjects = (
    await tx.galleryProject.updateMany({ where: { userId: loserId }, data: { userId: winnerId } })
  ).count;

  moved.withdrawalRequests = (
    await tx.withdrawalRequest.updateMany({
      where: { userId: loserId },
      data: { userId: winnerId },
    })
  ).count;

  // purchases: unique(userId, courseId) — drop a duplicate rather than collide.
  const winnerCourses = new Set(
    (await tx.purchase.findMany({ where: { userId: winnerId }, select: { courseId: true } })).map(
      (p) => p.courseId
    )
  );
  const loserPurchases = await tx.purchase.findMany({ where: { userId: loserId } });
  moved.purchases = 0;
  moved.purchasesDropped = 0;
  for (const p of loserPurchases) {
    if (winnerCourses.has(p.courseId)) {
      await tx.purchase.delete({ where: { id: p.id } });
      moved.purchasesDropped++;
    } else {
      await tx.purchase.update({ where: { id: p.id }, data: { userId: winnerId } });
      moved.purchases++;
    }
  }

  // projectInterests: unique(orderId, specialistId) — same treatment.
  const winnerOrders = new Set(
    (
      await tx.projectInterest.findMany({
        where: { specialistId: winnerId },
        select: { orderId: true },
      })
    ).map((i) => i.orderId)
  );
  const loserInterests = await tx.projectInterest.findMany({ where: { specialistId: loserId } });
  moved.interests = 0;
  moved.interestsDropped = 0;
  for (const i of loserInterests) {
    if (winnerOrders.has(i.orderId)) {
      await tx.projectInterest.delete({ where: { id: i.id } });
      moved.interestsDropped++;
    } else {
      await tx.projectInterest.update({
        where: { id: i.id },
        data: { specialistId: winnerId },
      });
      moved.interests++;
    }
  }

  // specialistProfile: unique(userId) — the winner keeps theirs if they have one.
  const loserProfile = await tx.specialistProfile.findUnique({ where: { userId: loserId } });
  moved.specialistProfile = "none";
  if (loserProfile) {
    const winnerProfile = await tx.specialistProfile.findUnique({ where: { userId: winnerId } });
    if (winnerProfile) {
      await tx.specialistProfile.delete({ where: { id: loserProfile.id } });
      moved.specialistProfile = "dropped (winner already had one)";
    } else {
      await tx.specialistProfile.update({
        where: { id: loserProfile.id },
        data: { userId: winnerId },
      });
      moved.specialistProfile = "moved";
    }
  }

  // audit_logs.actorId is a plain column, not a relation.
  moved.auditLogs = (
    await tx.auditLog.updateMany({ where: { actorId: loserId }, data: { actorId: winnerId } })
  ).count;

  return moved;
}

async function main() {
  record(APPLY ? "MODE: apply (writing)" : "MODE: dry run (no writes) — pass --apply to write");
  record("");

  // ---- 1. plan the user phone changes -------------------------------------
  const users = await prisma.user.findMany({
    select: { id: true, phone: true, displayName: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const byCanonical = new Map();
  for (const u of users) {
    const canon = normalizePhone(u.phone);
    if (!canon) continue;
    if (!byCanonical.has(canon)) byCanonical.set(canon, []);
    byCanonical.get(canon).push({ ...u, canon });
  }

  const renames = [];
  const merges = [];
  for (const [canon, group] of byCanonical) {
    if (group.length === 1) {
      const u = group[0];
      if (u.phone !== canon) renames.push(u);
      continue;
    }
    // Prefer the account already holding the canonical phone, then the oldest.
    const winner =
      group.find((u) => u.phone === canon) ??
      [...group].sort((a, b) => a.createdAt - b.createdAt)[0];
    for (const loser of group) {
      if (loser.id !== winner.id) merges.push({ winner, loser, canon });
    }
    if (winner.phone !== canon) renames.push(winner);
  }

  record(`users: ${users.length} total`);
  record(`  phone rewrites : ${renames.length}`);
  for (const u of renames) {
    record(`    ${u.id.slice(0, 8)}  ${u.phone} -> ${u.canon}  (${u.displayName || "—"})`);
  }
  record(`  merges         : ${merges.length}`);
  for (const m of merges) {
    record(
      `    ${m.loser.id.slice(0, 8)} (${m.loser.phone}, ${m.loser.role}) ` +
        `-> ${m.winner.id.slice(0, 8)} (${m.winner.phone}, ${m.winner.role})`
    );
  }
  record("");

  // ---- 2. plan the order changes ------------------------------------------
  const orders = await prisma.order.findMany({
    select: { id: true, status: true, contactPhone: true },
  });
  const statusFixes = orders.filter((o) => STATUS_ALIASES[o.status]);
  const phoneFixes = orders.filter(
    (o) => o.contactPhone && normalizePhone(o.contactPhone) !== o.contactPhone
  );

  record(`orders: ${orders.length} total`);
  record(`  status rewrites: ${statusFixes.length}`);
  for (const o of statusFixes) {
    record(`    ${o.id.slice(0, 8)}  ${o.status} -> ${STATUS_ALIASES[o.status]}`);
  }
  record(`  phone rewrites : ${phoneFixes.length}`);
  for (const o of phoneFixes) {
    record(`    ${o.id.slice(0, 8)}  ${o.contactPhone} -> ${normalizePhone(o.contactPhone)}`);
  }
  record("");

  if (!APPLY) {
    record("Nothing written. Re-run with --apply to perform the changes above.");
    return;
  }

  // ---- 3. apply ------------------------------------------------------------
  await prisma.$transaction(async (tx) => {
    for (const m of merges) {
      const moved = await reassignOwnership(tx, m.loser.id, m.winner.id);
      await tx.user.delete({ where: { id: m.loser.id } });
      record(`merged ${m.loser.id.slice(0, 8)} into ${m.winner.id.slice(0, 8)}: ${JSON.stringify(moved)}`);
    }

    for (const u of renames) {
      await tx.user.update({ where: { id: u.id }, data: { phone: u.canon } });
    }

    for (const o of statusFixes) {
      await tx.order.update({ where: { id: o.id }, data: { status: STATUS_ALIASES[o.status] } });
    }

    for (const o of phoneFixes) {
      await tx.order.update({
        where: { id: o.id },
        data: { contactPhone: normalizePhone(o.contactPhone) },
      });
    }
  });

  record("");
  record("Applied.");
}

main()
  .catch((e) => {
    console.error("Migration failed — no partial writes were committed.");
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
