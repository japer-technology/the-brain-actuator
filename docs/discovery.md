# Discovery

Before reading or writing anything, the library must (a) find brains on the
machine and (b) identify the exact on-disk format it is dealing with. The
on-disk format is owned by TheBrain and varies across versions, so **discovery
is an explicit, first-class step** rather than an assumption baked into code.

> ⚠️ **All concrete paths, file names, and schema shapes in this document are
> hypotheses to verify against a real installation.** Treat them as a checklist
> of things to confirm, not as guaranteed facts. The recommended approach is to
> point the discovery probe at a real brain, record what it actually finds, and
> commit the verified findings back into this document.

## Step 1 — Locate candidate brain directories

Typical default locations to probe (verify per platform and version):

| Platform | Likely default location |
| --- | --- |
| Windows | `%USERPROFILE%\Documents\TheBrain\Brains` and `%LOCALAPPDATA%\TheBrain` |
| macOS | `~/Documents/TheBrain/Brains` and `~/Library/Application Support/TheBrain` |
| Linux | `~/TheBrain` / `~/.config/TheBrain` (verify) |

The library should also accept an explicit path so callers can point it at a
brain in any location (synced folders, external drives, backups, etc.).

A brain directory is recognized by the presence of a known marker (e.g. a
database file and/or a metadata/settings file). The recognizer should be
tolerant: it returns a confidence level and the detected format, not a yes/no.

## Step 2 — Identify the storage format and version

Observed TheBrain storage shapes that adapters should be prepared for (confirm
which apply to your installation):

- **SQLite-backed working directory.** The live brain folder contains a SQLite
  database (commonly cited names include `brain.db` / `ThinkDB.sqlite`) plus
  sibling folders for attachments, sync state, and settings. This is the format
  most relevant for *reading the live, current* brain.
- **XML-backed (legacy).** Older versions may persist a `brain.xml`-style file.
- **BrainZip export (`.brz`).** A ZIP archive of JSON documents
  (e.g. `thoughts.json`, `links.json`, plus types/tags/attachments and a
  metadata document). This is the most *stable and portable* representation and
  is a good first target for read-only consumption because exporting cannot
  corrupt the live brain.

The discovery step records: detected format, version hints, database engine and
schema version (if SQLite), file inventory, and whether the brain appears to be
in use (locks present, app running).

## Step 3 — Probe the schema (do not hard-code it)

For a SQLite brain, enumerate the actual schema instead of assuming it:

- List tables and views (`sqlite_master`).
- For each relevant table, record columns, types, primary keys, and foreign
  keys.
- Identify the tables that hold thoughts, links, types, tags, notes, and
  attachment references, and map their columns to the normalized model in
  [data-model.md](data-model.md).
- Capture the schema version / migration markers TheBrain uses so adapters can
  refuse unknown versions and **fail closed**.

For a `.brz`/JSON brain, enumerate the JSON documents present and the fields on a
sample of records, then map them to the normalized model.

## Step 4 — Emit a discovery report

Discovery should produce a machine-readable report that downstream components and
humans can rely on, including at minimum:

- brain location and detected format/version,
- entity counts (thoughts, links, types, tags, attachments),
- the schema/field mapping that was inferred,
- a `safeToWrite` assessment (format recognized, app not running, backup
  possible) — see [modifying.md](modifying.md),
- any unknowns or low-confidence findings.

This report is the contract that [reading.md](reading.md) and
[modifying.md](modifying.md) build on. **Reading and writing must refuse to
proceed against a format that discovery did not positively recognize.**

## Recommended bootstrap workflow

1. Create a small, throwaway brain in TheBrain's UX with a handful of thoughts,
   links, types, tags, a note, and an attachment.
2. Run discovery against both the live folder and a `.brz` export of it.
3. Record the verified file names, schema, and field mappings here and in
   [data-model.md](data-model.md), replacing the hypotheses.
4. Only then implement read access against the confirmed format.
