import { test } from "node:test";
import assert from "node:assert/strict";
import { TheLocalBrainGuard } from "./guard/index.js";
import { TheLocalBrainJournal } from "./journal/index.js";
import { CoreError } from "./errors.js";
import type { AdapterCapabilities } from "./adapters/types.js";

const readOnlyCaps: AdapterCapabilities = {
  format: "brainzip",
  version: "hypothetical-1",
  confidence: 0.95,
  canRead: true,
  writableMutations: [],
  syncBookkeepingUnderstood: false,
};

const unknownCaps: AdapterCapabilities = {
  format: "unknown",
  confidence: 0,
  canRead: false,
  writableMutations: [],
  syncBookkeepingUnderstood: false,
};

test("guard allows reads on a recognized, readable brain", () => {
  const guard = new TheLocalBrainGuard(readOnlyCaps, "read-only");
  assert.doesNotThrow(() => guard.assertReadable());
});

test("guard fails closed on unknown formats", () => {
  const guard = new TheLocalBrainGuard(unknownCaps, "read-only");
  assert.throws(
    () => guard.assertReadable(),
    (e: unknown) => e instanceof CoreError && e.category === "unrecognized-format",
  );
});

test("capability negotiation reports no writable mutations in v1", () => {
  const guard = new TheLocalBrainGuard(readOnlyCaps, "read-only");
  assert.equal(guard.can("set-note"), false);
  assert.equal(guard.can("add-tag"), false);
});

test("assertCanWrite always refuses in v1 (fail closed)", () => {
  const guard = new TheLocalBrainGuard(readOnlyCaps, "read-only");
  assert.throws(
    () => guard.assertCanWrite("set-note"),
    (e: unknown) => e instanceof CoreError && e.category === "read-only",
  );
});

test("journal records operations with the session id", () => {
  const journal = new TheLocalBrainJournal("session-xyz");
  journal.record("open", "ok");
  journal.record("read", "ok", "thoughtContext");
  const entries = journal.entries();
  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.sessionId, "session-xyz");
  assert.equal(entries[1]?.operation, "read");
});
