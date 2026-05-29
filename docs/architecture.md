# Architecture

A proposed layering for the library. The aim is to isolate the risky,
version-specific storage details behind stable interfaces so that most code (and
all callers) work against the normalized model.

```
            ┌─────────────────────────────────────────────┐
 callers →  │                 Public API                   │   stable, version-independent
            │  open() · discover() · read*() · (opt) write* │
            └───────────────┬───────────────┬──────────────┘
                            │               │
                ┌───────────▼──────┐  ┌──────▼───────────────┐
                │   Read services  │  │   Write services     │   opt-in, guarded
                │ (graph/entities) │  │ (allow-listed muts)  │
                └───────────┬──────┘  └──────┬───────────────┘
                            │                │
                ┌───────────▼────────────────▼───────────────┐
                │              Normalized model               │   thoughts/links/...
                │            (see data-model.md)              │
                └───────────────────────┬─────────────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │       Storage adapters        │   one per format/version
                         │  SQLite · BrainZip/JSON · XML  │
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │   Discovery + Safety layer    │   detect, lock-check, backup
                         └──────────────┬───────────────┘
                                        │
                                 ┌──────▼──────┐
                                 │  Filesystem │
                                 └─────────────┘
```

## Components

### Public API
The only surface callers use. Read methods are always available; write methods
require an explicit opt-in. Everything is expressed in terms of the normalized
model.

### Discovery + Safety layer
Locates brains, detects format/version, checks locks/running app, produces the
discovery report, and creates/verifies backups. Gatekeeper for all writes
(see [discovery.md](discovery.md) and [modifying.md](modifying.md)).

### Storage adapters
One adapter per recognized on-disk format/version (SQLite working dir,
BrainZip/JSON export, legacy XML). Each adapter maps raw storage to/from the
normalized model and declares its capabilities (e.g. read-only, or which
mutations it supports). Unknown formats yield a read-only or no-op adapter that
**fails closed**.

### Normalized model
The shared vocabulary from [data-model.md](data-model.md). Adapters and services
both speak it; callers only ever see it.

### Read services
Entity lookup, graph traversal, streaming, note/attachment resolution. Always
non-destructive.

### Write services
The narrow, allow-listed mutations from [modifying.md](modifying.md), each
wrapped in precondition checks, backup, transaction/round-trip, and post-write
validation.

## Cross-cutting concerns

- **Determinism & idempotency** for writes.
- **Observability**: a discovery report and an operation log for every run.
- **Capability negotiation**: callers can ask an adapter what it supports before
  attempting an operation, so unsupported writes fail early and clearly.
- **No network**: this library only touches local files; cloud sync remains
  TheBrain's responsibility.

## Implementation notes

- Language/runtime is intentionally unspecified at the bootstrap stage; the
  architecture maps cleanly onto any ecosystem with a SQLite driver and ZIP/JSON
  support.
- Keep adapters small and well-tested against fixtures captured during the
  discovery bootstrap workflow.
