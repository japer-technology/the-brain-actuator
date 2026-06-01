import { existsSync, statSync } from "node:fs";
import Database from "better-sqlite3";
import type { Database as Db } from "better-sqlite3";
import type {
  Attachment,
  BrainData,
  Link,
  LinkDirection,
  LinkRelation,
  Note,
  NoteFormat,
  Tag,
  Thought,
  Type,
} from "../model/index.js";
import type { AdapterCapabilities, StorageAdapter } from "./types.js";

const RELATION: Record<number, LinkRelation> = { 1: "child", 2: "jump", 3: "sibling" };
const DIRECTION: Record<number, LinkDirection> = { 0: "undirected", 1: "directed" };
const NOTE_FORMAT: Record<string, NoteFormat> = {
  html: "html",
  markdown: "markdown",
  text: "text",
  richtext: "richtext",
};

interface RawRow {
  [column: string]: unknown;
}

/**
 * Read-only adapter for a SQLite-backed live brain folder. Opens the database
 * strictly read-only and never takes a write lock (see `docs/reading.md`).
 *
 * The table/column names mapped here are HYPOTHESES (see `docs/discovery.md`).
 * The synthetic SQLite fixture is built to the same hypotheses and is NOT a
 * capture from a real TheBrain installation.
 */
export class SqliteAdapter implements StorageAdapter {
  readonly capabilities: AdapterCapabilities;
  private readonly db: Db;
  private readonly tables: Set<string>;

  constructor(dbPath: string, version: string | undefined, confidence: number) {
    this.db = new Database(dbPath, { readonly: true, fileMustExist: true });
    this.db.pragma("query_only = true");
    this.tables = new Set(
      (this.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as { name: string }[]).map((r) => r.name),
    );
    this.capabilities = {
      format: "sqlite",
      version,
      confidence,
      canRead: true,
      writableMutations: [],
      syncBookkeepingUnderstood: false,
    };
  }

  private all(table: string): RawRow[] {
    if (!this.tables.has(table)) return [];
    return this.db.prepare(`SELECT * FROM ${table}`).all() as RawRow[];
  }

  read(): BrainData {
    const tags = new Map<string, string[]>();
    for (const row of this.all("ThoughtTags")) {
      const t = str(row["ThoughtId"]);
      const g = str(row["TagId"]);
      if (t && g) push(tags, t, g);
    }
    const attachmentsByThought = new Map<string, string[]>();
    const attachments: Attachment[] = [];
    for (const row of this.all("Attachments")) {
      const guid = str(row["Id"]);
      const thoughtGuid = str(row["ThoughtId"]);
      if (!guid || !thoughtGuid) continue;
      push(attachmentsByThought, thoughtGuid, guid);
      const kindRaw = str(row["Type"]);
      attachments.push({
        guid,
        thoughtGuid,
        kind: kindRaw === "file" || kindRaw === "url" ? kindRaw : "unknown",
        name: str(row["Name"]) ?? "",
        location: str(row["Location"]) ?? "",
        bytes: num(row["ByteCount"]),
      });
    }
    const notes = new Set(
      this.all("Notes")
        .map((r) => str(r["ThoughtId"]))
        .filter((v): v is string => v !== undefined),
    );

    const thoughts: Thought[] = [];
    for (const row of this.all("Thoughts")) {
      const guid = str(row["Id"]);
      if (!guid) continue;
      thoughts.push({
        guid,
        label: str(row["Name"]) ?? "",
        created: num(row["CreationDateTime"]),
        modified: num(row["ModificationDateTime"]),
        typeGuid: str(row["TypeId"]),
        tagGuids: tags.get(guid) ?? [],
        attachmentGuids: attachmentsByThought.get(guid) ?? [],
        hasNote: notes.has(guid),
        forgotten: row["ForgottenDateTime"] != null,
      });
    }

    const links: Link[] = [];
    for (const row of this.all("Links")) {
      const guid = str(row["Id"]);
      const sourceGuid = str(row["ThoughtIdA"]);
      const targetGuid = str(row["ThoughtIdB"]);
      if (!guid || !sourceGuid || !targetGuid) continue;
      const relationCode = num(row["Relation"]);
      const directionCode = num(row["Direction"]);
      links.push({
        guid,
        sourceGuid,
        targetGuid,
        typeGuid: str(row["TypeId"]),
        relation: relationCode != null ? (RELATION[relationCode] ?? "unknown") : "unknown",
        direction:
          directionCode != null ? (DIRECTION[directionCode] ?? "unknown") : "unknown",
        name: str(row["Name"]),
      });
    }

    const types: Type[] = [];
    for (const row of this.all("Types")) {
      const guid = str(row["Id"]);
      if (!guid) continue;
      types.push({
        guid,
        name: str(row["Name"]) ?? "",
        appliesTo: str(row["Kind"]) === "link" ? "link" : "thought",
        superTypeGuid: str(row["SuperTypeId"]),
      });
    }

    const tagList: Tag[] = [];
    for (const row of this.all("Tags")) {
      const guid = str(row["Id"]);
      if (!guid) continue;
      tagList.push({ guid, name: str(row["Name"]) ?? "" });
    }

    return { thoughts, links, types, tags: tagList, attachments, unknowns: [] };
  }

  readNote(thoughtGuid: string): Note | undefined {
    if (!this.tables.has("Notes")) return undefined;
    const row = this.db
      .prepare("SELECT * FROM Notes WHERE ThoughtId = ?")
      .get(thoughtGuid) as RawRow | undefined;
    if (row === undefined) return undefined;
    const fmt = (str(row["Format"]) ?? "").toLowerCase();
    return {
      thoughtGuid,
      format: NOTE_FORMAT[fmt] ?? "unknown",
      body: str(row["Body"]) ?? "",
    };
  }

  close(): void {
    this.db.close();
  }
}

/** Whether `path` is a readable SQLite database file. */
export function looksLikeSqlite(path: string): boolean {
  if (!existsSync(path) || statSync(path).isDirectory()) return false;
  return /\.(db|sqlite|sqlite3)$/i.test(path);
}

function push(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
