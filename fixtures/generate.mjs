// Regenerate the derived fixtures (sample.brz ZIP + sample.db SQLite) from the
// unpacked brainzip-sample/ directory. Run: node fixtures/generate.mjs
//
// These fixtures are SYNTHETIC (built to documented hypotheses), not captures
// from a real TheBrain installation. See fixtures/README.md.
import { readFileSync, writeFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";
import Database from "better-sqlite3";

const here = dirname(fileURLToPath(import.meta.url));
const sampleDir = join(here, "brainzip-sample");

function collectFiles(dir) {
  const out = {};
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else out[relative(sampleDir, full).split(sep).join("/")] = readFileSync(full);
    }
  };
  walk(dir);
  return out;
}

// 1) sample.brz — a real ZIP of the unpacked sample.
const files = collectFiles(sampleDir);
const zipped = zipSync(files, { level: 6 });
writeFileSync(join(here, "sample.brz"), zipped);

// 2) sample.db — the same data in a SQLite working-directory layout.
const json = (name) => JSON.parse(files[name] ? Buffer.from(files[name]).toString("utf8") : "[]");
const dbPath = join(here, "sample.db");
rmSync(dbPath, { force: true });
const db = new Database(dbPath);
db.pragma("user_version = 1");
db.exec(`
  CREATE TABLE Thoughts (Id TEXT PRIMARY KEY, Name TEXT, CreationDateTime INTEGER,
    ModificationDateTime INTEGER, TypeId TEXT, ForgottenDateTime INTEGER);
  CREATE TABLE Links (Id TEXT PRIMARY KEY, ThoughtIdA TEXT, ThoughtIdB TEXT,
    Relation INTEGER, Direction INTEGER, Name TEXT, TypeId TEXT);
  CREATE TABLE Types (Id TEXT PRIMARY KEY, Name TEXT, Kind TEXT, SuperTypeId TEXT);
  CREATE TABLE Tags (Id TEXT PRIMARY KEY, Name TEXT);
  CREATE TABLE ThoughtTags (ThoughtId TEXT, TagId TEXT);
  CREATE TABLE Attachments (Id TEXT PRIMARY KEY, ThoughtId TEXT, Type TEXT, Name TEXT,
    Location TEXT, ByteCount INTEGER);
  CREATE TABLE Notes (ThoughtId TEXT PRIMARY KEY, Format TEXT, Body TEXT);
`);

const insert = (sql, rows) => {
  const stmt = db.prepare(sql);
  const tx = db.transaction((items) => items.forEach((r) => stmt.run(r)));
  tx(rows);
};

insert(
  `INSERT INTO Thoughts VALUES (@id,@name,@creationDateTime,@modificationDateTime,@typeId,@forgottenDateTime)`,
  json("thoughts.json").map((t) => ({
    id: t.id,
    name: t.name,
    creationDateTime: t.creationDateTime ?? null,
    modificationDateTime: t.modificationDateTime ?? null,
    typeId: t.typeId ?? null,
    forgottenDateTime: t.forgottenDateTime ?? null,
  })),
);
insert(
  `INSERT INTO Links VALUES (@id,@thoughtIdA,@thoughtIdB,@relation,@direction,@name,@typeId)`,
  json("links.json").map((l) => ({
    id: l.id,
    thoughtIdA: l.thoughtIdA,
    thoughtIdB: l.thoughtIdB,
    relation: l.relation ?? null,
    direction: l.direction ?? null,
    name: l.name ?? null,
    typeId: l.typeId ?? null,
  })),
);
insert(
  `INSERT INTO Types VALUES (@id,@name,@kind,@superTypeId)`,
  json("types.json").map((t) => ({
    id: t.id,
    name: t.name,
    kind: t.kind ?? "thought",
    superTypeId: t.superTypeId ?? null,
  })),
);
insert(
  `INSERT INTO Tags VALUES (@id,@name)`,
  json("tags.json").map((t) => ({ id: t.id, name: t.name })),
);
insert(
  `INSERT INTO ThoughtTags VALUES (@thoughtId,@tagId)`,
  json("thoughtTags.json").map((t) => ({ thoughtId: t.thoughtId, tagId: t.tagId })),
);
insert(
  `INSERT INTO Attachments VALUES (@id,@thoughtId,@type,@name,@location,@byteCount)`,
  json("attachments.json").map((a) => ({
    id: a.id,
    thoughtId: a.thoughtId,
    type: a.type ?? null,
    name: a.name ?? null,
    location: a.location ?? null,
    byteCount: a.byteCount ?? null,
  })),
);

// Out-of-line notes become rows in the Notes table.
const noteRows = Object.keys(files)
  .filter((name) => name.startsWith("notes/") && name.endsWith(".html"))
  .map((name) => ({
    thoughtId: name.slice("notes/".length, -".html".length),
    format: "html",
    body: Buffer.from(files[name]).toString("utf8"),
  }));
insert(`INSERT INTO Notes VALUES (@thoughtId,@format,@body)`, noteRows);

db.close();

console.log(`Wrote ${join(here, "sample.brz")} and ${dbPath}`);
