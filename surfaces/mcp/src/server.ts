#!/usr/bin/env node
/**
 * TheLocalBrain MCP Server — a read-only Model Context Protocol surface over
 * TheLocalBrain Core, speaking stdio only (remote/networked transport is
 * deferred, per QUESTIONS.md D5c).
 *
 * Safety posture (D5b): the brain is opened read-only and ONLY read tools are
 * registered. Write tools are never registered in this version.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { open, type BrainHandle } from "@thelocalbrain/core";
import {
  discoveryReport,
  getNeighbors,
  getNote,
  getThought,
  listThoughts,
  searchThoughts,
} from "./handlers.js";

/** Build a configured (but not yet connected) read-only MCP server. */
export function buildServer(brain: BrainHandle): McpServer {
  const server = new McpServer({
    name: "thelocalbrain-mcp",
    version: "0.0.0",
  });

  // Resource: the discovery report for the opened brain.
  server.registerResource(
    "discovery-report",
    "brain://report",
    {
      title: "Discovery report",
      description: "Detected format/version, entity counts, and schema for the opened brain.",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "brain://report",
          mimeType: "application/json",
          text: JSON.stringify(brain.report, null, 2),
        },
      ],
    }),
  );

  // Read tools only — no write tools are registered (read-only posture).
  server.registerTool(
    "list_thoughts",
    {
      title: "List thoughts",
      description: "List thoughts (guid + label). Forgotten thoughts are excluded by default.",
      inputSchema: {
        includeForgotten: z.boolean().optional(),
        limit: z.number().int().positive().optional(),
      },
    },
    (args) => listThoughts(brain, args),
  );

  server.registerTool(
    "get_thought",
    {
      title: "Get thought",
      description: "Fetch a thought with its type, tags, attachments, links, and note.",
      inputSchema: { guid: z.string() },
    },
    (args) => getThought(brain, args),
  );

  server.registerTool(
    "get_note",
    {
      title: "Get note",
      description: "Fetch a thought's note body and format.",
      inputSchema: { guid: z.string() },
    },
    (args) => getNote(brain, args),
  );

  server.registerTool(
    "get_neighbors",
    {
      title: "Get neighbors",
      description: "List a thought's graph neighbors with link metadata.",
      inputSchema: {
        guid: z.string(),
        direction: z.enum(["both", "outgoing", "incoming"]).optional(),
      },
    },
    (args) => getNeighbors(brain, args),
  );

  server.registerTool(
    "search_thoughts",
    {
      title: "Search thoughts",
      description: "Find thoughts whose label contains a substring (case-insensitive).",
      inputSchema: {
        query: z.string(),
        limit: z.number().int().positive().optional(),
      },
    },
    (args) => searchThoughts(brain, args),
  );

  // Prompt: summarize a thought's subtree (MCP-1: prompts are in scope).
  server.registerPrompt(
    "summarize_thought",
    {
      title: "Summarize a thought",
      description: "Produce a prompt asking the agent to summarize a thought and its neighbors.",
      argsSchema: { guid: z.string() },
    },
    async ({ guid }) => {
      const ctx = await getThought(brain, { guid });
      const neighbors = await getNeighbors(brain, { guid });
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                "Summarize this TheBrain thought and how it relates to its neighbors.\n\n" +
                `Thought + context:\n${ctx.content[0]?.text ?? ""}\n\n` +
                `Neighbors:\n${neighbors.content[0]?.text ?? ""}`,
            },
          },
        ],
      };
    },
  );

  void discoveryReport; // exported for tests; report is exposed as a resource.
  return server;
}

async function main(): Promise<void> {
  const path = process.argv[2] ?? process.env["THELOCALBRAIN_PATH"];
  if (path === undefined) {
    process.stderr.write(
      "usage: thelocalbrain-mcp <brain-path>  (or set THELOCALBRAIN_PATH)\n",
    );
    process.exit(2);
  }

  // Open read-only and fail closed before connecting any transport.
  const brain = open(path);
  const server = buildServer(brain);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const mainPath = process.argv[1];
const urlPath = decodeURIComponent(new URL(import.meta.url).pathname);
const normalizedUrlPath =
  process.platform === "win32" && urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;

// Only run the server when invoked directly (not when imported by tests).
if (mainPath && normalizedUrlPath === mainPath) {
  main().catch((err: unknown) => {
    process.stderr.write(`fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
