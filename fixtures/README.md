# Fixtures

Test fixtures for TheLocalBrain Core.

> ⚠️ **These are SYNTHETIC fixtures, not captures from a real TheBrain
> installation.** They are built to the *hypothesized* on-disk shapes documented
> in [`docs/discovery.md`](../docs/discovery.md) and
> [`docs/data-model.md`](../docs/data-model.md). Their only job is to exercise the
> adapters and read services end to end. When the discovery bootstrap (roadmap
> Phase 1) is run against a real throwaway brain, replace these with verified
> captures and update the docs accordingly.

## Contents

- `brainzip-sample/` — an **unpacked** `.brz` export (JSON documents + an
  out-of-line note). The BrainZip adapter reads this directly.
- `sample.brz` — the same sample as a real ZIP archive (generated).
- `sample.db` — a SQLite working-directory database with the same data
  (generated).

## Regenerating the generated fixtures

The `.brz` ZIP and the SQLite database are derived from `brainzip-sample/`:

```sh
node fixtures/generate.mjs
```
