import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
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
  UnknownField,
} from "../model/index.js";
import type { AdapterCapabilities, StorageAdapter } from "./types.js";

/**
 * A flat collection of document entries, abstracting over a `.brz` ZIP and an
 * unpacked directory so the mapping logic is identical for both.
 */
interface DocSource {
  has(name: string): boolean;
  text(name: string): string | undefined;
}

function directorySource(dir: string): DocSource {
  const files = new Map<string, string>();
  const walk = (d: string): void => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else files.set(relative(dir, full).split(sep).join("/"), full);
    }
  };
  walk(dir);
  return {
    has: (name) => files.has(name),
    text: (name) => {
      const p = files.get(name);
      return p === undefined ? undefined : readFileSync(p, "utf8");
    },
  };
}

function zipSource(brzPath: string): DocSource {
  const entries = unzipSync(readFileSync(brzPath));
  return {
    has: (name) => name in entries,
    text: (name) => {
      const bytes = entries[name];
      return bytes === undefined ? undefined : strFromU8(bytes);
    },
  };
}

function makeSource(path: string): DocSource {
  return statSync(path).isDirectory() ? directorySource(path) : zipSource(path);
}

const RELATION: Record<number, LinkRelation> = {
  1: "child",
  2: "jump",
  3: "sibling",
};
const DIRECTION: Record<number, LinkDirection> = {
  0: "undirected",
  1: "directed",
};
const NOTE_FORMAT: Record<string, NoteFormat> = {
  html: "html",
  markdown: "markdown",
  md: "markdown",
  richtext: "richtext",
  rtf: "richtext",
  text: "text",
  plain: "text",
};

/** Record any keys on `raw` that are not in `known` as unknown fields. */
function collectUnknowns(
  raw: Record<string, unknown>,
  known: ReadonlySet<string>,
  where: string,
  sink: UnknownField[],
): void {
  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      sink.push({ where, field: key, sample: raw[key] });
    }
  }
}

const THOUGHT_KEYS = new Set([
  "id",
  "name",
  "creationDateTime",
  "modificationDateTime",
  "typeId",
  "forgottenDateTime",
]);
const LINK_KEYS = new Set([
  "id",
  "thoughtIdA",
  "thoughtIdB",
  "relation",
  "direction",
  "name",
  "typeId",
]);
const TYPE_KEYS = new Set(["id", "name", "kind", "superTypeId"]);
const TAG_KEYS = new Set(["id", "name"]);
const ATTACHMENT_KEYS = new Set([
  "id",
  "thoughtId",
  "type",
  "name",
  "location",
  "byteCount",
]);

