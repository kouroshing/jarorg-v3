const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const journalRes = await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
    console.log("✅ [WAL Setup] Successfully configured SQLite:");
    console.log("   - journal_mode:", journalRes);
    console.log("   - busy_timeout: 5000ms");
  } catch (error) {
    console.error("❌ [WAL Setup] Failed to configure SQLite:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
