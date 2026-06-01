import { test } from "node:test";
import assert from "node:assert/strict";
import { discover } from "./index.js";
import { brainzipDir, brzFile, sqliteFile } from "./test-helpers.js";

test("discover recognizes an unpacked .brz directory with high confidence", () => {
  const report = discover(brainzipDir);
  assert.equal(report.format, "brainzip");
  assert.equal(report.version, "hypothetical-1");
  assert.ok(report.confidence >= 0.9);
  assert.deepEqual(report.entityCounts, {
    thoughts: 4,
    links: 3,
    types: 1,
    tags: 2,
    attachments: 2,
  });
});

test("discover reads a real .brz ZIP archive", () => {
  const report = discover(brzFile);
  assert.equal(report.format, "brainzip");
  assert.equal(report.entityCounts.thoughts, 4);
  // The schema probe enumerates documents, not hard-coded tables.
  const docNames = report.schema.entities.map((e) => e.name);
  assert.ok(docNames.includes("thoughts.json"));
});

test("discover probes a SQLite brain schema from sqlite_master", () => {
  const report = discover(sqliteFile);
  assert.equal(report.format, "sqlite");
  assert.equal(report.entityCounts.thoughts, 4);
  const tables = report.schema.entities.map((e) => e.name);
  assert.ok(tables.includes("Thoughts"));
  assert.ok(tables.includes("Links"));
  assert.equal(report.schema.versionMarkers["user_version"], 1);
});

test("discover fails closed (confidence 0, not safe to write) on unknown formats", () => {
  const report = discover("/nonexistent/path/to/brain");
  assert.equal(report.format, "unknown");
  assert.equal(report.confidence, 0);
  assert.equal(report.safeToWrite.safeToWrite, false);
});

test("safeToWrite is always false in read-only v1", () => {
  for (const path of [brainzipDir, sqliteFile]) {
    assert.equal(discover(path).safeToWrite.safeToWrite, false);
  }
});
