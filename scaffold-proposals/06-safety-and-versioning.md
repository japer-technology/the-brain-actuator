# 06 — Safety & versioning (shared cross-cutting layers)

Two cross-cutting components live **inside the core** and back every surface:
**StateGuard** (the policy/safety layer) and **StateJournal** (the audit / diff /
rollback layer). They are documented together because they are what make "one
core, many surfaces" *safe*: every interface inherits identical guarantees and
none can bypass them.

These build directly on [`docs/modifying.md`](../docs/modifying.md) — this
document is the *scaffolding* view of those rules, not a new policy.

## StateGuard — the policy/safety layer

StateGuard is the gatekeeper for **all** writes, from every surface. It
implements the three rules from [`docs/modifying.md`](../docs/modifying.md):

1. **Back up before you touch anything** — a verified, restorable backup of the
   whole brain folder, taken immediately before any write.
2. **Never write while TheBrain holds the files** — detect a running app, file
   locks, or active sync and refuse.
3. **Validate before and after, and fail closed** — verify format + invariants
   before; re-validate after; restore from backup and report on any failure.

### Responsibilities

- **Mode enforcement.** A handle is `read-only` unless the caller explicitly
  opted into writes; StateGuard refuses writes on read-only handles.
- **Precondition pipeline.** Format/version recognized with confidence → app not
  running / no locks / sync idle → backup created and verified → mutation is on
  the allow-list → caller opted in. Any failure aborts with no changes.
- **Allow-list ownership.** The set of permitted mutations (note → tag → rename →
  create thought → create link) is defined here, once, for all surfaces.
- **Invariant validation.** GUID uniqueness/well-formedness, referential
  integrity of all references, consistent timestamps, respect for
  soft-deletion/lifecycle flags, and any sync/version bookkeeping the format uses.
- **Concurrency.** One writer per brain (serialize and refuse concurrent
  writers); many concurrent readers when no write is in progress.
- **Fail-closed default.** Unrecognized format/version ⇒ treat as **read-only**.

### Why it must be in the core, not in surfaces

If StateGuard lived in a surface, a second surface could write without it. Putting
it in the core means a CLI write, a REST write, and an MCP agent write all pass
through the **same** checks. Surfaces may add *extra* restrictions (e.g. MCP
read-only-by-default) but can never relax StateGuard.

## StateJournal — the audit / diff / rollback layer

StateJournal records what was attempted and what changed, and provides the basis
for diffing and rollback. It is the foundation that the (later) **StateLink
Version Layer** surface ([03-interfaces.md](03-interfaces.md)) is built on.

### Responsibilities

- **Operation log.** For every operation (read-significant or write): timestamp,
  session/caller identity, target brain + entities, operation, outcome
  (including refusals and rollbacks).
- **Backup registry.** Track backups taken by StateGuard and link each write to
  the backup that protects it, enabling restore.
- **Diffs.** Before/after representations of allow-listed mutations in terms of
  the normalized model.
- **Rollback basis.** Enough information to restore a brain to a prior state via
  the backup registry (a single-app feature first; branching is a far-future
  Version-Layer concern).

### Relationship to surfaces

- The journal is **readable** through surfaces (e.g. an MCP resource, a REST
  endpoint, a CLI `log` command) so operators and agents can see exactly what
  happened.
- The **Version Layer** surface presents the journal as git-like
  diffs/commits/rollbacks; it is a *view* over StateJournal, not a second
  source of truth.

## Sync interaction (carried over, applies to all surfaces)

From [`docs/modifying.md`](../docs/modifying.md): until sync bookkeeping is fully
understood, StateGuard prefers to write only while sync is idle and the app is
closed, lets the app perform the next cloud sync after reopening, and **never
edits cloud sync state by hand**. If sync semantics are unknown for a
format/version, that format is **read-only** and StateGuard refuses writes —
regardless of which surface asked.

## Permissions & authorization (surface vs. core)

A clean division:

- **StateGuard** answers *"is this operation safe for the brain?"* (locks,
  backups, invariants, allow-list, sync). This is **in the core**.
- **Authentication/authorization** — *"is this caller allowed to ask?"* — is a
  **surface** concern (REST tokens, MCP transport auth, OS user for CLI). The
  core does not implement auth; it trusts the surface to have authenticated and
  to pass the read/write intent honestly.

## Open questions & answers

Answer in place per the
[README convention](README.md#how-to-answer-these-decisions-are-a-conversation).

> **Q (D6a):** Do we make StateGuard a mandatory in-core gate that **no** surface
> can bypass (surfaces may only add restrictions)?
>
> **Recommendation:** Yes.
>
> **Answer:** _(unanswered)_
>
> **Discussion:**
> - _(add dated notes, alternatives, and objections as the conversation evolves)_
>
> **Decided:** _date · owner · outcome — TBD_

> **Q (D6b):** Do we adopt StateJournal as a first-class core component from the
> start (vs. deferring audit/rollback)?
>
> **Recommendation:** Yes.
>
> **Answer:** _(unanswered)_
>
> **Discussion:**
> - _(add dated notes, alternatives, and objections as the conversation evolves)_
>
> **Decided:** _date · owner · outcome — TBD_

> **Q (D6c):** Do we confirm the split: safety/invariants in the core (StateGuard),
> authn/authz in the surfaces?
>
> **Recommendation:** Yes.
>
> **Answer:** _(unanswered)_
>
> **Discussion:**
> - _(add dated notes, alternatives, and objections as the conversation evolves)_
>
> **Decided:** _date · owner · outcome — TBD_
