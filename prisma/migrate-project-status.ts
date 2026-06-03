/**
 * One-time migration: legacy CRM statuses → PENDING | IN_PROGRESS | COMPLETED | CANCELED
 * Run: npx tsx prisma/migrate-project-status.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAP: Record<string, string> = {
  pending_review: "PENDING",
  contacted: "IN_PROGRESS",
  meeting_scheduled: "IN_PROGRESS",
  converted: "IN_PROGRESS",
  invoiced: "IN_PROGRESS",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
  canceled: "CANCELED",
  CANCELED: "CANCELED",
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
};

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true, status: true } });
  let updated = 0;

  for (const p of projects) {
    const next = MAP[p.status] ?? "PENDING";
    if (next !== p.status) {
      await prisma.project.update({
        where: { id: p.id },
        data: { status: next },
      });
      updated++;
    }
  }

  console.log(`Migrated ${updated} of ${projects.length} projects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
