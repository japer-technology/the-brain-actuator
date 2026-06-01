# The Brain Activator

A library to **safely discover, read, and (where safe) modify** the on-disk file
and folder structure of [TheBrain](https://www.thebrain.com).

> **Status:** early implementation (v1, **read-only**). The documents below
> describe the intended design; the `core/` and `surfaces/` packages implement
> the read-only vertical slice (discover → read a `.brz`/SQLite brain → expose it
> over a CLI and an MCP server). Any concrete schema details here remain
> **starting hypotheses that must be verified against a real TheBrain
> installation** before code relies on them (see
> [docs/discovery.md](docs/discovery.md)). The bundled test fixtures are
> **synthetic** (built to those hypotheses), not captures from a real brain —
> see [fixtures/README.md](fixtures/README.md).

## Why this exists

TheBrain has an excellent UX for authoring richly interconnected,
deeply-nested knowledge graphs (thoughts, links, types, tags, notes and
attachments). That authoring experience is hard to replicate.

This project flips the relationship around:

- **TheBrain is the authoring front-end.** You use its UX to build arbitrarily
  complex data structures.
- **The Brain Activator is the local data plane.** It lets your own
  applications discover and consume that data directly from the files TheBrain
  writes to disk, and — where it is provably safe — write back into them.

The net effect is that TheBrain's desktop app becomes, for your purposes, little
more than a sync/refresh client to the cloud, while the *value* (the structured
data) is something you can read and reuse locally with a stable, documented API.

## Goals

1. **Discover** brains on a machine and identify their on-disk format/version.
2. **Read** the full semantic graph (thoughts, links, types, tags, notes,
   attachments) into a stable, version-independent model.
3. **Modify safely** — a deliberately small, well-guarded set of mutations,
   always behind backups and validation, never fighting the app for a lock.
4. **Stay non-destructive by default** — read-only unless the caller explicitly
   opts in to writes.

## Non-goals

- Reimplementing TheBrain's UI or sync protocol.
- Talking to TheBrain's cloud API (this project is about *local* files).
- Guaranteeing forward compatibility with every future TheBrain release; the
  format is owned by TheBrain and may change without notice.

## Documentation

| Document | Purpose |
| --- | --- |
| [docs/overview.md](docs/overview.md) | Vision, core concepts, and glossary |
| [docs/discovery.md](docs/discovery.md) | How to locate brains and reverse-discover their format |
| [docs/data-model.md](docs/data-model.md) | The normalized model: thoughts, links, types, tags, notes, attachments |
| [docs/reading.md](docs/reading.md) | Safe read-only access patterns |
| [docs/modifying.md](docs/modifying.md) | Rules and guardrails for safe modification |
| [docs/architecture.md](docs/architecture.md) | Proposed library layering and components |
| [docs/roadmap.md](docs/roadmap.md) | Phased delivery plan |

## Implementation (v1, read-only)

A TypeScript/Node monorepo implements the read-only slice of the design above.
It follows the "one core coupler, many thin surfaces" layout from
[scaffold-proposals/](scaffold-proposals/):

```text
core/                 # @thelocalbrain/core — the single coupler (this is the SDK)
  discovery/          # locate · detect format/version (confidence) · schema probe · report
  model/              # normalized model (data-model.md) + graph view
  adapters/           # read-only BrainZip/JSON + SQLite adapters
  read/               # read services (lookup · context · traversal · streaming)
  guard/              # TheLocalBrainGuard — mandatory fail-closed safety gate
  journal/            # TheLocalBrainJournal — operation log
surfaces/cli/         # thelocalbrainctl — command-line surface
surfaces/mcp/         # TheLocalBrain MCP Server — read-only, stdio
fixtures/             # SYNTHETIC sample brains (not real captures)
```

What is and isn't here, per the [roadmap](docs/roadmap.md):

- **Read-only by default.** Brains open read-only; `read-write` mode is refused.
  No write tools are registered on the MCP server. Writes (Phase 5) are not
  implemented; the guard fails closed on every write path.
- **Fail closed.** Unrecognized formats yield confidence 0 and refuse to open.
- The live-brain discovery bootstrap (roadmap Phase 1) still needs to run against
  a real installation to replace the hypotheses in `docs/` with verified facts.

### Build, test, and try it

```sh
npm install
npm run build
npm test            # core + surfaces, tested against fixtures (no real brain needed)

# Inspect a brain (a .brz file, an unpacked export dir, or a SQLite brain folder):
node surfaces/cli/dist/bin.js discover fixtures/sample.brz
node surfaces/cli/dist/bin.js thought  fixtures/sample.brz 33333333-3333-3333-3333-333333333333

# Run the read-only MCP server over stdio:
node surfaces/mcp/dist/server.js fixtures/sample.brz
```

## Safety first

Modifying another application's private data files is inherently risky. Every
write path in this library is designed around three rules, described in detail
in [docs/modifying.md](docs/modifying.md):

1. **Back up before you touch anything.**
2. **Never write while TheBrain holds the files** (respect locks / closed-app).
3. **Validate before and after** every change, and fail closed.

See: <https://www.thebrain.com>
