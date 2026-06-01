/**
 * The cross-surface error & refusal taxonomy from
 * `scaffold-proposals/02-core-coupler.md`. Every core operation resolves to one
 * of these categories so that each surface (CLI, MCP, REST, …) can translate
 * results faithfully without inventing its own semantics.
 */
export type RefusalCategory =
  | "unrecognized-format"
  | "read-only"
  | "locked"
  | "not-allowed"
  | "precondition-failed"
  | "validation-failed"
  | "not-found"
  | "invalid-argument";

/** A typed error carrying a {@link RefusalCategory} for faithful mapping. */
export class CoreError extends Error {
  readonly category: RefusalCategory;
  readonly details?: unknown;

  constructor(category: RefusalCategory, message: string, details?: unknown) {
    super(message);
    this.name = "CoreError";
    this.category = category;
    this.details = details;
  }
}

export const refuse = (
  category: RefusalCategory,
  message: string,
  details?: unknown,
): CoreError => new CoreError(category, message, details);
