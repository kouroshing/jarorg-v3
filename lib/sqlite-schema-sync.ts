import fs from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";

type ColumnDef = { name: string; sqlType: string };

/**
 * Applies the checked-in schema bootstrap SQL without the Prisma CLI.
 * Liara's Next runtime has @prisma/client but not a writable npm cache, so
 * `prisma db push` cannot run there. This walks CREATE TABLE statements and:
 *   1. creates any missing table as-is
 *   2. for existing tables, ADD COLUMN any missing fields (SQLite-safe)
 * Index / unique creations are best-effort and ignore "already exists".
 */
export async function syncSqliteSchemaFromBootstrap(client: PrismaClient): Promise<void> {
  const sqlPath = path.join(process.cwd(), "scripts", "schema-bootstrap.sql");
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
        // SQLite ADD COLUMN cannot use PRIMARY KEY / NOT NULL without default in
        // some cases; our schema defaults cover the live columns we add.
        await client.$executeRawUnsafe(
          `ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${col.sqlType};`
        );
      }
      continue;
    }

    // Indexes / uniques — ignore collisions on already-synced DBs.
    if (/^CREATE\s+(UNIQUE\s+)?INDEX/i.test(statement)) {
      try {
        await client.$executeRawUnsafe(`${statement};`);
      } catch {
        // already exists
      }
    }
  }
}

async function tableExists(client: PrismaClient, table: string): Promise<boolean> {
  // Table names come only from the checked-in bootstrap SQL.
  const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
  );
  return rows.length > 0;
}

async function columnExists(
  client: PrismaClient,
  table: string,
  column: string
): Promise<boolean> {
  const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("${table}");`
  );
  return rows.some((r) => r.name === column);
}

function parseColumnDefs(body: string): ColumnDef[] {
  const cols: ColumnDef[] = [];
  // Split on commas that are not inside parentheses.
  const parts: string[] = [];
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
    // Strip table-level trailing bits; keep type + nullability + default.
    let sqlType = m[2].trim();
    // PRIMARY KEY on the column itself is fine for CREATE, not for ADD COLUMN.
    sqlType = sqlType.replace(/\bPRIMARY\s+KEY\b/gi, "").trim();
    // NOT NULL without DEFAULT fails on ADD COLUMN when rows exist.
    if (/\bNOT\s+NULL\b/i.test(sqlType) && !/\bDEFAULT\b/i.test(sqlType)) {
      sqlType = sqlType.replace(/\bNOT\s+NULL\b/gi, "").trim();
    }
    cols.push({ name: m[1], sqlType });
  }
  return cols;
}
