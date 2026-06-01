import type { BrainData, Note } from "../model/index.js";

/** The on-disk storage shapes adapters recognize (see `docs/discovery.md`). */
export type StorageFormat = "brainzip" | "sqlite" | "xml" | "unknown";

/**
 * The declared capabilities of an adapter for an opened brain. Surfaces must be
 * able to negotiate ("can this brain do X right now?") before attempting an
 * operation. Unknown formats yield a read-only / no-op capability set that
 * fails closed.
 */
export interface AdapterCapabilities {
  readonly format: StorageFormat;
  /** Detected format/version string, or undefined if unknown. */
  readonly version?: string;
  /** Detection confidence in [0, 1]. */
  readonly confidence: number;
  /** Whether the adapter can read the normalized model. */
  readonly canRead: boolean;
  /**
   * Allow-listed mutations the adapter supports. Empty for v1 (read-only).
   * See `docs/modifying.md`.
   */
  readonly writableMutations: readonly string[];
  /**
   * Whether the sync bookkeeping for this format/version is understood. Until
   * it is, the brain stays read-only regardless of `writableMutations`
   * (see `docs/modifying.md` — "Sync interaction").
   */
  readonly syncBookkeepingUnderstood: boolean;
}

/**
 * A storage adapter: the only thing that touches a specific on-disk format.
 * Read-only in v1. Adapters are constructed by discovery once a format is
 * positively recognized.
 */
export interface StorageAdapter {
  readonly capabilities: AdapterCapabilities;

  /** Load the full normalized model (flat entity view). */
  read(): BrainData;

  /**
   * Resolve a thought's note (which may be stored out-of-line), or undefined if
   * the thought has no note.
   */
  readNote(thoughtGuid: string): Note | undefined;

  /** Release any held resources (file handles, db connections). */
  close(): void;
}
