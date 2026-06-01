# Questions — answer here

This is the **one standard spot** to answer every open question in the scaffold
proposal. Read the proposal documents ([00](00-concept.md) → [07](07-decisions.md)),
then fill in the `Answer:` line under each question below.

That's all there is to it:

1. The proposal is presented in the numbered documents.
2. You answer all the questions here.
3. When every `Answer:` is filled in, the proposal is finalized — see
   [Finalized proposal](#finalized-proposal) at the bottom.

A `Suggested:` line gives the proposal's default so you can just write "yes" or
"accept" if you agree. Leave an answer blank until you've decided it.

---

## 00 — Concept

**D0.** Do we adopt the "one core coupler, many interfaces" separation as the
scaffolding principle for the project?
Suggested: Yes
Answer: yes

## 01 — Naming

**D1a.** What is the core mechanism's name?
Suggested: StateLink Core (fallback: Activator Core)
Answer: TheLocalBrain Core

**D1b.** What is the MCP surface's name?
Suggested: StateLink MCP Server
Answer: TheLocalBrain MCP Server

**D1c.** Do we adopt the `<Core> <Surface>` naming convention and the executable
naming scheme (`statelinkctl`, `statelink-mcp`, …)?
Suggested: Yes
Answer: Yes but naming scheme (`thelocalbrainctl`, `thelocalbrain-mcp`, …)

## 02 — Core coupler

**D2a.** Do we accept the capability model (handle + mode + declared adapter
capabilities + mandatory negotiation) as the single contract for all surfaces?
Suggested: Yes
Answer: Yes

**D2b.** Do we accept the shared operation lifecycle and the error/refusal taxonomy
as the cross-surface standard?
Suggested: Yes
Answer: Yes

**D2c.** Do we accept "one writer per brain, many readers" as the concurrency
baseline?
Suggested: Yes
Answer: Yes

## 03 — Interfaces

**D3.** Which interfaces are in the launch set, which are soon, and which are
later/never?
Suggested: launch = SDK + CLI + MCP; soon = REST + Console; rest = later
Answer: launch = SDK + CLI + MCP; soon = REST + Console; rest = later

## 04 — Architecture

**D4a.** Do we accept the monorepo `core/` + `surfaces/*` layout (one package per
surface, strict one-way dependencies)?
Suggested: Yes
Answer: yes

**D4b.** Do we accept the build/test posture (core tested against fixtures; surfaces
tested as thin translators)?
Suggested: Yes
Answer: Yes

## 05 — MCP server

**D5a.** Is the MCP server in the launch set?
Suggested: Yes
Answer: Yes

**D5b.** Do we accept "read-only by default; write tools only registered in an
explicit write-enabled mode" as the MCP safety posture?
Suggested: Yes
Answer: Yes

**D5c.** Do we start with stdio-only transport and defer remote/networked MCP (with
its auth requirements) to later?
Suggested: Yes
Answer: Yes

**MCP-1.** Do we expose prompts (e.g. "summarize this thought's subtree") or keep
the surface to resources + tools only?
Answer: Yes

**MCP-2.** What is the paging/streaming strategy for very large graphs exposed as
resources?
Answer: Best possible

**MCP-3.** For remote MCP, what auth model (token, mTLS) do we require before any
write tools are even registered?
Answer: TBA

## 06 — Safety and versioning

**D6a.** Do we make StateGuard a mandatory in-core gate that no surface can bypass
(surfaces may only add restrictions)?
Suggested: Yes
Answer: Yes but called TheLocalBrainGuard

**D6b.** Do we adopt StateJournal as a first-class core component from the start
(vs. deferring audit/rollback)?
Suggested: Yes
Answer: Yes but called TheLocalBrainJournal

**D6c.** Do we confirm the split: safety/invariants in the core (StateGuard),
authn/authz in the surfaces?
Suggested: Yes
Answer: Yes

## 07 — Runtime/language

**D7.** What is the core runtime/language?
Suggested: Defer until after discovery (Phase 1)
Answer: Defer until after discovery (Phase 1)

---

## Finalized proposal

When every `Answer:` above is filled in, the proposal is finalized. The answers
recorded here are the decisions; nothing further is needed to lock them in.
