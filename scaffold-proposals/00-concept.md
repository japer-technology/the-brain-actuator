# 00 — Concept: one core mechanism, many interfaces

## The problem this scaffold solves

The Brain Activator must serve very different consumers:

- **AI agents and tools** that want to read/mutate a brain through a defined,
  machine-negotiable contract.
- **Developers and admins** who want direct command-line control.
- **Applications, dashboards, and scripts** that want a conventional HTTP API.
- **Humans** who want to browse, diff, edit, and validate in a UI.
- **Other internal systems** that want a typed, high-performance call path.

If each of those consumers is built as its own program that talks to TheBrain's
files directly, the **risky part** — discovery, format/version detection,
locking, backup, transactional writes, validation — gets **re-implemented (and
re-bugged) in every one of them**. That is exactly the kind of duplication that
corrupts data.

## The proposed shape

Split the system in two cleanly:

> **Core mechanism** — the single component that actually reaches into the
> file-backed substrate. The *coupler*. It owns all storage knowledge, all
> safety guarantees, and the normalized model.

> **Interfaces** — thin *control surfaces* that translate an external protocol
> (MCP, HTTP, CLI args, function calls, …) into core operations and translate
> results back. They own no storage knowledge.

```
                         ┌──────────────────────────────────────────┐
   agents ───── MCP ─────►                                          │
   apps   ───── REST ────►            Interfaces                    │
   humans ───── Web/TUI ─►   (thin adapters, no storage logic)      │
   devs   ───── CLI ─────►                                          │
   code   ───── SDK/RPC ─►                                          │
                         └───────────────────┬──────────────────────┘
                                             │ one in-process contract
                         ┌───────────────────▼──────────────────────┐
                         │              Core coupler                 │
                         │  discovery · adapters · normalized model  │
                         │  read services · guarded write services   │
                         │  safety (locks/backup/validate) · journal │
                         └───────────────────┬──────────────────────┘
                                             │
                                      TheBrain on disk
```

## Why this is the right split

- **Safety is written once.** The three rules from
  [`docs/modifying.md`](../docs/modifying.md) (back up, never fight the app,
  validate + fail closed) live in exactly one place. Every surface inherits them
  for free and cannot bypass them.
- **Surfaces become cheap and disposable.** Adding a new interface is "translate
  protocol X to the core contract," not "re-learn TheBrain's storage." A surface
  can be dropped without touching the core.
- **One capability model.** Whether you arrive via MCP or CLI, "create link" has
  the same preconditions, the same allow-list, the same audit trail.
- **Testability.** The dangerous logic is tested against fixtures once; surfaces
  are tested as thin translation layers, ideally against a mocked core.
- **Independent evolution.** TheBrain changes its on-disk format ⇒ you fix one
  adapter in the core. A protocol changes (e.g. a new MCP spec revision) ⇒ you
  fix one surface.

## What "core" must NOT do

To keep the split honest, the core deliberately excludes:

- **No transport / no network.** No HTTP server, no sockets, no auth tokens. That
  is a surface's job. (Preserves the project's "no network" rule.)
- **No protocol-specific shapes.** The core speaks the normalized model from
  [`docs/data-model.md`](../docs/data-model.md); it does not emit JSON-RPC
  envelopes, REST DTOs, or GraphQL types. Surfaces map to those.
- **No human formatting.** Tables, colors, TUI widgets, diff rendering — surfaces.

## What every interface MUST do

- Express all behavior in terms of the **core's capability contract** (see
  [02-core-coupler.md](02-core-coupler.md)).
- Carry **read vs. write intent** explicitly to the core; never silently
  escalate a read surface into a writer.
- Surface the core's **errors and refusals faithfully** (a "fail closed" in the
  core must look like a clear failure at the surface, never a swallowed success).
- Be **optional**: building it must not be required to use any other surface.

## Anti-goals / things this concept is not

- It is **not** a microservice mandate. The core is a library; surfaces may be
  in-process (SDK, CLI) or out-of-process (a long-running REST/MCP server) — the
  contract is the same either way.
- It is **not** an excuse to widen write scope. The allow-list in
  [`docs/modifying.md`](../docs/modifying.md) still governs *all* surfaces.
- It is **not** a rewrite of `docs/`. It is a packaging/surfacing layer above the
  already-documented library design.

## Open questions & answers

Answer in place using the convention in the [README](README.md#how-to-answer-these-decisions-are-a-conversation).
If **D0** lands on **yes**, proceed to naming ([01](01-naming.md)) and the core
contract ([02](02-core-coupler.md)); if **no**, the remaining documents do not apply.

> **Q (D0):** Do we adopt the "one core coupler, many interfaces" separation as the
> scaffolding principle for the project?
>
> **Recommendation:** Yes.
>
> **Answer:** _(unanswered)_
>
> **Discussion:**
> - _(add dated notes, alternatives, and objections as the conversation evolves)_
>
> **Decided:** _date · owner · outcome — TBD_
