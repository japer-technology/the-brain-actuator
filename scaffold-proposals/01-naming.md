# 01 — Naming

Naming is a decision, not a fact. This document lays out candidate names for the
**core mechanism** and for **each interface**, plus a recommendation. The goal is
to pick a working name now so the rest of the scaffold can refer to concrete
identifiers; it can be revised before any code is written.

## Naming tension to resolve first

There are two naming "worlds" in play:

1. **Project-native names** that match the existing repo: *The Brain Activator*,
   *Brain*, *Thought*, *Link*. These read naturally to anyone who knows the repo.
2. **Generic substrate names** from the loose guidance: *StateLink*,
   *Filesystem State Coupler*, *Cortex*, *Substrate*. These read as a general
   "file-backed state coupler" that happens to target TheBrain.

> **Recommendation:** keep the **product/repo identity** as *The Brain
> Activator*, and give the **core mechanism** a distinct, evocative name so the
> "core vs. surfaces" split is obvious in code and docs. The generic *StateLink*
> family is a strong fit for that internal core name.

## Core mechanism — candidates

| Style | Candidate | Notes |
| --- | --- | --- |
| Clean / architectural | **State Coupler** / `Coupler` | Describes the function literally: couples external callers to the file substrate. |
| Clean, evocative | **StateLink** | From the guidance. Short, brandable, pairs well with surface names (StateLink MCP, etc.). |
| Visceral | **Cortex** | "Filesystem Cortex." Fits the "brain" theme of the repo nicely. |
| Architectural | **Substrate Coupler** | Emphasizes the file-backed substrate. |
| Project-native | **Activator Core** | Matches the repo name directly; least surprising. |

**Recommended core name:** **StateLink Core** (brandable, composes cleanly with
surface names), with **Activator Core** as the safe fallback if we prefer to keep
everything under the repo's existing identity.

Whichever is chosen, this proposal uses **"the core coupler"** generically so the
text survives a rename.

## Interfaces — candidate names

Adapted from the loose guidance. "Priority" is this proposal's suggestion, not a
decision (see [03-interfaces.md](03-interfaces.md) for rationale).

| Interface | What it does | Suggested name | Priority |
| --- | --- | --- | --- |
| **MCP Server** | Lets AI agents/tools read & mutate the brain via defined tools/resources over JSON-RPC (client-host-server model). | **StateLink MCP Server** | **Launch** |
| **CLI** | Direct command-line control for developers/admins. | **statelinkctl** (or `brainctl`) | **Launch** |
| **SDK** | Library for TypeScript/Python/etc. (often the core itself, packaged). | **StateLink SDK** | **Launch** |
| **REST API** | Conventional HTTP API for apps, dashboards, scripts. | **StateLink REST Gateway** | Soon |
| **Web UI** | Browser interface for browsing, diffing, editing, validating. | **StateLink Console** | Soon |
| **TUI** | Terminal-based visual explorer/editor. | **StateLink TUI** | Later |
| **WebSocket** | Live updates, subscriptions, state-change streaming. | **StateLink Live Bus** | Later |
| **gRPC** | High-performance typed service interface for internal systems. | **StateLink RPC Bridge** | Later |
| **GraphQL API** | Flexible querying of the state/graph tree. | **StateGraph Interface** | Later |
| **FUSE Mount** | Presents the interpreted brain as a virtual filesystem. | **StateLink VirtualFS** | Later |
| **Git-like layer** | Diffs, commits, rollbacks, branches, audit history. | **StateLink Version Layer** | Later |
| **SQL-like query** | Query the normalized graph as tables/views. | **StateQuery Engine** | Later |
| **Webhook system** | Emits notifications when files/state change. | **StateLink Event Hooks** | Later |
| **Plugin interface** | Custom parsers, validators, mutators. | **StateLink Extension API** | Cross-cutting |
| **Policy/Safety layer** | Permissions, validation, locking, write guards. | **StateGuard** | Cross-cutting (in core) |
| **Audit/diff/rollback** | Operation log, diffs, restore points. | **StateJournal** | Cross-cutting (in core) |

> Note: **StateGuard** and **StateJournal** are *not* user-facing interfaces.
> They are cross-cutting concerns that live **inside the core** and back several
> surfaces (e.g. the Version Layer is a *surface* over StateJournal). See
> [06-safety-and-versioning.md](06-safety-and-versioning.md).

## MCP-specific name shortlist

From the guidance, for the MCP surface specifically:

1. Filesystem State MCP
2. **StateLink MCP** ← cleanest
3. FileStore MCP Bridge
4. Persistence Coupler MCP
5. State Implant MCP Server
6. Neural File MCP
7. File-State Actuator MCP
8. Substrate MCP Server
9. **Filesystem Cortex MCP** ← most visceral, fits the brain theme
10. StateStore NeuroBridge MCP

**Recommended:** **StateLink MCP Server** as the formal name; *Filesystem Cortex
MCP* is a strong alternative if we want the name to lean into the "brain" motif.

## Naming conventions to adopt (proposed)

- **Core name** is a noun phrase: *StateLink Core* / *Activator Core*.
- **Surface names** are `<Core> <Surface>`: *StateLink MCP Server*, *StateLink
  REST Gateway*, *StateLink Console*.
- **Executables** are lowercase, no spaces: `statelinkctl`, `statelink-mcp`,
  `statelink-rest`.
- **Internal cross-cutting components** keep distinct, memorable names so they
  are easy to reference in reviews: **StateGuard**, **StateJournal**.

## Open questions

The naming decisions (**D1a**, **D1b**, **D1c**) are answered in
[QUESTIONS.md](QUESTIONS.md).
