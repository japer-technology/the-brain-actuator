import type { AdapterCapabilities } from "../adapters/types.js";
import { refuse } from "../errors.js";

/** The mode a brain handle is opened in. Writes require explicit opt-in. */
export type OpenMode = "read-only" | "read-write";

/**
 * TheLocalBrainGuard — the mandatory in-core safety gate. No surface can bypass
 * it; surfaces may only add further restrictions (see
 * `scaffold-proposals/06-safety-and-versioning.md`).
 *
 * In v1 the guard enforces the read-only posture and capability negotiation. The
 * write-side preconditions (lock-check, backup+verify, post-write validation)
 * are stubbed as fail-closed so writes cannot accidentally proceed before they
 * are implemented (see `docs/modifying.md`).
 */
export class TheLocalBrainGuard {
  constructor(
    private readonly capabilities: AdapterCapabilities,
    private readonly mode: OpenMode,
  ) {}

  /** Fail closed unless the format was positively recognized and is readable. */
  assertReadable(): void {
    if (this.capabilities.format === "unknown" || !this.capabilities.canRead) {
      throw refuse(
        "unrecognized-format",
        "Refusing to read: format/version not positively recognized.",
      );
    }
  }

  /**
   * Capability negotiation: can the brain perform `mutation` right now? Always
   * returns false in v1 (read-only), and false for unknown formats (fail
   * closed).
   */
  can(mutation: string): boolean {
    if (this.mode !== "read-write") return false;
    if (this.capabilities.format === "unknown") return false;
    if (!this.capabilities.syncBookkeepingUnderstood) return false;
    return this.capabilities.writableMutations.includes(mutation);
  }

  /**
   * Gate a write. Throws a typed refusal in every case for v1, because no
   * mutations are on the allow-list yet. This is the single chokepoint future
   * write services must pass through.
   */
  assertCanWrite(mutation: string): never {
    if (this.mode !== "read-write") {
      throw refuse("read-only", `Brain opened read-only; cannot perform "${mutation}".`);
    }
    if (!this.capabilities.syncBookkeepingUnderstood) {
      throw refuse(
        "read-only",
        `Sync bookkeeping not understood for this format; "${mutation}" is refused.`,
      );
    }
    if (!this.capabilities.writableMutations.includes(mutation)) {
      throw refuse("not-allowed", `Mutation "${mutation}" is not on the allow-list.`);
    }
    // Unreachable in v1 (writableMutations is always empty), but fail closed.
    throw refuse(
      "precondition-failed",
      `Write preconditions (lock-check, backup, validation) are not implemented.`,
    );
  }
}
