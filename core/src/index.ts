/**
 * TheLocalBrain Core — the single coupler to TheBrain's on-disk files.
 *
 * Public, version-independent API. Callers only ever see the normalized model
 * (see `docs/data-model.md`) and negotiate through the capability model (see
 * `scaffold-proposals/02-core-coupler.md`). Read methods are always available;
 * write methods require an explicit opt-in and are not implemented in v1.
 */
import { adapterFor, discover } from "./discovery/index.js";
import { detectFormat } from "./discovery/detect.js";
import type { DiscoveryReport } from "./discovery/report.js";
import type { AdapterCapabilities, StorageAdapter } from "./adapters/types.js";
import { ReadServices } from "./read/services.js";
import { TheLocalBrainGuard, type OpenMode } from "./guard/index.js";
import { TheLocalBrainJournal } from "./journal/index.js";
import { refuse } from "./errors.js";

export * from "./model/index.js";
export { BrainGraph, type Neighbor } from "./model/graph.js";
export * from "./errors.js";
export type { StorageAdapter, AdapterCapabilities, StorageFormat } from "./adapters/types.js";
export {
  discover,
  detectFormat,
  adapterFor,
  locateBrains,
  defaultBrainRoots,
} from "./discovery/index.js";
export type {
  DiscoveryReport,
  SchemaProbe,
  ProbedEntity,
  ProbedColumn,
  EntityCounts,
  SafeToWriteAssessment,
} from "./discovery/report.js";
export { ReadServices, type ThoughtContext } from "./read/services.js";
export { TheLocalBrainGuard, type OpenMode } from "./guard/index.js";
export { TheLocalBrainJournal, type JournalEntry } from "./journal/index.js";

/** Options for {@link open}. */
export interface OpenOptions {
  /** Defaults to `read-only`. `read-write` is refused in v1 (fail closed). */
  readonly mode?: OpenMode;
  /** Optional session id used to attribute journal entries. */
  readonly sessionId?: string;
}

/**
 * An opened brain: the unit of work every surface (CLI, MCP, …) holds. Carries
 * the discovery report, declared capabilities, read services, the guard, and the
 * journal. Always call {@link BrainHandle.close} when done.
 */
export interface BrainHandle {
  readonly report: DiscoveryReport;
  readonly capabilities: AdapterCapabilities;
  readonly mode: OpenMode;
  readonly read: ReadServices;
  readonly guard: TheLocalBrainGuard;
  readonly journal: TheLocalBrainJournal;
  close(): void;
}

/**
 * Open a brain at `path`. Runs discovery, fails closed on unrecognized formats,
 * and refuses `read-write` mode (writes are not implemented in v1).
 */
export function open(path: string, options: OpenOptions = {}): BrainHandle {
  const mode: OpenMode = options.mode ?? "read-only";
  if (mode === "read-write") {
    throw refuse(
      "read-only",
      "read-write mode is not available in this version; open read-only.",
    );
  }

  const report = discover(path);
  const detection = detectFormat(path);
  if (detection.format === "unknown") {
    throw refuse("unrecognized-format", `No recognizable brain at: ${path}`);
  }

  const adapter: StorageAdapter = adapterFor(detection);
  const guard = new TheLocalBrainGuard(adapter.capabilities, mode);
  guard.assertReadable();

  const journal = new TheLocalBrainJournal(options.sessionId);
  journal.record("open", "ok", `${detection.format} @ ${detection.target}`);

  return {
    report,
    capabilities: adapter.capabilities,
    mode,
    read: new ReadServices(adapter),
    guard,
    journal,
    close: () => {
      journal.record("close", "ok");
      adapter.close();
    },
  };
}
