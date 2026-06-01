/**
 * Pure handlers for the read-only MCP surface. These translate normalized-model
 * data into MCP text content. Keeping them free of transport/SDK concerns lets
 * the surface be tested as a thin translator (see
 * `scaffold-proposals/04-architecture.md`).
 */
import type { BrainHandle } from "@thelocalbrain/core";

export interface TextContent {
  readonly type: "text";
  readonly text: string;
}

export interface ToolResult {
  readonly content: TextContent[];
  readonly isError?: boolean;
  readonly [key: string]: unknown;
}

const ok = (value: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
});

const err = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

export async function listThoughts(
  brain: BrainHandle,
  args: { includeForgotten?: boolean; limit?: number },
): Promise<ToolResult> {
  const data = await brain.read.data();
  let thoughts = data.thoughts;
  if (args.includeForgotten !== true) thoughts = thoughts.filter((t) => !t.forgotten);
  if (args.limit !== undefined) thoughts = thoughts.slice(0, args.limit);
  return ok(thoughts.map((t) => ({ guid: t.guid, label: t.label })));
}

export async function getThought(
  brain: BrainHandle,
  args: { guid: string },
): Promise<ToolResult> {
  const ctx = await brain.read.thoughtContext(args.guid);
  return ctx === undefined ? err(`Thought not found: ${args.guid}`) : ok(ctx);
}

export async function getNote(brain: BrainHandle, args: { guid: string }): Promise<ToolResult> {
  const note = await brain.read.note(args.guid);
  return note === undefined ? err(`No note for thought: ${args.guid}`) : ok(note);
}

export async function getNeighbors(
  brain: BrainHandle,
  args: { guid: string; direction?: "both" | "outgoing" | "incoming" },
): Promise<ToolResult> {
  const neighbors = await brain.read.neighbors(args.guid, args.direction ?? "both");
  return ok(
    neighbors.map((n) => ({
      via: n.via,
      relation: n.link.relation,
      direction: n.link.direction,
      thoughtGuid: n.thoughtGuid,
      linkName: n.link.name,
    })),
  );
}

export async function searchThoughts(
  brain: BrainHandle,
  args: { query: string; limit?: number },
): Promise<ToolResult> {
  const data = await brain.read.data();
  const needle = args.query.toLowerCase();
  const matches = data.thoughts
    .filter((t) => t.label.toLowerCase().includes(needle))
    .slice(0, args.limit ?? 50);
  return ok(matches.map((t) => ({ guid: t.guid, label: t.label })));
}

export function discoveryReport(brain: BrainHandle): ToolResult {
  return ok(brain.report);
}
