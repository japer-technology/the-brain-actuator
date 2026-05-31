# Suggestions

A deep read of this repository — `README.md`, the `docs/` design set, and the
`scaffold-proposals/` decision package (including the filled-in
[`QUESTIONS.md`](scaffold-proposals/QUESTIONS.md)) — and what I'd suggest from it.

## What I understand you're trying to achieve

Stripped to its essence, the goal is to **invert the relationship with TheBrain**:

- Keep TheBrain as the *authoring front-end* — its UX for building large, typed,
  densely-linked knowledge graphs is the thing worth keeping.
- Build a **local data plane** on top of the files TheBrain writes to disk, so
  your own software can read (and, carefully, write) that graph directly —
  without the cloud API, and without re-implementing the UI.
- The headline consumer is **AI agents over MCP**: you want an agent to be able
  to safely discover, read, and eventually mutate a brain. The renaming in
  `QUESTIONS.md` (*TheLocalBrain Core*, *TheLocalBrain MCP Server*,
  *TheLocalBrainGuard*, *TheLocalBrainJournal*, `thelocalbrainctl`) makes the
  intent explicit: a **local, agent-accessible "TheLocalBrain"** that mirrors the
  authored brain and exposes it programmatically.
- Everything is wrapped in a **safety-first** posture: read-only by default,
  fail closed on unknown formats, never fight the running app, back up before
  any write.

So the *value* you're chasing is "the structured data I authored in TheBrain,
usable locally by my own code and by agents." TheBrain's desktop app becomes,
for your purposes, mostly a sync/refresh client to the cloud.

The architecture thinking is genuinely strong: the "one core coupler, many thin
surfaces" split is the right shape, and putting all storage/safety knowledge in
one place is exactly what keeps a risky project from corrupting data in sixteen
different ways. The suggestions below are about **sequencing, scope, and a few
sharp edges** — not about changing that direction.

## The single most important suggestion: verify the format before anything else

Every concrete fact in `docs/discovery.md` and `docs/data-model.md` is currently
a **hypothesis** (the docs say so honestly). The entire project rests on those
hypotheses being true. A quick external check is consistent with the docs (a
`.brz` is a ZIP containing a SQLite DB plus JSON, with `thoughts`/`links`-style
tables), but *consistent with* is not *verified against your installation*.

**Do the discovery bootstrap (roadmap Phase 1) before committing to any more
design.** Concretely:

1. Create a throwaway brain in TheBrain with a handful of thoughts, links, a
   type, a tag, a note, and an attachment.
2. Export it to `.brz` **and** copy the live folder.
3. Crack both open and record what is *actually* there: file names, the SQLite
   schema (`sqlite_master`, columns, PKs, FKs, version markers), and the JSON
   document shapes.
4. Replace the hypotheses in `docs/discovery.md` and `docs/data-model.md` with
   verified facts, and commit the sample brain as a **fixture**.

Until this is done, every downstream decision (adapters, the normalized model,
the write allow-list) is built on sand. This is the highest-leverage next action
in the whole repo.

## Prove one thin vertical slice before building breadth

The scaffold catalogs **16 interfaces** and a rich core contract. That's good
thinking, but it's a lot of designed surface area for a repo that has not yet
read a single byte from a real brain. The risk is over-investing in breadth
before the core read path is proven.

Suggested first milestone — the smallest thing that delivers your actual goal:

> **discover → read a `.brz` export → expose it read-only over MCP.**

That one slice exercises discovery, an adapter, the normalized model, read
services, and the flagship surface — end to end — while touching nothing
dangerous. If an agent can traverse your brain through that path, you've proven
the concept and the contract. Everything else (CLI niceties, REST, Console,
write-back, the other ~11 surfaces) can follow on demand.

## Favour the `.brz` path, and treat write-back as a separate, optional bet

Two related suggestions:

- **Read from `.brz`/JSON first, not the live SQLite.** It's the most stable and
  portable representation, exporting can't corrupt the live brain, and it
  sidesteps locking and half-written-database problems entirely. The SQLite
  adapter is more valuable for *live/current* reads — add it second, behind the
  same normalized model. `docs/reading.md` already leans this way; I'd make it an
  explicit rule for v1.

