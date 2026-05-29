# 04 — Proposed architecture & layout

This document turns the concept ([00](00-concept.md)) and the core contract
([02](02-core-coupler.md)) into a concrete, end-to-end layering and a candidate
repository/package layout. It is a **proposal**; the runtime and exact module
boundaries are open decisions (see [07-decisions.md](07-decisions.md)).

## End-to-end layering

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                            Interfaces (surfaces)                       │
   │  MCP Server · CLI · SDK packaging · REST Gateway · Console · TUI · …   │
   │  (protocol translation + transport/auth/formatting only)              │
   └───────────────────────────────────┬────────────────────────────────--┘
                                       │  core capability contract
   ┌───────────────────────────────────▼────────────────────────────────--┐
   │                              Core coupler                             │
   │                                                                       │
   │   Public core API   open() · discover() · read*() · (opt) write*()    │
   │        │                                                              │
   │   ┌────▼─────────┐   ┌──────────────────┐                            │
   │   │ Read services│   │  Write services  │  (allow-listed, guarded)    │
   │   └────┬─────────┘   └────────┬─────────┘                            │
   │        │                      │                                       │
   │   ┌────▼──────────────────────▼─────────┐                            │
   │   │          Normalized model           │  thoughts/links/types/…     │
   │   └────────────────┬────────────────────┘                            │
   │                    │                                                  │
   │   ┌────────────────▼────────────────────┐                            │
   │   │           Storage adapters          │  SQLite · BrainZip/JSON·XML │
   │   └────────────────┬────────────────────┘                            │
   │                    │                                                  │
   │   ┌────────────────▼─────────┐   ┌───────────────┐  ┌──────────────┐ │
   │   │ Discovery + StateGuard   │   │  StateJournal │  │ Extension API│ │
   │   │ detect·lock·backup·valid │   │ log·diff·undo │  │ parsers/etc. │ │
   │   └────────────────┬─────────┘   └───────────────┘  └──────────────┘ │
   └────────────────────┼──────────────────────────────────────────────--┘
                        │
                  ┌─────▼──────┐
                  │ Filesystem │  (TheBrain on disk)
                  └────────────┘
```

This is the diagram from [`docs/architecture.md`](../docs/architecture.md) with
two additions made explicit: a thin **interfaces layer above** the public core
API, and the **StateJournal** + **Extension API** components beside the existing
discovery/safety layer.

## Dependency direction (strict)

- Surfaces depend on **the core only**, never on adapters or the filesystem.
- The core depends on **adapters**; adapters depend on **the filesystem**.
- Nothing in the core depends on a surface. A surface can be deleted with zero
  changes to the core.
- The Extension API is the **one** sanctioned way to add adapters/validators/
  mutators, and its extensions still run **inside** StateGuard.

## Candidate repository layout

Monorepo, one core package plus one package per surface. Names follow
[01-naming.md](01-naming.md) and are placeholders.

```text
the-brain-actuator/
├── docs/                       # existing design docs (unchanged)
├── scaffold-proposals/         # this decision package
└── (proposed, not yet created)
    ├── core/                   # StateLink Core  (the coupler + SDK)
    │   ├── discovery/          # locate + detect format/version
    │   ├── model/              # normalized model (data-model.md)
    │   ├── adapters/           # sqlite/ · brainzip/ · xml/  (+ extension hook)
    │   ├── read/               # read services
    │   ├── write/              # guarded write services (allow-list)
    │   ├── guard/              # StateGuard: lock/backup/validate/fail-closed
    │   ├── journal/            # StateJournal: op log · diff · rollback basis
    │   └── extension/          # Extension API surface for plugins
    ├── surfaces/
    │   ├── cli/                # statelinkctl
    │   ├── mcp/                # StateLink MCP Server
    │   ├── rest/               # StateLink REST Gateway
    │   ├── console/            # StateLink Console (web UI)
    │   ├── tui/                # StateLink TUI            (later)
    │   ├── live-bus/           # WebSocket streaming      (later)
    │   ├── rpc/                # gRPC bridge              (later)
    │   ├── graphql/            # StateGraph Interface     (later)
    │   ├── virtualfs/          # FUSE mount               (later)
    │   ├── version-layer/      # git-like surface over StateJournal (later)
    │   └── query/              # StateQuery Engine        (later)
    └── fixtures/               # captured real-brain fixtures for tests
```

> Only `core/`, `surfaces/cli`, and `surfaces/mcp` would exist in a first
> delivery if the launch set from [03](03-interfaces.md) is adopted; the rest are
> placeholders showing where future surfaces slot in.

## Build/test posture (proposed)

- **Core is testable in isolation** against `fixtures/` (no surface needed).
- **Surfaces are tested as translation layers**, ideally against a mocked/in-
  memory core, plus a thin integration test per surface against the real core.
- **One CI matrix dimension per supported TheBrain format/version** for the core;
  surfaces do not multiply that matrix because they hold no storage logic.

## Cross-cutting concerns (carried from docs/architecture.md)

- **Determinism & idempotency** for writes.
- **Observability**: a discovery report and an operation log (StateJournal) per
  run, available to every surface.
- **Capability negotiation** before attempting operations.
- **No network in the core**; network lives only in surfaces.

## Open questions & answers

Answer in place per the
[README convention](README.md#how-to-answer-these-decisions-are-a-conversation).

> **Q (D4a):** Do we accept the monorepo `core/` + `surfaces/*` layout (one package
> per surface, strict one-way dependencies)?
>
> **Recommendation:** Yes.
>
> **Answer:** _(unanswered)_
>
> **Discussion:**
> - _(add dated notes, alternatives, and objections as the conversation evolves)_
>
> **Decided:** _date · owner · outcome — TBD_

> **Q (D4b):** Do we accept the build/test posture (core tested against fixtures;
> surfaces tested as thin translators)?
>
> **Recommendation:** Yes.
>
> **Answer:** _(unanswered)_
>
> **Discussion:**
> - _(add dated notes, alternatives, and objections as the conversation evolves)_
>
> **Decided:** _date · owner · outcome — TBD_
