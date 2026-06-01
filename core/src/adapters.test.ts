import { test } from "node:test";
import assert from "node:assert/strict";
import { BrainZipAdapter } from "./adapters/brainzip.js";
import { SqliteAdapter } from "./adapters/sqlite.js";
import { brainzipDir, sqliteFile, THELOCALBRAIN } from "./test-helpers.js";

test("BrainZip and SQLite adapters produce the same normalized model", () => {
  const brz = new BrainZipAdapter(brainzipDir, "hypothetical-1", 0.95);
  const sqlite = new SqliteAdapter(sqliteFile, "1", 0.8);
  try {
    const a = brz.read();
    const b = sqlite.read();
    assert.equal(a.thoughts.length, b.thoughts.length);
    assert.equal(a.links.length, b.links.length);
    assert.equal(a.tags.length, b.tags.length);
    assert.equal(a.attachments.length, b.attachments.length);

    const aThought = a.thoughts.find((t) => t.guid === THELOCALBRAIN);
    const bThought = b.thoughts.find((t) => t.guid === THELOCALBRAIN);
    assert.ok(aThought && bThought);
    assert.deepEqual([...aThought.tagGuids].sort(), [...bThought.tagGuids].sort());
    assert.equal(aThought.hasNote, true);
    assert.equal(bThought.hasNote, true);
  } finally {
    brz.close();
    sqlite.close();
  }
});

test("BrainZip adapter records unmapped fields as unknowns, not dropping them", () => {
  const brz = new BrainZipAdapter(brainzipDir, undefined, 0.95);
  try {
    const data = brz.read();
    const colorHint = data.unknowns.find((u) => u.field === "colorHint");
    assert.ok(colorHint, "expected the unmapped colorHint field to be recorded");
    assert.equal(colorHint.sample, "#3366cc");
  } finally {
    brz.close();
  }
});

test("forgotten (soft-deleted) thoughts are flagged, not hidden", () => {
  const brz = new BrainZipAdapter(brainzipDir, undefined, 0.95);
  try {
    const data = brz.read();
    const forgotten = data.thoughts.filter((t) => t.forgotten);
    assert.equal(forgotten.length, 1);
  } finally {
    brz.close();
  }
});

test("out-of-line notes are resolved transparently with their format", () => {
  const brz = new BrainZipAdapter(brainzipDir, undefined, 0.95);
  try {
    const note = brz.readNote(THELOCALBRAIN);
    assert.ok(note);
    assert.equal(note.format, "html");
    assert.match(note.body, /TheLocalBrain/);
    assert.equal(brz.readNote("does-not-exist"), undefined);
  } finally {
    brz.close();
  }
});

test("link relation and direction codes map to the normalized enums", () => {
  const brz = new BrainZipAdapter(brainzipDir, undefined, 0.95);
  try {
    const data = brz.read();
    const child = data.links.filter((l) => l.relation === "child");
    const jump = data.links.find((l) => l.relation === "jump");
    assert.equal(child.length, 2);
    assert.ok(jump);
    assert.equal(jump.direction, "undirected");
    assert.equal(jump.name, "see also");
  } finally {
    brz.close();
  }
});
