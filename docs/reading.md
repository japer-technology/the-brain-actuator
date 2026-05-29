# Reading

Reading is the primary, default capability and is **always non-destructive**.

## Preconditions

1. Discovery has positively recognized the brain's format
   (see [discovery.md](discovery.md)). If not, reading refuses to proceed.
2. The library opens storage **read-only**:
   - For SQLite, open in read-only mode and never take a write lock.
   - For `.brz`/JSON exports, read from the archive without modifying it.
   - Prefer operating on a **snapshot/copy** when the live app may be running,
     to avoid reading a half-written database.

## What reading returns

Callers receive the normalized model from [data-model.md](data-model.md):

- enumerate thoughts, links, types, tags, notes, attachments;
- look up a single entity by GUID;
- fetch a thought together with its links, type, tags, note, and attachments;
- traverse the graph (neighbors of a thought, by link kind/type);
- stream large brains rather than loading everything into memory at once.

## Consuming attachments and notes

- Notes may be stored inline or in separate files/blobs; the reader resolves
  them transparently and exposes the body plus its format.
- Attachments are exposed as a reference (name, kind, location) plus a way to
  open the underlying bytes read-only. The reader must not move or rewrite
  attachment files.

## Consistency considerations

- If TheBrain is running, the live database may change underneath a long read.
  Strategies, in order of preference:
  1. Read from a `.brz` export (most stable).
  2. Read from a copied snapshot of the brain folder.
  3. Read the live folder only when the app is closed.
- The reader should detect and surface (not hide) signs of an in-progress write
  or an unexpected schema version.

## Recommended consumption pattern

For most "use the data locally" use cases, the simplest robust pipeline is:

1. Export (or copy) the brain → stable snapshot.
2. Run discovery on the snapshot.
3. Read the normalized model from the snapshot.
4. Project it into whatever local representation your application needs
   (in-memory graph, your own database, search index, etc.).

This keeps the live brain untouched and makes "refresh from TheBrain" a matter
of re-running the pipeline.
