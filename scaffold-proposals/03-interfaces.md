# 03 — Interface catalog

Every interface here is a **thin control surface** over the core coupler
([02-core-coupler.md](02-core-coupler.md)). None of them contain storage logic.
This document describes what each does, who it serves, its risks, and a proposed
priority, so the team can choose a **launch set** and defer the rest.

Priority legend:

- **Launch** — propose to build first; highest leverage, lowest incremental risk.
- **Soon** — build shortly after launch once the contract is proven.
- **Later** — valuable but defer; build when there is concrete demand.
- **Cross-cutting** — not a standalone surface; lives in or beside the core.

## Summary table

| # | Interface | Name | Serves | Read/Write | Priority |
| --- | --- | --- | --- | --- | --- |
| 1 | SDK | StateLink SDK | App developers | both | **Launch** |
| 2 | CLI | statelinkctl | Devs/admins | both | **Launch** |
| 3 | MCP Server | StateLink MCP Server | AI agents/tools | both | **Launch** |
| 4 | REST API | StateLink REST Gateway | Apps, dashboards, scripts | both | Soon |
| 5 | Web UI | StateLink Console | Humans | both | Soon |
| 6 | TUI | StateLink TUI | Humans (terminal) | both | Later |
| 7 | WebSocket | StateLink Live Bus | Live consumers | read/stream | Later |
| 8 | gRPC | StateLink RPC Bridge | Internal systems | both | Later |
| 9 | GraphQL | StateGraph Interface | Flexible queriers | read | Later |
| 10 | FUSE mount | StateLink VirtualFS | Filesystem-native tools | read (write later) | Later |
| 11 | Git-like layer | StateLink Version Layer | Auditors, power users | read | Later |
| 12 | SQL-like query | StateQuery Engine | Analysts | read | Later |
| 13 | Webhooks | StateLink Event Hooks | Integrations | notify | Later |
| 14 | Plugin API | StateLink Extension API | Extenders | n/a | Cross-cutting |

## Launch set (proposed)

### 1. StateLink SDK — *the core, packaged*
- **What:** the core coupler exposed as a library in one or more languages.
- **Why launch:** it is essentially the core itself; every out-of-process surface
  embeds it, so it must exist first. It is also the cheapest surface — minimal
  translation.
- **Risk:** lowest. Read paths are non-destructive; writes go through the same
  guards as everything else.

### 2. statelinkctl — *CLI*
- **What:** `discover`, `read`/`export`, and (opt-in) the allow-listed mutations,
  driven from the shell. In-process; no network.
- **Why launch:** it is the primary tool for the discovery bootstrap workflow and
  for operators verifying behavior against real brains. Excellent for testing the
  core contract end to end.
- **Risk:** low; writes require an explicit `--write` style opt-in and inherit all
  StateGuard preconditions.

### 3. StateLink MCP Server — *AI/agent surface (flagship)*
- **What:** exposes the core to AI agents/tools through MCP tools and resources
  over JSON-RPC, using MCP's client-host-server model. See
  [05-mcp-server.md](05-mcp-server.md) for the deep dive.
- **Why launch:** it is the headline reason for the scaffold — letting agents
  safely operate on a brain. Building it early forces the capability/negotiation
  contract to be clean.
- **Risk:** medium — it is the surface most likely to attempt writes
  programmatically, which is exactly why it must sit on the shared guards rather
  than its own logic. Default to **read-only tools**; gate write tools behind an
  explicit opt-in.

## Soon

### 4. StateLink REST Gateway
- **What:** conventional HTTP+JSON over the core; auth, rate limits, and CORS live
  here (never in the core). Maps the error taxonomy to HTTP status codes.
- **Why soon:** broad reach for dashboards and scripts once the contract is
  stable.
- **Risk:** introduces network exposure ⇒ auth/authz become a real concern;
  read-only deployments should be trivial to configure.

### 5. StateLink Console (Web UI)
- **What:** browse the graph, view notes/attachments, diff proposed changes,
  validate, and (opt-in) perform allow-listed edits — typically atop the REST
  Gateway.
- **Why soon:** makes the data approachable for humans and showcases diffing.
- **Risk:** mostly inherited from REST; write affordances must always show the
  backup/validation story.

## Later (build on demand)

- **6. StateLink TUI** — terminal explorer/editor for environments without a
  browser.
- **7. StateLink Live Bus (WebSocket)** — subscriptions and change streaming;
  depends on a change-detection mechanism (file watch + StateJournal).
- **8. StateLink RPC Bridge (gRPC)** — typed, high-performance path for internal
  services.
- **9. StateGraph Interface (GraphQL)** — flexible graph querying; natural fit for
  the typed thought/link graph.
- **10. StateLink VirtualFS (FUSE)** — presents the interpreted brain as a virtual
  filesystem; read-first, writes much later given the risk.
- **11. StateLink Version Layer** — git-like diffs/commits/rollback/branches; a
  *surface over* StateJournal (see [06](06-safety-and-versioning.md)).
- **12. StateQuery Engine** — SQL-like queries/views over the normalized graph.
- **13. StateLink Event Hooks (Webhooks)** — outbound notifications on change.

## Cross-cutting

### 14. StateLink Extension API (Plugin interface)
- **What:** lets third parties register custom **parsers** (new formats),
  **validators** (extra invariants), and **mutators** (new, opt-in operations) —
  all of which still pass through StateGuard and the allow-list.
- **Why cross-cutting:** it is not a way to *reach* the core; it is a way to
  *extend* the core's adapters/validators. It must not become a back door around
  the safety layer.

## Selection guidance

A defensible **minimum launch** is **SDK + CLI** (prove the core and the bootstrap
workflow), adding the **MCP Server** as soon as the contract stabilizes since it
is the project's flagship motivation. REST + Console follow once writes are
proven. Everything else is demand-driven.

## Decision this document asks for

> **D3:** Which interfaces are in the **launch set**, which are **soon**, and
> which are **later/never**? (Recommendation: launch = SDK + CLI + MCP; soon =
> REST + Console; rest = later.)
