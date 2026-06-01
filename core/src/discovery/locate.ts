import { homedir, platform } from "node:os";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** A candidate brain location with where it came from. */
export interface CandidateLocation {
  readonly path: string;
  readonly source: "explicit" | "default";
}

/**
 * Default directories to probe per platform. These are HYPOTHESES to verify
 * against a real installation (see `docs/discovery.md` Step 1).
 */
export function defaultBrainRoots(): string[] {
  const home = homedir();
  switch (platform()) {
    case "win32": {
      const userProfile = process.env["USERPROFILE"] ?? home;
      const localAppData = process.env["LOCALAPPDATA"] ?? join(home, "AppData", "Local");
      return [join(userProfile, "Documents", "TheBrain", "Brains"), join(localAppData, "TheBrain")];
    }
    case "darwin":
      return [
        join(home, "Documents", "TheBrain", "Brains"),
        join(home, "Library", "Application Support", "TheBrain"),
      ];
    default:
      return [join(home, "TheBrain"), join(home, ".config", "TheBrain")];
  }
}

/**
 * Resolve candidate brain locations. An explicit path always wins and is
 * returned even if it does not exist (so the caller gets a clear not-found
 * downstream); default roots are only returned when they exist.
 */
export function locateBrains(explicitPath?: string): CandidateLocation[] {
  if (explicitPath !== undefined) {
    return [{ path: explicitPath, source: "explicit" }];
  }
  return defaultBrainRoots()
    .filter((p) => existsSync(p))
    .map((path) => ({ path, source: "default" as const }));
}
