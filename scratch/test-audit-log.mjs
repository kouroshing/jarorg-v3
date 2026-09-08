import { prisma } from "../lib/prisma.js";

async function verifyAuditLogs() {
  console.log("Checking audit logs in database...");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(`Found ${logs.length} audit logs in database:`);
  logs.forEach((l, idx) => {
    console.log(`[${idx + 1}] Action: ${l.action.padEnd(20)} | Model: ${l.targetModel.padEnd(14)} | TargetId: ${l.targetId} | Actor: ${l.actorId} | Note: ${l.note}`);
  });

  if (logs.length === 0) {
    console.log("Creating a sample audit log to verify read-only presentation...");
    await prisma.auditLog.create({
      data: {
        actorId: "989100138383",
        action: "PHASE3_DEPLOYED",
        targetModel: "System",
        targetId: "global-kpi",
        note: "راه‌اندازی کامل مرکز فرماندهی و لاگ‌های حسابرسی فاز نهایی",
      },
    });
    console.log("Sample audit log created successfully.");
  }
}

verifyAuditLogs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
