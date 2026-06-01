# 05 — MCP server deep dive

The MCP server is the flagship surface: it is what lets AI agents and tools read
and (carefully) mutate a brain. This document details how that surface maps onto
the core coupler ([02-core-coupler.md](02-core-coupler.md)) **without** holding
any storage logic of its own.

> Name per [01-naming.md](01-naming.md): recommended **TheLocalBrain MCP Server**
> (visceral alternative: *Filesystem Cortex MCP*).

## What MCP gives us

The [Model Context Protocol](https://modelcontextprotocol.io) defines a
**client-host-server** model with **JSON-RPC** messaging, and standard primitives:

- **Resources** — addressable, readable content the host can pull into context.
- **Tools** — callable operations the model can invoke (with typed inputs).
- **Prompts** — optional reusable prompt templates.

The TheLocalBrain MCP Server is an MCP **server**: it advertises resources and tools
that are thin wrappers over core operations, and it relays the core's results and
refusals back over JSON-RPC.

## Mapping the core onto MCP primitives

### Resources (read-only, safe by default)

| Resource | Backed by core operation |
| --- | --- |
| `brain://discovered` | discovery report: brains found + detected format/version + confidence |
| `brain://{id}/thought/{guid}` | read a thought (label, type, tags, timestamps) |
| `brain://{id}/thought/{guid}/note` | resolve a thought's note body |
| `brain://{id}/thought/{guid}/links` | links incident to a thought |
| `brain://{id}/graph` | streamed/paged graph traversal |
| `brain://{id}/capabilities` | the capability set: mode + adapter-declared abilities |

Resources are pure reads, so they are always available and non-destructive.

### Tools

Split into two tiers, gated separately:

**Read tools (default on):**
- `discover_brains` — run discovery, return the report.
- `open_brain` — obtain a handle (defaults to **read-only** mode).
- `get_thought` / `find_thoughts` / `traverse` — query the normalized model.
- `get_capabilities` — negotiate before any write is attempted.

**Write tools (default OFF; require explicit server-side opt-in):**
- `set_note` / `add_tag` / `remove_tag` / `rename_thought` /
  `create_thought` / `create_link` — exactly the allow-list from
  [`docs/modifying.md`](../docs/modifying.md), in risk order.

> The write tools are **not registered at all** unless the operator starts the
> server in a write-enabled mode, and even then each call passes through the full
> TheLocalBrainGuard precondition pipeline in the core. The MCP server never writes
> files itself.

## Safety posture specific to agents

Agents are the consumer most likely to attempt writes autonomously, so this
surface adds *surface-level* guardrails **on top of** (never instead of) the
core's guards:

1. **Read-only by default deployment.** The default `thelocalbrain-mcp` start mode
   exposes only resources and read tools.
2. **Two-step writes via negotiation.** A write tool should require the agent to
   first observe `get_capabilities`; the core still re-checks every precondition,
   so a stale capability cannot cause an unsafe write.
3. **Honest refusals.** The core's refusal taxonomy
   ([02-core-coupler.md](02-core-coupler.md)) maps to MCP tool errors verbatim —
   `locked`, `read-only`, `not-allowed`, `validation-failed` (rolled back), etc.
   The agent must never see a swallowed failure presented as success.
4. **Journaled attribution.** Every write tool call is recorded in TheLocalBrainJournal
   with the session identity (see [06-safety-and-versioning.md](06-safety-and-versioning.md)).
5. **No network beyond MCP.** The server embeds the core in-process; it does not
   reach the network for anything except serving MCP itself.

## Deployment shapes

- **stdio server** for a single local agent/host (the common MCP case).
- **(optional, later) socket/HTTP transport** if remote agents are needed — at
  which point auth/authz become mandatory, exactly as for the REST Gateway.

The transport choice lives entirely in this surface; the core is unaware of it.

## Why MCP forces a clean core

Building this surface early is valuable precisely because MCP's tool/resource and
capability model **demands** that the core's capability negotiation and error
taxonomy be explicit and machine-readable. If the core contract is clean enough
for an autonomous agent to use safely, it is clean enough for every other
surface.

## Open questions

The MCP decisions (**D5a**, **D5b**, **D5c**) and the MCP-specific questions
(**MCP-1**, **MCP-2**, **MCP-3**) are answered in [QUESTIONS.md](QUESTIONS.md).
