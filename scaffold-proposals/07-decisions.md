# 07 — Decisions to resolve

This is the worksheet — the **single at-a-glance status table** for the whole
package. Each decision below is referenced from an earlier document and has options
plus a recommendation. The intent is to read the package, discuss each question
where it lives (every document now has an **Open questions & answers** section per
the [README convention](README.md#how-to-answer-these-decisions-are-a-conversation)),
then mirror the result here so the status is visible in one place.

Decisions are expected to settle **over time, not in one sitting** — leave the
`Outcome` as `_TBD_` until there is genuine agreement, and capture the back-and-forth
in the **per-decision discussion log** below the table.

## Decision table

| ID | Decision | Options | Recommendation | Outcome (date · owner) |
| --- | --- | --- | --- | --- |
| **D0** | Adopt "one core coupler, many interfaces"? | yes / no | **Yes** | _TBD_ |
| **D1a** | Name of the core mechanism | StateLink Core / Activator Core / State Coupler / Cortex | **StateLink Core** (fallback: Activator Core) | _TBD_ |
| **D1b** | Name of the MCP surface | StateLink MCP Server / Filesystem Cortex MCP / … | **StateLink MCP Server** | _TBD_ |
| **D1c** | Adopt `<Core> <Surface>` + executable naming scheme | yes / no | **Yes** | _TBD_ |
| **D2a** | Accept the capability model as the single contract | yes / no | **Yes** | _TBD_ |
| **D2b** | Accept the shared lifecycle + error/refusal taxonomy | yes / no | **Yes** | _TBD_ |
| **D2c** | Concurrency baseline = one writer, many readers | yes / no | **Yes** | _TBD_ |
| **D3** | Launch set of interfaces | see [03](03-interfaces.md) | **SDK + CLI + MCP** launch; REST + Console soon; rest later | _TBD_ |
| **D4a** | Monorepo `core/` + `surfaces/*`, strict one-way deps | yes / no | **Yes** | _TBD_ |
| **D4b** | Build/test posture (core vs. fixtures; surfaces as translators) | yes / no | **Yes** | _TBD_ |
| **D5a** | MCP server in launch set | yes / no | **Yes** | _TBD_ |
| **D5b** | MCP read-only by default; write tools opt-in only | yes / no | **Yes** | _TBD_ |
| **D5c** | MCP stdio-only first; defer remote/auth | yes / no | **Yes** | _TBD_ |
| **D6a** | StateGuard a mandatory, un-bypassable in-core gate | yes / no | **Yes** | _TBD_ |
| **D6b** | StateJournal a first-class core component from day one | yes / no | **Yes** | _TBD_ |
| **D6c** | Safety in core, authn/authz in surfaces | yes / no | **Yes** | _TBD_ |
| **D7** | Core runtime/language | see below | **Defer** until after discovery (Phase 1) | _TBD_ |

## Per-decision discussion log

Use this space to talk a decision through before it lands in the table above. Keep
each entry's running notes here; once `Decided`, copy the verdict into the `Outcome`
column and (where the source document has its own block) into that document too.

> **D0 — adopt the concept?** Answer: _(unanswered)_ · Notes: _(add dated points)_
>
> **D1a — core name?** Answer: _(unanswered)_ · Candidates & rationale: _(use the
> name workshop in [01-naming.md](01-naming.md))_
>
> **D1b — MCP surface name?** Answer: _(unanswered)_ · Notes: _(add dated points)_
>
> **D1c — naming convention?** Answer: _(unanswered)_ · Notes: _(add dated points)_
>
> **D2a/D2b/D2c — core contract?** Answer: _(unanswered)_ · Notes: _(add dated points)_
>
> **D3 — launch set?** Answer: _(unanswered)_ · Notes: _(use the per-interface table
> in [03-interfaces.md](03-interfaces.md))_
>
> **D4a/D4b — layout & test posture?** Answer: _(unanswered)_ · Notes: _(add dated points)_
>
> **D5a/D5b/D5c — MCP posture?** Answer: _(unanswered)_ · Notes: _(add dated points)_
>
> **D6a/D6b/D6c — safety & versioning?** Answer: _(unanswered)_ · Notes: _(add dated points)_
>
> **D7 — runtime/language?** Answer: _(unanswered)_ · Notes: _(record the discovery
> evidence that ends up favouring an ecosystem)_

## D7 — runtime/language (called out separately)

[`docs/architecture.md`](../docs/architecture.md) intentionally leaves runtime
unspecified at bootstrap. The scaffold inherits that. The only hard requirements
the choice must satisfy:

- a reliable **SQLite** driver,
- **ZIP/JSON** handling (for BrainZip/JSON exports),
- a usable **MCP server** library or the ability to implement MCP cleanly,
- good fit for the **launch surfaces** (CLI + an embeddable SDK).

**Recommendation:** defer the runtime decision until the discovery bootstrap
([`docs/discovery.md`](../docs/discovery.md), roadmap Phase 1) confirms the real
on-disk formats, since that evidence may favor one ecosystem. Do **not** let this
decision block agreeing on the concept, naming, contract, and launch set.

## How this maps onto the existing roadmap

This scaffold slots into [`docs/roadmap.md`](../docs/roadmap.md) without changing
its safety-first ordering:

- **Phase 0 (now):** agree this decision package (D0–D6); leave D7 open.
- **Phase 1 (discovery):** the CLI (`statelinkctl`) is the natural driver for the
  discovery bootstrap workflow; resolve D7 with real evidence.
- **Phase 2 (read-only):** ship the SDK + CLI read paths and the **read-only**
  MCP server (resources + read tools).
- **Phase 3 (projections):** REST Gateway + Console become valuable here.
- **Phase 4 (safe writes):** StateGuard write pipeline goes live; MCP/CLI/REST
  write tools are enabled behind opt-in; StateJournal records every write.
- **Phase 5 (hardening):** later surfaces (Version Layer, GraphQL, FUSE, Live
  Bus, gRPC, query) built on demand.

## What "approved" looks like

When this package is accepted, the next concrete artifacts are:

1. A short ADR (architecture decision record) capturing the filled-in table.
2. Renaming/placeholder creation of `core/` and the launch `surfaces/*` packages
   per [04-architecture.md](04-architecture.md) — **only when implementation
   actually begins**, consistent with the repo's current docs-only status.

Nothing in this folder should be built until D0–D6 are resolved and recorded.
