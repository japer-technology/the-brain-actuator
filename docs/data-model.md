# Data model

This is the **normalized, version-independent model** the library exposes to
callers. Storage adapters (see [discovery.md](discovery.md)) are responsible for
mapping a specific TheBrain on-disk format/version onto this model, so callers
never depend on the raw schema.

> ⚠️ The field lists below are a **starting hypothesis** based on TheBrain's
> general model and commonly observed export formats. Confirm and correct each
> entity against a real brain during discovery before relying on it.

## Identity and references

- Every entity has a stable **GUID**.
- All relationships are expressed by GUID, never by label.
- Timestamps are treated as instants (commonly milliseconds since the Unix
  epoch in exports); the model normalizes them to a single representation.

## Entities

### Thought (node)

| Field | Type | Notes |
| --- | --- | --- |
| `guid` | string | Stable identity |
| `label` | string | Human-readable name (not unique) |
| `created` | instant | Creation time |
| `modified` | instant | Last modification time |
| `typeGuid` | string? | Optional thought type ([Type](#type)) |
| `tagGuids` | string[] | Tags applied to this thought |
| `attachmentGuids` | string[] | Attachments on this thought |
| `hasNote` | bool | Whether a [Note](#note) exists |
| `forgotten`/`active` | bool | Soft-deletion / lifecycle state (verify naming) |

### Link (edge)

| Field | Type | Notes |
| --- | --- | --- |
| `guid` | string | Stable identity |
| `sourceGuid` | string | "From" thought |
| `targetGuid` | string | "To" thought |
| `typeGuid` | string? | Optional link type |
| `relation`/`kind` | enum | Parent/child, jump, sibling, etc. (verify) |
| `direction` | enum | Directed / undirected (verify) |
| `name` | string? | Optional link label |

### Type

Applies to thoughts and/or links.

| Field | Type | Notes |
| --- | --- | --- |
| `guid` | string | Stable identity |
| `name` | string | Type name |
| `appliesTo` | enum | `thought` or `link` |
| `superTypeGuid` | string? | Types can form a hierarchy (verify) |

### Tag

| Field | Type | Notes |
| --- | --- | --- |
| `guid` | string | Stable identity |
| `name` | string | Tag name |

### Note

| Field | Type | Notes |
| --- | --- | --- |
| `thoughtGuid` | string | Owning thought |
| `format` | enum | Rich text / HTML / Markdown (verify) |
| `body` | string | Content; may live in a separate file/blob |

### Attachment

| Field | Type | Notes |
| --- | --- | --- |
| `guid` | string | Stable identity |
| `thoughtGuid` | string | Owning thought |
| `kind` | enum | File or external URL |
| `name` | string | Display name / file name |
| `location` | string | Path within attachment storage, or the URL |
| `bytes` | int? | File size, if a file |

## The graph

Joining [Thought](#thought-node) and [Link](#link-edge) on their GUIDs yields the
full directed graph. Types and tags overlay classification; notes and
attachments hang off individual thoughts. The normalized model should expose
both:

- a **flat entity view** (collections of each entity), and
- a **graph view** (adjacency by thought GUID, with link metadata) for
  traversal.

## Versioning of this model

This normalized model is versioned independently of TheBrain. When an adapter
encounters fields it cannot map, it must record them as unknowns in the
discovery report rather than silently dropping them, and must **never** write
back a partially-understood record.
