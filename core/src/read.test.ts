import { test } from "node:test";
import assert from "node:assert/strict";
import { open, CoreError } from "./index.js";
import { brzFile, HOME, PROJECTS, THELOCALBRAIN } from "./test-helpers.js";

test("open() runs discovery, exposes read services and capabilities (read-only)", () => {
  const brain = open(brzFile);
  try {
    assert.equal(brain.mode, "read-only");
    assert.equal(brain.capabilities.format, "brainzip");
    assert.equal(brain.capabilities.canRead, true);
    assert.deepEqual(brain.capabilities.writableMutations, []);
    assert.equal(brain.report.entityCounts.thoughts, 4);
  } finally {
    brain.close();
  }
});

test("thoughtContext joins type, tags, attachments, links and the note", async () => {
  const brain = open(brzFile);
  try {
    const ctx = await brain.read.thoughtContext(THELOCALBRAIN);
    assert.ok(ctx);
    assert.equal(ctx.thought.label, "TheLocalBrain");
    assert.equal(ctx.tags.length, 2);
    assert.equal(ctx.attachments.length, 2);
    assert.equal(ctx.links.length, 2);
    assert.ok(ctx.note);
    assert.match(ctx.note.body, /local data plane/);
  } finally {
    brain.close();
  }
});

test("graph traversal returns neighbors in both directions", async () => {
  const brain = open(brzFile);
  try {
    const out = await brain.read.neighbors(HOME, "outgoing");
    assert.deepEqual(
      out.map((n) => n.thoughtGuid).sort(),
      [PROJECTS, THELOCALBRAIN].sort(),
    );
    const incoming = await brain.read.neighbors(THELOCALBRAIN, "incoming");
    assert.equal(incoming.length, 2);
  } finally {
    brain.close();
  }
});

test("streamThoughts pages instead of returning everything at once", async () => {
  const brain = open(brzFile);
  try {
    const pages: number[] = [];
    for await (const page of brain.read.streamThoughts(2)) pages.push(page.length);
    assert.deepEqual(pages, [2, 2]);
  } finally {
    brain.close();
  }
});

test("open() fails closed with a typed refusal on an unrecognized path", () => {
  assert.throws(
    () => open("/no/such/brain"),
    (err: unknown) =>
      err instanceof CoreError && err.category === "unrecognized-format",
  );
});

test("open() refuses read-write mode in v1", () => {
  assert.throws(
    () => open(brzFile, { mode: "read-write" }),
    (err: unknown) => err instanceof CoreError && err.category === "read-only",
  );
});
