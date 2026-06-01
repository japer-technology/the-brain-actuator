import type { StorageAdapter } from "../adapters/types.js";
import { BrainGraph, type Neighbor } from "../model/graph.js";
import type {
  Attachment,
  BrainData,
  Link,
  Note,
  Tag,
  Thought,
  Type,
} from "../model/index.js";

/** A thought together with its directly-related entities. */
export interface ThoughtContext {
  readonly thought: Thought;
  readonly type?: Type;
  readonly tags: readonly Tag[];
  readonly attachments: readonly Attachment[];
  readonly links: readonly Link[];
  readonly note?: Note;
}

/**
 * Non-destructive read services over a {@link StorageAdapter}. The normalized
 * model is read once and cached; the graph view is built lazily. Everything here
 * is always read-only (see `docs/reading.md`).
 */
export class ReadServices {
  private cachedData: BrainData | undefined;
  private cachedGraph: BrainGraph | undefined;

  constructor(private readonly adapter: StorageAdapter) {}

  async data(): Promise<BrainData> {
    if (this.cachedData === undefined) {
      this.cachedData = await this.adapter.read();
    }
    return this.cachedData;
  }

  async graph(): Promise<BrainGraph> {
    if (this.cachedGraph === undefined) {
      this.cachedGraph = new BrainGraph(await this.data());
    }
    return this.cachedGraph;
  }

  async thought(guid: string): Promise<Thought | undefined> {
    return (await this.graph()).thought(guid);
  }

  async link(guid: string): Promise<Link | undefined> {
    return (await this.graph()).link(guid);
  }

  async type(guid: string): Promise<Type | undefined> {
    return (await this.data()).types.find((t) => t.guid === guid);
  }

  async tag(guid: string): Promise<Tag | undefined> {
    return (await this.data()).tags.find((t) => t.guid === guid);
  }

  async attachment(guid: string): Promise<Attachment | undefined> {
    return (await this.data()).attachments.find((a) => a.guid === guid);
  }

  async note(thoughtGuid: string): Promise<Note | undefined> {
    return this.adapter.readNote(thoughtGuid);
  }

  async neighbors(
    guid: string,
    direction: "both" | "outgoing" | "incoming" = "both",
  ): Promise<Neighbor[]> {
    return (await this.graph()).neighbors(guid, direction);
  }

  /** A thought with its type, tags, attachments, incident links, and note. */
  async thoughtContext(guid: string): Promise<ThoughtContext | undefined> {
    const data = await this.data();
    const thought = data.thoughts.find((t) => t.guid === guid);
    if (thought === undefined) return undefined;
    const tagSet = new Set(thought.tagGuids);
    const attachmentSet = new Set(thought.attachmentGuids);
    const context: ThoughtContext = {
      thought,
      type:
        thought.typeGuid === undefined
          ? undefined
          : data.types.find((t) => t.guid === thought.typeGuid),
      tags: data.tags.filter((t) => tagSet.has(t.guid)),
      attachments: data.attachments.filter((a) => attachmentSet.has(a.guid)),
      links: data.links.filter((l) => l.sourceGuid === guid || l.targetGuid === guid),
      note: thought.hasNote ? await this.adapter.readNote(guid) : undefined,
    };
    return context;
  }

  /**
   * Stream thoughts in pages rather than forcing callers to hold everything in
   * memory. The underlying model is already loaded; paging keeps surfaces (MCP,
   * REST) responsive for very large graphs.
   */
  async *streamThoughts(pageSize = 500): AsyncGenerator<readonly Thought[]> {
    if (!Number.isInteger(pageSize) || pageSize <= 0) {
      throw new RangeError(`pageSize must be a positive integer; got ${pageSize}`);
    }
    const { thoughts } = await this.data();
    for (let i = 0; i < thoughts.length; i += pageSize) {
      yield thoughts.slice(i, i + pageSize);
    }
  }
}
