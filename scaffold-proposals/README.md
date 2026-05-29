# Scaffold Proposals

This folder contains a **decision package**: a detailed proposal for how to
scaffold The Brain Activator as a separation between a single **core mechanism**
(the thing that actually couples to TheBrain's on-disk files) and a family of
**interfaces / control surfaces** (MCP, REST, CLI, SDK, Web UI, and more) layered
on top of it.

> **Status:** proposal, not a decision. Nothing here is built. These documents
> exist so the team can read, debate, and choose. Naming, scope, and surface
> selection are all explicitly open questions (see
> [07-decisions.md](07-decisions.md)).

## The one-sentence pitch

> Build **one well-guarded core coupler** that attaches to a file-backed
> application substrate (TheBrain's on-disk brain) and exposes controlled
> read/write access; then expose that single core through **many independent
> interfaces** (MCP, REST, CLI, SDK, live events, …) without duplicating the
> risky storage logic in each.

This is the "tentacles into the mechanism" idea: the **coupler / implant** is the
part that reaches into the substrate; the MCP server, REST gateway, CLI, etc.
are just **control surfaces** on the same core.

## How this relates to the existing repo

The Brain Activator already documents a layered design in
[`docs/architecture.md`](../docs/architecture.md): a stable **Public API** over
**read/write services**, a **normalized model**, **storage adapters**, and a
**discovery + safety layer**. This proposal does not replace that — it **extends
it outward**:

```
existing docs/architecture.md          this proposal (scaffold-proposals/)
──────────────────────────────         ──────────────────────────────────
Public API                       ⇄     Core coupler (one in-process API)
Read/Write services                     Interfaces wrap the core coupler:
Normalized model                          MCP · REST · CLI · SDK · Web · …
Storage adapters                        Cross-cutting: safety + versioning
Discovery + Safety layer
Filesystem
```

In other words: the documents in `docs/` describe **what the library does**; the
documents here describe **how that library is packaged and surfaced** to humans,
agents, and other software.

## Contents

| Document | Purpose |
| --- | --- |
| [00-concept.md](00-concept.md) | The core idea: separate the core mechanism from the interfaces, and why |
| [01-naming.md](01-naming.md) | Naming options for the core and each interface, with recommendations |
| [02-core-coupler.md](02-core-coupler.md) | Detailed design of the single core coupler everything else builds on |
| [03-interfaces.md](03-interfaces.md) | Full catalog of candidate interfaces, what each does, and priority |
| [04-architecture.md](04-architecture.md) | Proposed end-to-end layering and module/package layout |
| [05-mcp-server.md](05-mcp-server.md) | Deep dive on the MCP server surface (the flagship agent interface) |
| [06-safety-and-versioning.md](06-safety-and-versioning.md) | The safety/policy layer and the audit/version layer, shared by all surfaces |
| [07-decisions.md](07-decisions.md) | The explicit decisions to be made, with options and a recommendation each |

Suggested reading order: **00 → 01 → 02 → 03 → 04 → 05 → 06 → 07**. If you only
have five minutes, read [00-concept.md](00-concept.md) and the decision table in
[07-decisions.md](07-decisions.md).

## How to use this package to decide

1. **Agree on the concept** (00). Do we accept "one core, many surfaces"? If not,
   stop here — the rest is moot.
2. **Pick names** (01). Naming is cheap to change now and expensive later; lock a
   working name for the core and for the first surface.
3. **Confirm the core contract** (02). The core's capability model is the
   contract every surface depends on.
4. **Choose the launch surfaces** (03). Decide which interfaces are in the first
   delivery and which are "later / never".
5. **Approve the layering** (04) and the **MCP plan** (05) if MCP is in scope.
6. **Ratify the shared safety/versioning posture** (06).
7. **Resolve the open decisions** (07) and record the outcome.

## Guiding constraints carried over from the project

These are non-negotiable inheritances from the existing project docs and apply to
every proposal here:

- **Read-only by default.** Writes are a separate, explicit opt-in.
- **Fail closed.** Unknown format/version, locks, or ambiguity ⇒ refuse to write.
- **Never fight the app.** No writes while TheBrain holds the files.
- **No network in the core.** Cloud sync stays TheBrain's responsibility; any
  network-facing behavior lives in an interface, never in the coupler.
- **Discover, don't assume.** On-disk schema is owned by TheBrain and must be
  verified (see [`docs/discovery.md`](../docs/discovery.md)).
