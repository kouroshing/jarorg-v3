import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Ensure database directory always exists dynamically from DATABASE_URL.
// Prisma resolves a relative sqlite `file:` URL against the schema directory
// (prisma/), not the working directory — resolve it the same way here.
try {
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("file:")) {
    const rawPath = dbUrl.replace(/^file:(?:\/\/)?/, "");
    const targetDir = path.dirname(
      path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(process.cwd(), "prisma", rawPath)
    );
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } else {
    // Fallback: the persistent data disk. Never public/ — files served from
    // there are downloadable by anyone.
    const fallbackDir =
      process.env.NODE_ENV === "production"
        ? "/app/data"
        : path.resolve(process.cwd(), "data");
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
  }
} catch (err) {
  console.error("[prisma-init] Failed to ensure database directory exists:", err);
}

// In production runtime, if tables are not initialized or on cold start, ensure schema is pushed
let runtimeSchemaSynced = false;
function ensureRuntimeDatabaseSync() {
  if (runtimeSchemaSynced) return;
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.IS_BUILD !== "true"
  ) {
    try {
      // Production schema changes must be applied by `prisma migrate deploy`
      // during deployment, never implicitly with accept-data-loss at runtime.
      return;
      runtimeSchemaSynced = true;
      console.log("✅ [prisma-init] Runtime SQLite schema synced successfully.");
    } catch (e) {
      console.warn("⚠️ [prisma-init] Runtime schema sync notice:", e instanceof Error ? e.message : e);
    }
  }
}

/**
 * Configures SQLite WAL (Write-Ahead Logging) mode and busy_timeout (5000ms).
 * WAL mode allows concurrent readers and writers without blocking.
 * busy_timeout ensures concurrent writes wait up to 5000ms instead of throwing SQLITE_BUSY.
 */
let walConfigured = false;
export async function configureSqlitePragmas(client: PrismaClient) {
  if (walConfigured) return;
  try {
    const journalRes = await client.$queryRawUnsafe<any[]>("PRAGMA journal_mode = WAL;");
    await client.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
    walConfigured = true;
    const mode = Array.isArray(journalRes) && journalRes[0] ? Object.values(journalRes[0])[0] : "wal";
    console.log(`✅ [sqlite-wal] SQLite WAL Mode & Timeout configured: journal_mode=${mode}, busy_timeout=5000ms`);
  } catch (err) {
    console.warn("⚠️ [sqlite-wal] Notice configuring SQLite PRAGMA:", err instanceof Error ? err.message : err);
  }
}

const prismaClientSingleton = () => {
  ensureRuntimeDatabaseSync();
  const client = new PrismaClient();
  configureSqlitePragmas(client);
  return client;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

// Ensure pragmas run on existing instance as well
configureSqlitePragmas(prisma);

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
