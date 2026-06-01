/**
 * The normalized, version-independent model exposed to callers.
 *
 * Storage adapters map a specific TheBrain on-disk format/version onto this
 * model, so callers never depend on the raw schema. See `docs/data-model.md`.
 *
 * NOTE: The fields here track the documented model. Concrete shapes remain
 * hypotheses until verified against a real brain (see `docs/discovery.md`).
 */

/** An instant in time, normalized to milliseconds since the Unix epoch. */
export type Instant = number;

/** What a {@link Type} can be applied to. */
export type TypeAppliesTo = "thought" | "link";

/** The relation a {@link Link} expresses. Verify naming against a real brain. */
export type LinkRelation = "child" | "jump" | "sibling" | "unknown";

/** Whether a {@link Link} is directed or not. */
export type LinkDirection = "directed" | "undirected" | "unknown";

/** The format a {@link Note} body is stored in. */
export type NoteFormat = "html" | "markdown" | "richtext" | "text" | "unknown";

/** Whether an {@link Attachment} is an embedded file or an external URL. */
export type AttachmentKind = "file" | "url" | "unknown";

/** A thought (node) in the graph. */
export interface Thought {
  readonly guid: string;
  readonly label: string;
  readonly created?: Instant;
  readonly modified?: Instant;
  readonly typeGuid?: string;
  readonly tagGuids: readonly string[];
  readonly attachmentGuids: readonly string[];
  readonly hasNote: boolean;
  /** Soft-deletion / lifecycle state. `true` means the thought is forgotten. */
  readonly forgotten: boolean;
}

/** A link (edge) between two thoughts. */
export interface Link {
  readonly guid: string;
  readonly sourceGuid: string;
  readonly targetGuid: string;
  readonly typeGuid?: string;
  readonly relation: LinkRelation;
  readonly direction: LinkDirection;
  readonly name?: string;
}

/** A type applied to thoughts and/or links. */
export interface Type {
  readonly guid: string;
  readonly name: string;
  readonly appliesTo: TypeAppliesTo;
  readonly superTypeGuid?: string;
}

/** A tag applied to thoughts. */
export interface Tag {
  readonly guid: string;
  readonly name: string;
}

/** A note attached to a thought. The body may live out-of-line. */
export interface Note {
  readonly thoughtGuid: string;
  readonly format: NoteFormat;
  readonly body: string;
}

/** An attachment on a thought (a file or an external URL). */
export interface Attachment {
  readonly guid: string;
  readonly thoughtGuid: string;
  readonly kind: AttachmentKind;
  readonly name: string;
  readonly location: string;
  readonly bytes?: number;
}

/**
 * The flat entity view: collections of each entity. Adapters produce this; read
 * services and the graph view are derived from it.
 */
export interface BrainData {
  readonly thoughts: readonly Thought[];
  readonly links: readonly Link[];
  readonly types: readonly Type[];
  readonly tags: readonly Tag[];
  readonly attachments: readonly Attachment[];
  /**
   * Raw fields an adapter could not map to the normalized model, keyed by a
   * human-readable location (e.g. "thoughts[3].kindId"). Recorded rather than
   * silently dropped, per `docs/data-model.md`.
   */
  readonly unknowns: readonly UnknownField[];
}

/** A raw field an adapter encountered but could not map. */
export interface UnknownField {
  readonly where: string;
  readonly field: string;
  readonly sample?: unknown;
}
