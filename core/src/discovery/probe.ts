import { readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { unzipSync, strFromU8 } from "fflate";
import type { ProbedColumn, ProbedEntity, SchemaProbe } from "./report.js";

/** Quote a SQLite identifier safely (doubling embedded double-quotes). */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Probe a SQLite brain's actual schema from `sqlite_master` + `PRAGMA
 * table_info` — never hard-coded (see `docs/discovery.md` Step 3). Opens the
 * database read-only.
 */
export function probeSqlite(dbPath: string): SchemaProbe {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    db.pragma("query_only = true");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const entities: ProbedEntity[] = tables.map(({ name }) => {
      const columns = (
        db.prepare(`PRAGMA table_info(${quoteIdent(name)})`).all() as {
          name: string;
          type: string;
          pk: number;
          notnull: number;
        }[]
      ).map(
        (c): ProbedColumn => ({
          name: c.name,
          type: c.type,
          primaryKey: c.pk > 0,
          notNull: c.notnull > 0,
        }),
      );
      const rowCount = (
        db.prepare(`SELECT COUNT(*) AS n FROM ${quoteIdent(name)}`).get() as { n: number }
      ).n;
      return { name, columns, rowCount };
    });
    const versionMarkers: Record<string, string | number> = {};
    try {
      versionMarkers["user_version"] = db.pragma("user_version", { simple: true }) as number;
      versionMarkers["schema_version"] = db.pragma("schema_version", {
        simple: true,
      }) as number;
    } catch {
      // pragmas are best-effort
    }
    return { entities, versionMarkers };
  } finally {
    db.close();
  }
}

const BRZ_DOCS = [
  "thoughts.json",
  "links.json",
  "types.json",
  "tags.json",
  "thoughtTags.json",
  "attachments.json",
];

/**
 * Probe a `.brz`/JSON brain by enumerating its documents and inferring columns
 * from a sample record (see `docs/discovery.md` Step 3).
 */
export function probeBrainZip(path: string): SchemaProbe {
  const docs = brzDocs(path);
  const entities: ProbedEntity[] = [];
  for (const name of BRZ_DOCS) {
    const text = docs(name);
    if (text === undefined) continue;
    const parsed = JSON.parse(text);
    const rows: unknown[] = Array.isArray(parsed) ? parsed : [];
    const sample = rows[0];
    const columns: ProbedColumn[] =
      sample && typeof sample === "object"
        ? Object.entries(sample as Record<string, unknown>).map(([key, value]) => ({
            name: key,
            type: value === null ? "null" : typeof value,
            primaryKey: key === "id",
            notNull: false,
          }))
        : [];
    entities.push({ name, columns, rowCount: rows.length });
  }
  const versionMarkers: Record<string, string | number> = {};
  const meta = docs("brain.json");
  if (meta !== undefined) {
    const parsed = JSON.parse(meta) as Record<string, unknown>;
    const fv = parsed["formatVersion"];
    if (typeof fv === "string" || typeof fv === "number") versionMarkers["formatVersion"] = fv;
  }
  return { entities, versionMarkers };
}

/** Returns a reader over the documents in a `.brz` file or unpacked directory. */
function brzDocs(path: string): (name: string) => string | undefined {
  if (existsSync(path) && statSync(path).isDirectory()) {
    return (name) => {
      const full = join(path, name);
      return existsSync(full) ? readFileSync(full, "utf8") : undefined;
    };
  }
  const entries = unzipSync(readFileSync(path));
  return (name) => {
    const bytes = entries[name];
    return bytes === undefined ? undefined : strFromU8(bytes);
  };
}
