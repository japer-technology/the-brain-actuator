import { BrainZipAdapter } from "../adapters/brainzip.js";
import { SqliteAdapter } from "../adapters/sqlite.js";
import type { StorageAdapter } from "../adapters/types.js";
import { refuse } from "../errors.js";
import { detectFormat, type Detection } from "./detect.js";
import { probeBrainZip, probeSqlite } from "./probe.js";
import type { DiscoveryReport, SchemaProbe } from "./report.js";

export * from "./report.js";
export { detectFormat } from "./detect.js";
export { locateBrains, defaultBrainRoots } from "./locate.js";
export type { Detection } from "./detect.js";

/** Construct the adapter for a detected format. Fails closed on unknown. */
export function adapterFor(detection: Detection): StorageAdapter {
  switch (detection.format) {
    case "brainzip":
      return new BrainZipAdapter(detection.target, detection.version, detection.confidence);
    case "sqlite":
      return new SqliteAdapter(detection.target, detection.version, detection.confidence);
    default:
      throw refuse(
        "unrecognized-format",
        `Could not positively recognize a brain at: ${detection.target}`,
      );
  }
}

function probe(detection: Detection): SchemaProbe {
  switch (detection.format) {
    case "brainzip":
      return probeBrainZip(detection.target);
    case "sqlite":
      return probeSqlite(detection.target);
    default:
      return { entities: [], versionMarkers: {} };
  }
}

/**
 * Run discovery against a brain at `path` and produce a {@link DiscoveryReport}.
 * Does not throw on unrecognized formats: it reports them (confidence 0,
 * `safeToWrite: false`) so callers can fail closed deliberately.
 */
export function discover(path: string): DiscoveryReport {
  const detection = detectFormat(path);
  const schema = probe(detection);

  const findings: string[] = [];
  let counts = { thoughts: 0, links: 0, types: 0, tags: 0, attachments: 0 };

  if (detection.format === "unknown") {
    findings.push("Format not positively recognized; treating as read-only / no-op.");
  } else {
    const adapter = adapterFor(detection);
    try {
      const data = adapter.read();
      counts = {
        thoughts: data.thoughts.length,
        links: data.links.length,
        types: data.types.length,
        tags: data.tags.length,
        attachments: data.attachments.length,
      };
      if (data.unknowns.length > 0) {
        findings.push(`${data.unknowns.length} unmapped field(s) recorded as unknowns.`);
      }
    } finally {
      adapter.close();
    }
  }

  if (detection.version === undefined && detection.format !== "unknown") {
    findings.push("No version marker found; version is unverified.");
  }
  if (detection.confidence < 0.8 && detection.format !== "unknown") {
    findings.push(`Low detection confidence (${detection.confidence.toFixed(2)}).`);
  }

  const safeReasons: string[] = [];
  if (detection.format === "unknown") safeReasons.push("format not recognized");
  if (detection.inUse) safeReasons.push("brain appears to be in use (lock/sidecar present)");
  // v1 is read-only: writes are never enabled regardless of the assessment.
  safeReasons.push("write support is not implemented in this version (read-only)");

  return {
    location: detection.target,
    format: detection.format,
    version: detection.version,
    confidence: detection.confidence,
    inUse: detection.inUse,
    entityCounts: counts,
    schema,
    safeToWrite: { safeToWrite: false, reasons: safeReasons },
    findings,
  };
}
