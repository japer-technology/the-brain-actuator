import { randomUUID } from "node:crypto";
import type { RefusalCategory } from "../errors.js";

/** A single recorded operation outcome. */
export interface JournalEntry {
  readonly id: string;
  readonly at: number;
  readonly sessionId: string;
  readonly operation: string;
  readonly outcome: "ok" | RefusalCategory;
  readonly detail?: string;
}

/**
 * TheLocalBrainJournal — a first-class operation log from the start. In v1 it
 * records read operations and refusals; once writes land it becomes the basis
 * for diffs and rollback (see `scaffold-proposals/06-safety-and-versioning.md`).
 *
 * The default implementation is in-memory and append-only. A surface can read
 * the log for observability/audit.
 */
export class TheLocalBrainJournal {
  private readonly log: JournalEntry[] = [];
  readonly sessionId: string;

  constructor(sessionId: string = randomUUID()) {
    this.sessionId = sessionId;
  }

  record(operation: string, outcome: JournalEntry["outcome"], detail?: string): JournalEntry {
    const entry: JournalEntry = {
      id: randomUUID(),
      at: Date.now(),
      sessionId: this.sessionId,
      operation,
      outcome,
      detail,
    };
    this.log.push(entry);
    return entry;
  }

  entries(): readonly JournalEntry[] {
    return this.log;
  }
}
