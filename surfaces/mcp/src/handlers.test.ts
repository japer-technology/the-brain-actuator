import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { open } from "@thelocalbrain/core";
import { getNeighbors, getThought, listThoughts, searchThoughts } from "./handlers.js";

// surfaces/mcp/dist/handlers.test.js → repo root is three levels up.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const brzFile = join(repoRoot, "fixtures", "sample.brz");
const THELOCALBRAIN = "33333333-3333-3333-3333-333333333333";

test("list_thoughts excludes forgotten thoughts by default", async () => {
  const brain = open(brzFile);
  try {
    const result = await listThoughts(brain, {});
    const labels = JSON.parse(result.content[0]!.text) as { label: string }[];
    assert.equal(labels.length, 3);
    assert.ok(!labels.some((t) => t.label === "Archived Idea"));
  } finally {
    brain.close();
  }
});

test("get_thought returns an error result for a missing guid", async () => {
  const brain = open(brzFile);
  try {
    const result = await getThought(brain, { guid: "missing" });
    assert.equal(result.isError, true);
  } finally {
    brain.close();
  }
});

test("search_thoughts matches labels case-insensitively", async () => {
  const brain = open(brzFile);
  try {
    const result = await searchThoughts(brain, { query: "local" });
    const matches = JSON.parse(result.content[0]!.text) as { label: string }[];
    assert.equal(matches.length, 1);
    assert.equal(matches[0]!.label, "TheLocalBrain");
  } finally {
    brain.close();
  }
});

test("get_neighbors returns link metadata", async () => {
  const brain = open(brzFile);
  try {
    const result = await getNeighbors(brain, { guid: THELOCALBRAIN, direction: "incoming" });
    const neighbors = JSON.parse(result.content[0]!.text) as unknown[];
    assert.equal(neighbors.length, 2);
  } finally {
    brain.close();
  }
});
