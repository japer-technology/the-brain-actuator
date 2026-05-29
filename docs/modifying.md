# Modifying

Writing into TheBrain's private data files is the highest-risk capability in
this project. It is **off by default**, deliberately narrow, and wrapped in
guardrails. The guiding stance: it is always better to refuse a write than to
risk corrupting a brain.

## The three rules

1. **Back up before you touch anything.** No write happens without a verified,
   restorable backup of the entire brain folder taken immediately beforehand.
2. **Never write while TheBrain holds the files.** Detect a running app / file
   locks / active sync and refuse. Writes assume exclusive access.
3. **Validate before and after, and fail closed.** Verify the format and
   invariants before writing; re-validate afterward; if anything is off, restore
   from backup and report.

## Preconditions for any write

- Discovery recognized the format **and** version with high confidence.
- The brain is not in use (app closed, no locks, sync idle).
- A backup has been created and its integrity verified.
- The specific mutation is on the allow-list (below).
- The caller explicitly opted in to writes (separate from read access).

If any precondition fails, the operation aborts without modifying anything.

## Allow-listed mutations (start small)

Begin with the smallest, most reversible operations and expand only as each is
proven safe end-to-end:

1. **Set/append a thought note** (least structurally risky).
2. **Add/remove a tag on a thought.**
3. **Rename a thought label.**
4. **Create a new thought.**
5. **Create a link between existing thoughts.**

Higher-risk operations (deleting thoughts/links, changing types, editing
attachments, structural reorganization) stay **out of scope** until the basics
are proven and there is a strong need.

## Write strategy

- **Prefer round-tripping through an import format when available.** If TheBrain
  can re-import a `.brz`/JSON document, generating a corrected export and letting
  the app import it is far safer than editing the live database directly.
- **If editing storage directly**, do it inside a single transaction (for
  SQLite), maintain all invariants (GUID uniqueness, referential integrity of
  source/target/type GUIDs, timestamps), and never leave dangling references.
- **Mirror what the app does.** Match TheBrain's own conventions for IDs,
  timestamps, soft-deletion, and sync bookkeeping so the app does not see the
  brain as inconsistent on next open.

## Invariants to enforce

- Every GUID written is unique and well-formed.
- Every reference (link source/target, type, tag, attachment, note owner)
  resolves to an existing entity.
- Timestamps are set/updated consistently with the app's expectations.
- Soft-deletion/lifecycle flags are respected rather than hard-deleting rows.
- Any sync/version bookkeeping the format uses is updated so the desktop app and
  cloud sync remain coherent on the next refresh.

## Sync interaction

Because a stated goal is to let TheBrain act as "a refresh to the cloud," writes
must not break sync. Until the sync bookkeeping is fully understood, prefer:

- writing only while sync is idle and the app is closed,
- letting the app perform the next cloud sync after it reopens,
- never editing cloud sync state files by hand.

If sync semantics are not understood for a given format/version, treat that
format as **read-only** and do not write.

## Failure handling

- On any validation failure (before or after), **restore from backup** and
  return a clear, actionable error.
- Make operations idempotent where possible, and log enough to reproduce what
  was attempted.
- Never leave the brain in a partially-written state.
