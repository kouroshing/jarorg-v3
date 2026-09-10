import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { syncSqliteSchemaFromBootstrap } from "@/lib/sqlite-schema-sync";

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

/**
 * Liara's Next platform starts `next start` directly (no package.json `db push`)
 * and the runtime image has no usable Prisma CLI (`npx` is read-only). Sync the
 * SQLite file from the checked-in bootstrap SQL instead.
 */
let runtimeSchemaSync: Promise<void> | null = null;

function ensureRuntimeDatabaseSync(client: PrismaClient) {
  if (runtimeSchemaSync) return runtimeSchemaSync;
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.IS_BUILD === "true" ||
    process.env.NODE_ENV !== "production"
  ) {
    runtimeSchemaSync = Promise.resolve();
    return runtimeSchemaSync;
  }

  runtimeSchemaSync = (async () => {
    try {
      console.log("[prisma-init] Syncing SQLite schema from bootstrap SQL...");
      await syncSqliteSchemaFromBootstrap(client);
      console.log("✅ [prisma-init] Runtime SQLite schema synced successfully.");
    } catch (e) {
      console.error(
        "❌ [prisma-init] Schema sync failed — order/create and related writes will error until this succeeds:",
        e instanceof Error ? e.message : e
      );
      // Allow a later request to retry.
      runtimeSchemaSync = null;
      throw e;
    }
  })();

  return runtimeSchemaSync;
}

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
  const client = new PrismaClient();
  void configureSqlitePragmas(client);
  // Fire schema sync as soon as the client exists; order create awaits it via
  // the exported helper when needed, and first page loads also trigger it.
  void ensureRuntimeDatabaseSync(client).catch(() => {});
  return client;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

void configureSqlitePragmas(prisma);

/** Await before writes that need the latest schema (e.g. createOrder). */
export function ensurePrismaSchemaReady() {
  return ensureRuntimeDatabaseSync(prisma);
}

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
