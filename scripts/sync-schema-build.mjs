/**
 * Prepare SQLite schema before `next build` (Liara build has no runtime sync yet).
 * Same rules as lib/sqlite-schema-sync.ts — keep in sync.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function ensureDbDir() {
  const dbUrl = process.env.DATABASE_URL || "file:../data/jar.db";
  if (!dbUrl.startsWith("file:")) return;
  const rawPath = dbUrl.replace(/^file:(?:\/\/)?/, "");
  const targetDir = path.dirname(
    path.isAbsolute(rawPath) ? rawPath : path.resolve(root, "prisma", rawPath)
  );
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

async function tableExists(client, table) {
  const rows = await client.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
  );
  return rows.length > 0;
}

async function columnExists(client, table, column) {
  const rows = await client.$queryRawUnsafe(`PRAGMA table_info("${table}");`);
  return rows.some((r) => r.name === column);
}

function parseColumnDefs(body) {
  const cols = [];
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    if (/^(PRIMARY\s+KEY|UNIQUE|CONSTRAINT|FOREIGN\s+KEY|CHECK|INDEX)/i.test(part)) {
      continue;
    }
    const m = part.match(/^"([^"]+)"\s+(.+)$/i);
    if (!m) continue;
    let sqlType = m[2].trim().replace(/\bPRIMARY\s+KEY\b/gi, "").trim();
    if (/\bNOT\s+NULL\b/i.test(sqlType) && !/\bDEFAULT\b/i.test(sqlType)) {
      sqlType = sqlType.replace(/\bNOT\s+NULL\b/gi, "").trim();
    }
    cols.push({ name: m[1], sqlType });
  }
  return cols;
}

async function syncFromBootstrap(client) {
  const sqlPath = path.join(root, "scripts", "schema-bootstrap.sql");
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing schema bootstrap at ${sqlPath}`);
  }

  const raw = fs.readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    const createMatch = statement.match(/^CREATE\s+TABLE\s+"([^"]+)"\s*\(([\s\S]+)\)$/i);
    if (createMatch) {
      const table = createMatch[1];
      const body = createMatch[2];
      const exists = await tableExists(client, table);
      if (!exists) {
        await client.$executeRawUnsafe(`${statement};`);
        continue;
      }
      for (const col of parseColumnDefs(body)) {
        if (await columnExists(client, table, col.name)) continue;
        await client.$executeRawUnsafe(
          `ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${col.sqlType};`
        );
      }
      continue;
    }
    if (/^CREATE\s+(UNIQUE\s+)?INDEX/i.test(statement)) {
      try {
        await client.$executeRawUnsafe(`${statement};`);
      } catch {
        // already exists
      }
    }
  }
}

async function main() {
  if (process.env.NODE_ENV !== "production" && !process.argv.includes("--force")) {
    console.log("[sync-schema-build] skip (not production); use --force to run anyway");
    return;
  }
  ensureDbDir();
  const client = new PrismaClient();
  try {
    console.log("[sync-schema-build] Applying schema-bootstrap.sql…");
    await syncFromBootstrap(client);
    console.log("[sync-schema-build] Done.");
  } finally {
    await client.$disconnect();
  }
}

main().catch((e) => {
  console.error("[sync-schema-build] Failed:", e);
  process.exit(1);
});
