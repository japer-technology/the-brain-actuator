# Overview

## The idea in one paragraph

TheBrain is a mature desktop application for building large, densely linked
knowledge graphs. Its authoring experience — fluid linking, typing, tagging,
notes, attachments — is its core strength. **The Brain Activator** treats that
application as an *authoring front-end* and provides a local, programmatic data
plane on top of the files TheBrain stores on disk. You build complex structures
in TheBrain's UX; your own software reads (and, carefully, writes) that data
locally through this library. TheBrain effectively becomes a refresh/sync client
to the cloud, while the structured data it produces becomes reusable in your own
applications.

## Core concepts

TheBrain's model is a typed, directed graph. The Activator normalizes it into a
small, stable vocabulary regardless of the underlying storage version:

- **Brain** — a single knowledge base. On disk it is a self-contained folder
  (see [discovery.md](discovery.md)). A machine may hold many brains.
- **Thought** — a node in the graph. Has an identity (GUID), a label, timestamps,
  and optional type, tags, notes, and attachments.
- **Link** — a directed, typed relationship between two thoughts (e.g.
  parent → child, jump, sibling).
- **Type** — a classification applied to thoughts or links (e.g. a "Person"
  thought type, an "owns" link type).
- **Tag** — a lightweight label that can be attached to many thoughts.
- **Note** — long-form rich text/markdown content attached to a thought.
- **Attachment** — a file (or external URL) associated with a thought, stored in
  the brain's attachment storage and referenced by identity.

All cross-references between these entities are by **GUID**, never by
human-readable label. Reconstructing the graph means joining thoughts and links
on their GUIDs.

## Design principles

1. **Read-only by default.** Mutations require an explicit, separate opt-in.
2. **Version-independent model.** Callers program against the normalized model
   in [data-model.md](data-model.md); storage-format adapters hide the on-disk
   details and version differences.
3. **Discover, don't assume.** The exact on-disk schema is owned by TheBrain and
   may differ between versions. The library probes and reports the format rather
   than hard-coding a single layout (see [discovery.md](discovery.md)).
4. **Fail closed.** When something is ambiguous, locked, or unrecognized, the
   library refuses to write and surfaces a clear error.
5. **Never fight the app.** Writes only happen when TheBrain is not actively
   using the files.

## Glossary

| Term | Meaning |
| --- | --- |
| Brain | A single TheBrain knowledge base / database |
| Thought | A node in the brain graph |
| Link | A directed relationship between two thoughts |
| Type | A classification for thoughts or links |
| Tag | A lightweight multi-thought label |
| Note | Rich-text/markdown body attached to a thought |
| Attachment | File or URL associated with a thought |
| GUID | Globally unique identifier used to reference every entity |
| Adapter | Component that maps a specific on-disk format/version to the normalized model |
