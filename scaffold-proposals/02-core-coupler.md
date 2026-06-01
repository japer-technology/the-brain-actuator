# 02 — The core coupler

This is the heart of the scaffold. The core coupler is the **only** component
that touches TheBrain's files, and the **single contract** every interface in
[03-interfaces.md](03-interfaces.md) depends on. Getting this contract right is
the most important decision in the package, because changing it later ripples
through every surface.

> Throughout this document "the core" / "the coupler" refers to whatever name is
> chosen in [01-naming.md](01-naming.md) (recommended: *TheLocalBrain Core*).

## Responsibilities

The core owns, end to end:

1. **Discovery** — locate brains, detect on-disk format/version with confidence
   (see [`docs/discovery.md`](../docs/discovery.md)).
2. **Adaptation** — map a recognized format/version to/from the normalized model
   via a storage adapter (see [`docs/architecture.md`](../docs/architecture.md)).
3. **The normalized model** — thoughts, links, types, tags, notes, attachments
   (see [`docs/data-model.md`](../docs/data-model.md)). This is the vocabulary the
   contract speaks.
4. **Read services** — entity lookup, graph traversal, streaming, note/attachment
   resolution. Always non-destructive.
5. **Guarded write services** — the allow-listed mutations from
   [`docs/modifying.md`](../docs/modifying.md), each wrapped in preconditions,
   backup, transaction/round-trip, and post-write validation.
6. **Safety (TheLocalBrainGuard)** — lock/running-app detection, backup + verify,
   pre/post validation, fail-closed enforcement.
7. **Journaling (TheLocalBrainJournal)** — an operation log and the basis for diffs and
   rollback.

The core explicitly **excludes** transport, network, auth, and human formatting
(see [00-concept.md](00-concept.md)).

## The capability model (the contract)

Every interface negotiates with the core through a small, explicit capability
model rather than calling storage directly. Conceptually the core exposes:

- **A handle to an opened brain**, obtained from discovery, carrying:
  - the detected **format + version** and a **confidence** level,
  - a **mode**: `read-only` or `read-write` (write requires explicit opt-in),
  - the **declared capabilities** of the active adapter (what it can read, and
    which mutations — if any — it supports).
- **Read operations** keyed on the normalized model.
- **Write operations**, each one:
  - on the **allow-list** ([`docs/modifying.md`](../docs/modifying.md)),
  - gated by **preconditions** (format/version recognized, app not running, no
    locks, backup verified, caller opted in),
  - **idempotent where possible**, and **journaled**.

> **Capability negotiation is mandatory.** A surface must be able to ask "can
> this brain do operation X right now?" and get a clear yes/no *before*
> attempting it, so unsupported or unsafe operations fail early and legibly.
> Unknown formats yield a **read-only / no-op** capability set that **fails
> closed**.

## Operation lifecycle (shared by all surfaces)

Every core operation, regardless of which surface invoked it, runs the same
pipeline:

```
request ─► resolve brain handle ─► check capability + mode
        ─► [writes only] preconditions: lock-check · backup · verify
        ─► execute (read service | transactional/round-trip write)
        ─► [writes only] post-write validation
        ─► journal the outcome ─► return normalized result | clear refusal
```

A failure at any guarded step **aborts without partial state** and, for writes,
**restores from backup** (the failure-handling rule from
[`docs/modifying.md`](../docs/modifying.md)).

## Concurrency & sessions

Because multiple surfaces (or multiple agents on one surface) may be active at
once, the core must define:

- **One writer at a time per brain.** Writes assume exclusive access; the core
  serializes them and refuses concurrent writers (fail closed).
- **Many concurrent readers** are fine while no write is in progress.
- **Session/handle identity** so journaling and audit can attribute each
  operation to a caller, and so a surface can hold a read snapshot consistently.

These are proposals; the exact concurrency contract is an open decision (see
[07-decisions.md](07-decisions.md)).

## Error & refusal taxonomy

Surfaces need a stable, mappable set of outcomes. Proposed categories:

| Category | Meaning | Typical surface mapping |
| --- | --- | --- |
| `ok` | Operation succeeded | 200 / success result |
| `unrecognized-format` | Discovery could not confidently identify format/version | 422 / "cannot operate" |
| `read-only` | Operation needs write mode but brain/adapter is read-only | 403 / refusal |
| `locked` / `app-running` | Brain is in use; writes refused | 409 / conflict |
| `not-allowed` | Mutation is not on the allow-list | 403 / refusal |
| `precondition-failed` | Backup/validation precondition not met | 409 / conflict |
| `validation-failed` | Post-write validation failed; restored from backup | 500 / failed-and-rolled-back |
| `not-found` | Entity GUID does not resolve | 404 |
| `invalid-argument` | Malformed request | 400 |

A clean taxonomy here is what lets every surface translate core results
**faithfully** without inventing its own semantics.

## Packaging of the core

- The core is a **library/package** first (this *is* the SDK — see
  [03-interfaces.md](03-interfaces.md)). Out-of-process surfaces (REST, MCP)
  embed it; in-process surfaces (SDK, CLI) call it directly.
- **Language/runtime is intentionally unspecified** at the scaffold stage, as in
  [`docs/architecture.md`](../docs/architecture.md). The contract above maps onto
  any ecosystem with a SQLite driver and ZIP/JSON support. The runtime choice is
  an open decision (see [07-decisions.md](07-decisions.md)).
- **Adapters are small and fixture-tested** against captures from the discovery
  bootstrap workflow.

## Open questions

The core-contract decisions (**D2a**, **D2b**, **D2c**) are answered in
[QUESTIONS.md](QUESTIONS.md).
