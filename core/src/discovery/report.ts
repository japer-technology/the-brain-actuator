import type { StorageFormat } from "../adapters/types.js";

/** A column observed during a SQLite schema probe. */
export interface ProbedColumn {
  readonly name: string;
  readonly type: string;
  readonly primaryKey: boolean;
  readonly notNull: boolean;
}

/** A table (or JSON document) observed during the schema probe. */
export interface ProbedEntity {
  readonly name: string;
  readonly columns: readonly ProbedColumn[];
  readonly rowCount?: number;
}

/**
 * The result of probing a brain's actual storage layout. Never hard-coded:
 * always read from `sqlite_master` (SQLite) or the document inventory (`.brz`).
 * See `docs/discovery.md` Step 3.
 */
export interface SchemaProbe {
  readonly entities: readonly ProbedEntity[];
  readonly versionMarkers: Readonly<Record<string, string | number>>;
}

/** Per-entity counts surfaced in the discovery report. */
export interface EntityCounts {
  readonly thoughts: number;
  readonly links: number;
  readonly types: number;
  readonly tags: number;
  readonly attachments: number;
}

/**
 * The `safeToWrite` assessment from `docs/discovery.md` Step 4. v1 is read-only,
 * so this is informational; it becomes a hard gate once writes are implemented.
 */
export interface SafeToWriteAssessment {
  readonly safeToWrite: boolean;
  readonly reasons: readonly string[];
}

/**
 * The machine-readable discovery report: the contract that reading and writing
 * build on. Reading/writing must refuse to proceed against a format discovery
 * did not positively recognize.
 */
export interface DiscoveryReport {
  readonly location: string;
  readonly format: StorageFormat;
  readonly version?: string;
  /** Detection confidence in [0, 1]. */
  readonly confidence: number;
  /** Whether the brain appears to be in use (locks present / app running). */
  readonly inUse: boolean;
  readonly entityCounts: EntityCounts;
  readonly schema: SchemaProbe;
  readonly safeToWrite: SafeToWriteAssessment;
  /** Unknowns and low-confidence findings, surfaced rather than hidden. */
  readonly findings: readonly string[];
}
