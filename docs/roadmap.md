# Roadmap

A phased plan that front-loads safety and verification. Each phase produces
something usable and de-risks the next.

## Phase 0 — Bootstrap (this repository)
- Documentation only: vision, concepts, data model, discovery, reading,
  modifying, architecture (done).
- Outcome: a shared contract to build against.

## Phase 1 — Discovery & format verification
- Implement brain location and format/version detection.
- Run the [discovery bootstrap workflow](discovery.md#recommended-bootstrap-workflow)
  against a real, throwaway brain.
- Replace the hypothesized paths/schema/fields in
  [discovery.md](discovery.md) and [data-model.md](data-model.md) with verified
  facts; capture fixtures.
- Outcome: a trustworthy discovery report and confirmed data model.

## Phase 2 — Read-only access
- Implement the BrainZip/JSON adapter first (safest), then the SQLite adapter.
- Expose the normalized read API and graph traversal.
- Outcome: applications can consume brain data locally with zero write risk.

## Phase 3 — Local projections
- Helpers to project the normalized model into common local targets (in-memory
  graph, a user database, a search index).
- A repeatable "refresh from TheBrain" pipeline (export/copy → discover → read →
  project).
- Outcome: TheBrain's UX is now an authoring front-end for local data.

## Phase 4 — Safe writes (narrow)
- Implement the safety layer: lock/running-app detection, backup + verify,
  pre/post validation, fail-closed.
- Implement allow-listed mutations in order of risk (note → tag → rename →
  create thought → create link), preferring import round-trips where possible.
- Outcome: limited, guarded write-back without endangering brains or sync.

## Phase 5 — Hardening
- Broaden version coverage via additional adapters.
- Expand the test matrix across TheBrain versions and platforms.
- Document sync interaction precisely; only then consider higher-risk mutations.
- Outcome: dependable, multi-version support.

## Guiding constraints (all phases)
- Read-only by default; writes are opt-in and allow-listed.
- Never proceed against an unrecognized format/version (fail closed).
- Never edit cloud sync state by hand.
- Verify against real brains before claiming support.
