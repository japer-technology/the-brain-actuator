import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import type { StorageFormat } from "../adapters/types.js";
import { looksLikeBrainZip } from "../adapters/brainzip.js";
import { looksLikeSqlite } from "../adapters/sqlite.js";

/** The outcome of format/version detection (confidence, not yes/no). */
export interface Detection {
  readonly format: StorageFormat;
  readonly version?: string;
  /** Detection confidence in [0, 1]. */
  readonly confidence: number;
  /** The path the adapter should open (e.g. the db file inside a folder). */
  readonly target: string;
  readonly inUse: boolean;
}

/** Find a SQLite database file inside a brain working directory, if present. */
function findSqliteInDir(dir: string): string | undefined {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isFile() && looksLikeSqlite(full)) return full;
  }
  return undefined;
}

/** Heuristic "is the brain in use" check (lock / WAL / journal sidecars). */
function detectInUse(target: string): boolean {
  const sidecars = ["-wal", "-journal", ".lock"];
  if (sidecars.some((s) => existsSync(target + s))) return true;
  const dir = statSync(target).isDirectory() ? target : undefined;
  if (dir !== undefined) {
    return readdirSync(dir).some((e) => e.endsWith(".lock") || e.endsWith("-wal"));
  }
  return false;
}

function brainZipVersion(path: string): string | undefined {
  try {
    let meta: string | undefined;
    if (statSync(path).isDirectory()) {
      const p = join(path, "brain.json");
      meta = existsSync(p) ? readFileSync(p, "utf8") : undefined;
    } else {
      const entries = unzipSync(readFileSync(path));
      const bytes = entries["brain.json"];
      meta = bytes === undefined ? undefined : strFromU8(bytes);
    }
    if (meta === undefined) return undefined;
    const parsed = JSON.parse(meta) as Record<string, unknown>;
    const fv = parsed["formatVersion"];
    return typeof fv === "string" ? fv : typeof fv === "number" ? String(fv) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Detect the on-disk storage format and version with a confidence level. Returns
 * an `unknown` detection (confidence 0) for anything not positively recognized,
 * so callers can fail closed (see `docs/discovery.md` Step 2).
 */
export function detectFormat(path: string): Detection {
  if (!existsSync(path)) {
    return { format: "unknown", confidence: 0, target: path, inUse: false };
  }

  if (looksLikeBrainZip(path)) {
    const version = brainZipVersion(path);
    // A present, parseable brain.json raises confidence.
    const confidence = version !== undefined ? 0.95 : 0.7;
    return { format: "brainzip", version, confidence, target: path, inUse: false };
  }

  const isDir = statSync(path).isDirectory();
  const dbPath = isDir ? findSqliteInDir(path) : looksLikeSqlite(path) ? path : undefined;
  if (dbPath !== undefined) {
    return {
      format: "sqlite",
      confidence: 0.8,
      target: dbPath,
      inUse: detectInUse(dbPath),
    };
  }

  return { format: "unknown", confidence: 0, target: path, inUse: false };
}