function asArray(source: DocSource, name: string): Record<string, unknown>[] {
  const text = source.text(name);
  if (text === undefined) return [];
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [];
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Read-only adapter for the BrainZip (`.brz`) / unpacked-JSON export format.
 * This is the safest format to consume first: exporting cannot corrupt the live
 * brain.
 *
 * The raw document shapes mapped here are HYPOTHESES (see `docs/data-model.md`);
 * the synthetic fixtures in `fixtures/` are built to the same hypotheses and are
 * NOT captures from a real TheBrain installation.
 */
export class BrainZipAdapter implements StorageAdapter {
  readonly capabilities: AdapterCapabilities;
  private readonly source: DocSource;
  private noteIndex: Map<string, string> | undefined;

  constructor(path: string, version: string | undefined, confidence: number) {
    this.source = makeSource(path);
    this.capabilities = {
      format: "brainzip",
      version,
      confidence,
      canRead: true,
      writableMutations: [],
      syncBookkeepingUnderstood: false,
    };
  }

  read(): BrainData {
    const unknowns: UnknownField[] = [];
    const thoughts = this.readThoughts(unknowns);
    const links = this.readLinks(unknowns);
    const types = this.readTypes(unknowns);
    const tags = this.readTags(unknowns);
    const attachments = this.readAttachments(unknowns);
    return { thoughts, links, types, tags, attachments, unknowns };
  }

  private tagsByThought(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const row of asArray(this.source, "thoughtTags.json")) {
      const thoughtId = str(row["thoughtId"]);
      const tagId = str(row["tagId"]);
      if (thoughtId === undefined || tagId === undefined) continue;
      const list = map.get(thoughtId);
      if (list) list.push(tagId);
      else map.set(thoughtId, [tagId]);
    }
    return map;
  }

  private attachmentsByThought(): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const row of asArray(this.source, "attachments.json")) {
      const thoughtId = str(row["thoughtId"]);
      const id = str(row["id"]);
      if (thoughtId === undefined || id === undefined) continue;
      const list = map.get(thoughtId);
      if (list) list.push(id);
      else map.set(thoughtId, [id]);
    }
    return map;
  }

  private buildNoteIndex(): Map<string, string> {
    if (this.noteIndex) return this.noteIndex;
    const index = new Map<string, string>();
    // Notes are stored out-of-line as notes/<thoughtId>.html (hypothesis).
    for (const row of asArray(this.source, "thoughts.json")) {
      const id = str(row["id"]);
      if (id === undefined) continue;
      const candidate = `notes/${id}.html`;
      if (this.source.has(candidate)) index.set(id, candidate);
    }
    this.noteIndex = index;
    return index;
  }

  private readThoughts(unknowns: UnknownField[]): Thought[] {
    const tags = this.tagsByThought();
    const attachments = this.attachmentsByThought();
    const notes = this.buildNoteIndex();
    const out: Thought[] = [];
    asArray(this.source, "thoughts.json").forEach((row, i) => {
      const guid = str(row["id"]);
      if (guid === undefined) return;
      collectUnknowns(row, THOUGHT_KEYS, `thoughts[${i}]`, unknowns);
      const thought: Thought = {
        guid,
        label: str(row["name"]) ?? "",
        created: num(row["creationDateTime"]),
        modified: num(row["modificationDateTime"]),
        typeGuid: str(row["typeId"]),
        tagGuids: tags.get(guid) ?? [],
        attachmentGuids: attachments.get(guid) ?? [],
        hasNote: notes.has(guid),
        forgotten: row["forgottenDateTime"] != null,
      };
      out.push(thought);
    });
    return out;
  }

  private readLinks(unknowns: UnknownField[]): Link[] {
    const out: Link[] = [];
    asArray(this.source, "links.json").forEach((row, i) => {
      const guid = str(row["id"]);
      const sourceGuid = str(row["thoughtIdA"]);
      const targetGuid = str(row["thoughtIdB"]);
      if (guid === undefined || sourceGuid === undefined || targetGuid === undefined) {
        return;
      }
      collectUnknowns(row, LINK_KEYS, `links[${i}]`, unknowns);
      const relationCode = num(row["relation"]);
      const directionCode = num(row["direction"]);
      out.push({
        guid,
        sourceGuid,
        targetGuid,
        typeGuid: str(row["typeId"]),
        relation: relationCode != null ? (RELATION[relationCode] ?? "unknown") : "unknown",
        direction:
          directionCode != null ? (DIRECTION[directionCode] ?? "unknown") : "unknown",
        name: str(row["name"]),
      });
    });
    return out;
  }

  private readTypes(unknowns: UnknownField[]): Type[] {
    const out: Type[] = [];
    asArray(this.source, "types.json").forEach((row, i) => {
      const guid = str(row["id"]);
      if (guid === undefined) return;
      collectUnknowns(row, TYPE_KEYS, `types[${i}]`, unknowns);
      out.push({
        guid,
        name: str(row["name"]) ?? "",
        appliesTo: str(row["kind"]) === "link" ? "link" : "thought",
        superTypeGuid: str(row["superTypeId"]),
      });
    });
    return out;
  }

  private readTags(unknowns: UnknownField[]): Tag[] {
    const out: Tag[] = [];
    asArray(this.source, "tags.json").forEach((row, i) => {
      const guid = str(row["id"]);
      if (guid === undefined) return;
      collectUnknowns(row, TAG_KEYS, `tags[${i}]`, unknowns);
      out.push({ guid, name: str(row["name"]) ?? "" });
    });
    return out;
  }

  private readAttachments(unknowns: UnknownField[]): Attachment[] {
    const out: Attachment[] = [];
    asArray(this.source, "attachments.json").forEach((row, i) => {
      const guid = str(row["id"]);
      const thoughtGuid = str(row["thoughtId"]);
      if (guid === undefined || thoughtGuid === undefined) return;
      collectUnknowns(row, ATTACHMENT_KEYS, `attachments[${i}]`, unknowns);
      const kindRaw = str(row["type"]);
      out.push({
        guid,
        thoughtGuid,
        kind: kindRaw === "file" || kindRaw === "url" ? kindRaw : "unknown",
        name: str(row["name"]) ?? "",
        location: str(row["location"]) ?? "",
        bytes: num(row["byteCount"]),
      });
    });
    return out;
  }

  readNote(thoughtGuid: string): Note | undefined {
    const index = this.buildNoteIndex();
    const entry = index.get(thoughtGuid);
    if (entry === undefined) return undefined;
    const body = this.source.text(entry);
    if (body === undefined) return undefined;
    const ext = entry.slice(entry.lastIndexOf(".") + 1).toLowerCase();
    return {
      thoughtGuid,
      format: NOTE_FORMAT[ext] ?? "unknown",
      body,
    };
  }

  close(): void {
    // Nothing to release: the source is read eagerly per call.
  }
}

/** Whether `path` looks like a BrainZip export or an unpacked one. */
export function looksLikeBrainZip(path: string): boolean {
  if (!existsSync(path)) return false;
  if (statSync(path).isDirectory()) {
    return existsSync(join(path, "thoughts.json"));
  }
  return path.toLowerCase().endsWith(".brz");
}