- **Question whether you need direct writes at all for the core value.** Your
  stated value proposition is *consuming* authored data locally — that's almost
  entirely reads. Direct writes into another app's private SQLite are the single
  biggest source of corruption and sync-breakage risk. Where you do want
  write-back, strongly prefer the **import round-trip** that `docs/modifying.md`
  already mentions (emit a corrected `.brz`/JSON and let TheBrain re-import it)
  over editing storage in place. Consider deferring direct-storage writes
  indefinitely unless a concrete need proves they're worth the risk.

## Treat cloud sync as the deepest unknown, not a footnote

The premise "TheBrain becomes a sync client to the cloud" cuts both ways: if the
local store participates in sync via operation logs / bookkeeping you don't
understand, a hand-written change can produce **sync conflicts or silent data
loss** the next time the app syncs — even if your write was internally valid.

Suggestion: make **"is sync bookkeeping understood for this format/version?"** an
explicit, first-class gate in discovery and StateGuard. If the answer is no, the
format is read-only, full stop. This is already the spirit of the docs; I'd
elevate it to a named precondition so it can't be quietly skipped. Investigating
sync semantics deserves its own discovery sub-task before *any* direct write
ships.

## Reconcile the naming before it sets

Naming is cheap to fix now and expensive later (the scaffold says this too).
Right now there are **three identities in flight**: the repo `the-brain-actuator`,
the product *The Brain Activator* (README), and the answered core name
*TheLocalBrain*. Suggestions:

- Pick **one** product identity and apply it consistently across the README,
  docs, and scaffold. *TheLocalBrain* actually communicates the value ("a local
  copy of your brain") better than *Activator*; if you adopt it, update the repo
  description and README accordingly.
- `QUESTIONS.md` D1b says **"TheLocalBrain PCP Server"** — that's almost
  certainly a typo for **MCP**. Worth fixing so it doesn't propagate into code or
  executable names.
- **D3 (the launch set) is left blank** in `QUESTIONS.md`, yet it's the decision
  that actually scopes the first delivery. I'd suggest answering it explicitly —
  the proposal's own recommendation (launch = SDK + CLI + MCP) is a sound
  default, and matches the "thin vertical slice" suggestion above.
- The custom names (*TheLocalBrainGuard*, *TheLocalBrainJournal*) are fine, but
  several scaffold docs still say *StateGuard*/*StateJournal*. Once names are
  locked, do a single sweep so the code-facing identifiers are unambiguous.

## A few smaller sharp edges worth noting

- **Version pinning.** The on-disk format is owned by TheBrain and can change
  without notice. Decide early which specific app versions you claim to support,
  record the detected schema/version in every discovery report, and **fail
  closed** on anything unrecognized (the docs already say this — capturing
  per-version fixtures is what makes it real).
- **GUID vs. integer id.** `docs/data-model.md` keys everything on GUIDs, but the
  raw SQLite tables may use integer ids internally (the external check showed
  integer-id examples). Confirm during discovery which is the stable
  cross-reference, and make sure the adapter maps to the GUID the export uses so
  the normalized model stays version-independent.
- **Notes are HTML-ish.** Notes appear to be rich/HTML content, possibly stored
  out-of-line. Decide up front whether the normalized model exposes raw HTML,
  sanitized HTML, or Markdown, and resolve out-of-line note bodies transparently
  in the reader.
- **Check the licence/ToS angle.** Reading your own exported data is clearly
  fine; programmatically writing into the app's private store may have ToS
  implications worth a quick check before you build the write path.
- **Look for prior art.** TheBrain's `.brz`/JSON format is somewhat known in the
  community. A short search for existing open-source readers could save
  reverse-engineering effort and validate your data model.

## Suggested near-term sequence

1. **Discovery bootstrap** against a real throwaway brain; commit fixtures;
   replace the hypotheses in `docs/`. *(Phase 1 — unblocks everything.)*
2. **Resolve open `QUESTIONS.md` items**: D3 launch set, the *PCP→MCP* typo, and
   a single product name; sweep naming.
3. **Read-only `.brz` adapter + normalized model**, tested entirely against the
   committed fixtures (no live app needed).
4. **Read-only MCP server** (resources + read tools) over that adapter — the
   first end-to-end proof of the whole idea.
5. Only then weigh **live SQLite reads**, then **import-round-trip writes**, then
   additional surfaces — each behind concrete demand and proven safety.

This keeps the safety-first ordering you already chose, but front-loads the one
thing that currently has zero evidence behind it (the real format) and delays the
one thing with the most risk (direct writes) until it's actually needed.
