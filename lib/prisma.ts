import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
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

/**
 * Liara's Next platform starts `next start` directly and skips package.json
 * scripts that prepend `prisma db push`. Without an explicit sync here the
 * Prisma client drifts from the SQLite file on the data disk — which is exactly
 * how production lost the `orders` table while still serving the app.
 *
 * Non-destructive only: adds missing tables/columns. Does not pass
 * --accept-data-loss.
 */
let runtimeSchemaSynced = false;
function ensureRuntimeDatabaseSync() {
  if (runtimeSchemaSynced) return;
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.IS_BUILD === "true"
  ) {
    return;
  }

  // Dev uses `prisma db push` / migrate by hand; don't block every reload.
  if (process.env.NODE_ENV !== "production") {
    runtimeSchemaSynced = true;
    return;
  }

  try {
    // Use the binary shipped in node_modules. `npx prisma` tries to hit the
    // npm registry and write under /root/.npm, which is read-only on Liara.
    const prismaBin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
    const cmd = fs.existsSync(prismaBin)
      ? `"${prismaBin}" db push --skip-generate`
      : "node ./node_modules/prisma/build/index.js db push --skip-generate";

    console.log("[prisma-init] Syncing SQLite schema (prisma db push)...");
    execSync(cmd, {
      stdio: "inherit",
      env: {
        ...process.env,
        // Keep any incidental npm writes off the read-only root FS.
        NPM_CONFIG_CACHE: "/tmp/npm-cache",
        npm_config_cache: "/tmp/npm-cache",
      },
      timeout: 180_000,
    });
    runtimeSchemaSynced = true;
    console.log("✅ [prisma-init] Runtime SQLite schema synced successfully.");
  } catch (e) {
    console.error(
      "❌ [prisma-init] Schema sync failed — order/create and related writes will error until this succeeds:",
      e instanceof Error ? e.message : e
    );
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
  void configureSqlitePragmas(client);
  return client;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

// Ensure pragmas run on existing instance as well
void configureSqlitePragmas(prisma);

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
