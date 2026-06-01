import type { BrainData, Link, Thought } from "./index.js";

/** A neighboring thought reached via a link, with the link's metadata. */
export interface Neighbor {
  readonly link: Link;
  readonly thoughtGuid: string;
  /** Direction of travel relative to the queried thought. */
  readonly via: "outgoing" | "incoming";
}

/**
 * A graph view over {@link BrainData}: adjacency keyed by thought GUID, plus
 * fast entity lookup. Built once from the flat entity view; purely in-memory
 * and non-destructive.
 */
export class BrainGraph {
  private readonly thoughtsByGuid = new Map<string, Thought>();
  private readonly linksByGuid = new Map<string, Link>();
  private readonly outgoing = new Map<string, Neighbor[]>();
  private readonly incoming = new Map<string, Neighbor[]>();

  constructor(private readonly data: BrainData) {
    for (const t of data.thoughts) this.thoughtsByGuid.set(t.guid, t);
    for (const link of data.links) {
      this.linksByGuid.set(link.guid, link);
      push(this.outgoing, link.sourceGuid, {
        link,
        thoughtGuid: link.targetGuid,
        via: "outgoing",
      });
      push(this.incoming, link.targetGuid, {
        link,
        thoughtGuid: link.sourceGuid,
        via: "incoming",
      });
    }
  }

  get thoughtCount(): number {
    return this.thoughtsByGuid.size;
  }

  get linkCount(): number {
    return this.linksByGuid.size;
  }

  thought(guid: string): Thought | undefined {
    return this.thoughtsByGuid.get(guid);
  }

  link(guid: string): Link | undefined {
    return this.linksByGuid.get(guid);
  }

  /**
   * Neighbors of a thought. By default both directions are returned; pass
   * `direction` to restrict to outgoing or incoming edges.
   */
  neighbors(
    guid: string,
    direction: "both" | "outgoing" | "incoming" = "both",
  ): Neighbor[] {
    const out = direction !== "incoming" ? (this.outgoing.get(guid) ?? []) : [];
    const inc = direction !== "outgoing" ? (this.incoming.get(guid) ?? []) : [];
    return [...out, ...inc];
  }
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
