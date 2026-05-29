# The Brain Activator

A library to **safely discover, read, and (where safe) modify** the on-disk file
and folder structure of [TheBrain](https://www.thebrain.com).

> **Status:** bootstrap. This repository currently contains documentation only.
> The documents below describe the intended design so that implementation can
> proceed against a shared, agreed-upon contract. Any concrete schema details
> here are **starting hypotheses that must be verified against a real TheBrain
> installation** before code relies on them (see
> [docs/discovery.md](docs/discovery.md)).

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

## Safety first

Modifying another application's private data files is inherently risky. Every
write path in this library is designed around three rules, described in detail
in [docs/modifying.md](docs/modifying.md):

1. **Back up before you touch anything.**
2. **Never write while TheBrain holds the files** (respect locks / closed-app).
3. **Validate before and after** every change, and fail closed.

See: <https://www.thebrain.com>
