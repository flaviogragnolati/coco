---
name: design-grill
description: Highest of three grilling levels (design-grill > feature-grill > simple-grill). Runs a deep architectural grilling session for a large or cross-cutting feature — one that spans multiple modules, introduces or changes domain concepts or boundaries, requires design-pattern or major trade-off decisions, or warrants ADRs. Produces a durable architecture design document under docs/architecture/features/ plus any ADRs, including a high-level rollout/staging plan. This document is a living part of the repository, updated over the project's life — NOT a disposable handoff. It does NOT produce an implementation plan; to plan a phase for execution, run feature-grill (or simple-grill for a small slice) afterward. Use whenever a change is too big or too architecturally consequential for feature-grill; de-escalate if the work is actually contained.
argument-hint: "What complex feature, architectural change, or cross-cutting capability should be grilled?"
---

# design-grill

Use this skill to run a deep architectural discovery and decision-making session for a large, complex, or cross-cutting feature, and to capture the result as a **durable architecture design document** that lives in the repository.

This is the **highest** of three grilling levels. Its job is to pressure-test the feature at the architectural level: clarify the domain and system boundaries, choose design patterns, resolve major trade-offs, decide what deserves an ADR, and sketch **how the work rolls out in broad strokes**.

**Outputs of a session:**
1. The durable **architecture design document** — full structure, status header, and rules in §9. Saved under `docs/architecture/features/{slug}.md`.
2. **ADRs** for decisions that clear the bar in §7 (template and "what qualifies" guidance are there too).
3. **`CONTEXT.md`** updates whenever a domain term is clarified — glossary format in §5.3.

**What the document is:** the durable architectural source of truth, including a high-level rollout/staging plan.
**What it is not:** an implementation plan, a ticket breakdown, or a task list. When you are ready to implement a phase, run `feature-grill` (or `simple-grill` for a small slice) — that produces the implementation plan, consuming this document as its primary input.

---

## Choosing the right grill

Grilling scales with scope. Open any of the three skills and you should see the same map:

| Level | Skill | Use when | Grilling depth | Durable output |
| --- | --- | --- | --- | --- |
| **High — design** | `design-grill` | Large or cross-cutting feature; spans modules; new domain concepts/boundaries; design-pattern or major trade-off decisions; ADR-worthy | Relentless; walks the full design tree; no question cap | A durable **architecture design document** + ADRs, with a high-level rollout/staging plan |
| **Mid — feature** | `feature-grill` | A real, self-contained feature with some complexity, bounded to its domain; not a system-wide architecture effort | Thorough, bounded to the feature's real decision points | An **implementation plan** (feature scale); `CONTEXT.md`/ADR updates inline |
| **Low — simple** | `simple-grill` | Small, contained change — one or two components, a page, a function, a single simple flow | At most 5 questions | A **reduced implementation plan** |

All three produce written documentation and update `CONTEXT.md` whenever a domain term is clarified.

**You are here: the high / design level.** Use this skill only when the feature is genuinely architectural. **De-escalate** if, once grounded, the work turns out to be a single self-contained feature (→ `feature-grill`) or a small contained change (→ `simple-grill`). Don't force the heavyweight design format onto a feature-sized problem; conversely, don't try to settle cross-cutting architecture inside a feature plan.

---

## 1. What to do

Interview the user relentlessly about the proposed feature until there is a shared architectural understanding.

Walk down the design tree one major decision at a time. Ask one question at a time and wait for feedback before continuing.

For every question:

1. Explain why the question matters architecturally.
2. Provide the recommended answer.
3. Explain the trade-offs behind that recommendation.
4. State what future decisions the answer affects.

If a question can be answered by exploring the codebase, documentation, ADRs, schemas, tests, or existing implementation patterns, inspect those sources instead of asking the user. When the user makes a claim about the system, verify it against the codebase or documentation where possible. If the code or existing documentation contradicts the user's assumption, surface the contradiction immediately and ask the user to resolve it.

Do not proceed to detailed implementation planning. Capture only the architectural decisions and the **broad-strokes rollout** needed for the durable document; the detailed execution plan is a separate, later step (`feature-grill` / `simple-grill`).

---

## 2. Primary objective

The objective is to help the user make durable architectural decisions for a complex feature, and to record them — together with a high-level rollout — in a living repository document.

The feature is complex enough for this skill when at least one of the following is true:

* It spans multiple modules, bounded contexts, services, packages, or layers.
* It introduces or changes domain concepts.
* It affects persistence, messaging, events, queues, background jobs, permissions, APIs, integrations, or workflows.
* It requires a new design pattern or modifies an existing architectural pattern.
* It introduces broad technical-debt risk if implemented ad hoc.
* It changes how multiple parts of the system collaborate.
* It creates decisions future developers will need to understand.
* It may require ADRs.
* It may become a platform capability reused by other features.

If, after grounding in the code, none of these hold and the work is contained, **de-escalate** to `feature-grill` (or `simple-grill`) rather than producing a heavyweight architecture document for a small change.

---

## 3. Operating mode

### 3.1 One architectural branch at a time

Do not ask broad batches of questions. Explore one branch at a time (strategic intent, domain model, ownership boundaries, system/module boundaries, data model, state transitions, events and side effects, API surface, persistence, consistency, error handling, security and permissions, observability, operational behavior, extensibility, migration path, rollout strategy, testing strategy, documentation impact).

Resolve dependencies between decisions before going deeper. If an answer depends on a prior unresolved decision, stop and resolve the prior decision first.

### 3.2 Recommend defaults

For every question, provide a recommended answer. Do not merely ask the user what they want. The user should be able to accept, reject, or modify the recommendation. Use this format:

```text
Question:
{single question}

Why this matters:
{architectural relevance}

Recommended answer:
{your recommended decision}

Tradeoffs:
{option A vs option B vs option C, if relevant}

Implications:
{what this affects later}
```

### 3.3 Prefer evidence over speculation

Before asking a question, check whether the answer already exists in: current repository documentation, `CONTEXT.md`, `CONTEXT-MAP.md`, existing ADRs, README files, architecture documents, domain documents, database schemas, API routes, service/module boundaries, existing implementations of similar features, tests, configuration, infrastructure files, and any existing issues, PRs, or design documents in the workspace.

If the evidence is incomplete, say what was found and ask only for the missing decision.

### 3.4 Keep architecture separate from implementation

The session may mention likely implementation consequences, but it must not devolve into low-level implementation planning. Avoid questions like "which exact function should be edited first?", "what is the exact code patch?", or "what should every file contain?". Prefer questions like "which module owns this capability?", "is this a domain, application, infrastructure, or integration concern?", "synchronous, asynchronous, event-driven, command-driven, or workflow-driven?", "what consistency guarantees are required?", "what is the canonical source of truth?", "which existing pattern should this reuse?", "which decision deserves an ADR?", and "what must remain out of scope?".

The rollout you capture is **broad-strokes** (phases and what each delivers, migration/cutover strategy) — not a file-level plan.

---

## 4. Codebase and documentation exploration

### 4.1 Discover existing documentation

At the start of the session, inspect the repository for relevant architecture and domain documents:

```text
/
├── CONTEXT.md
├── CONTEXT-MAP.md
├── README.md
├── docs/
│   ├── architecture/
│   │   └── features/
│   ├── adr/
│   ├── decisions/
│   ├── domain/
│   └── planning/
├── src/
└── packages/
```

If `CONTEXT-MAP.md` exists, use it to identify relevant bounded contexts and context-specific documentation. A multi-context repository may keep a per-context `CONTEXT.md` and `docs/adr/` under each `src/{context}/`.

### 4.2 Read before asking

Before asking about terminology, boundaries, or existing behavior, inspect relevant docs and code: `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/architecture/`, `docs/adr/`, `docs/domain/`, schema/migration files, API route definitions, domain and application services, event handlers, queue processors, background jobs, permission/authorization modules, the closest existing feature of similar shape, integration clients, tests, and infrastructure/deployment configuration.

### 4.3 Cross-reference user claims with code

When the user says "the system already does X," verify it when possible. If the code disagrees, surface it immediately:

```text
The current implementation appears to do X, but your proposed model assumes Y.
Which one should become the source of truth for this feature?
```

### 4.4 Do not create files prematurely

Create files lazily. Only create or update a file when a decision has actually crystallized. Do not create placeholder architecture documents, ADRs, or context files before there is meaningful content. The final architecture document is produced at the end of the session, once the architectural decisions and the high-level rollout have been sufficiently explored.

---

## 5. Domain and terminology rules

### 5.1 Challenge glossary conflicts

If the user uses a term that conflicts with an existing glossary or domain definition, call it out immediately:

```text
Your glossary defines "Cancellation" as a full reversal of an Order, but you seem to be using it here for a partial line-item removal. Should we introduce "Partial Cancellation" as a separate domain term?
```

### 5.2 Sharpen fuzzy language

When the user uses vague or overloaded language, propose a precise canonical term:

```text
You are saying "account." Do you mean CustomerAccount, UserAccount, or BillingAccount? Those are different architectural concepts.
```

### 5.3 Update CONTEXT.md inline

When a domain term is resolved, update the relevant `CONTEXT.md` inline — do not batch glossary updates until the end. Keep `CONTEXT.md` a glossary only: no implementation plans, decisions, ADR content, task lists, or architecture content. Create `CONTEXT.md` lazily, only after the first term is resolved, using the format below.

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

**Rules:** be opinionated — when multiple words exist for one concept, pick the best and list the rest under `_Avoid_`; keep definitions tight (one or two sentences, what it IS, not what it does); only include terms specific to this project's context (general programming concepts don't belong even if used heavily); group terms under subheadings when natural clusters emerge, otherwise a flat list is fine.

**Single vs multi-context.** Most repos have one root `CONTEXT.md`. If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts and the map lists where each lives and how they relate:

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md) — receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md) — generates invoices and processes payments

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced`; Fulfillment consumes them to start picking
- **Ordering ↔ Billing**: shared types for `CustomerId` and `Money`
```

If `CONTEXT-MAP.md` exists, read it to find contexts; if only a root `CONTEXT.md` exists, it's single-context; if neither exists, create a root `CONTEXT.md` lazily when the first term is resolved. When multiple contexts exist, infer which one the current topic relates to; if unclear, ask.

---

## 6. Architectural grilling branches

Use the following branches as a checklist. Do not ask them mechanically. Select the branches relevant to the feature.

### 6.1 Strategic intent

* What problem the feature solves; why it matters now.
* Whether it is product-specific, platform-level, operational, compliance-driven, or technical-debt-driven.
* Whether it should optimize for speed, correctness, extensibility, auditability, cost, resilience, maintainability, or delivery simplicity.
* What would make the feature successful; what would make it dangerous if implemented poorly.
* Whether the feature should establish a reusable architectural pattern for future work.

### 6.2 Domain model

* New domain concepts; existing concepts affected.
* Aggregates, entities, value objects, or records; state machines and lifecycle rules; invariants.
* Ownership; source of truth; derived vs persisted data; historical/audit requirements.
* Canonical terminology; terms that must be deprecated or avoided.

### 6.3 Bounded contexts and module ownership

* Which bounded context owns the feature; which modules consume it.
* Whether a new module/context is justified; whether the capability is core, supporting, generic subdomain, or infrastructure.
* Whether existing boundaries are respected or bypassed; whether the feature introduces unwanted coupling.
* How dependencies should point; whether ownership should follow business invariants rather than trigger location.

### 6.4 Application flow and use cases

* Primary, secondary, and edge cases; failure scenarios; admin/operator scenarios; internal-system and external-integration scenarios.
* Read flows vs write flows; manual vs automated paths; happy path vs degraded path; recovery and remediation.

Use concrete scenarios to pressure-test the design.

### 6.5 Collaboration pattern

Evaluate candidate patterns — direct/domain/application service calls, events, commands, queues, background jobs, sagas/process managers, state machines, workflow orchestration, polling, webhooks, scheduled reconciliation, outbox/inbox, pub/sub, request/response APIs — against: coupling, latency, failure isolation, traceability, transaction boundaries, consistency guarantees, operational complexity, testability, and fit with existing codebase patterns.

### 6.6 Consistency and transaction boundaries

* What must be strongly consistent vs eventually consistent.
* What must happen inside the main transaction vs after commit; what can be retried; what must be idempotent.
* What happens on partial failure; whether outbox or compensating actions are needed; whether duplicate events/messages are acceptable; whether eventual consistency is user-visible or only internal.

### 6.7 Data ownership and persistence

* Which model/table/document owns canonical state; which data is denormalized, derived, or cached.
* Whether new indexes, historical records, soft delete, audit tables, versioning, or temporal modeling are needed.
* Whether migrations, backfill, or read models are required; which data must not be duplicated; which data must remain private to a module or context.

### 6.8 API and integration surface

* Internal and external APIs; webhooks; events/messages; DTOs/contracts.
* Backward compatibility; versioning; idempotency keys; rate limits; error semantics; authn/authz; consumer ownership; contract-testing needs; whether contracts are stable or experimental.

### 6.9 Security, privacy, and permissions

* Who can trigger the feature; who can see its data; who can modify or override it.
* Required permission boundaries; sensitive data; secrets; auditability; compliance/legal constraints; data retention; encryption; abuse cases; least-privilege; administrative bypasses/overrides.

### 6.10 Operational behavior

* Observability, logging, metrics, alerts, tracing.
* Retry behavior, dead-letter handling, manual remediation, admin tools, runbooks, support workflows, rollback behavior.
* Performance and cost constraints; failure modes; production-debugging requirements.

### 6.11 Extensibility and evolution

* Likely future variants; which parts should be extensible now vs deliberately simple.
* Plugin points, strategy candidates, policy objects, rule engines, configuration vs code.
* Where not to over-engineer; what to defer; which abstractions are justified by current evidence vs premature.

### 6.12 Rollout and migration

* Whether the feature can be introduced incrementally; feature-flag strategy.
* Compatibility with existing data; backfill needs; parallel-run needs; cutover and rollback strategy; environment strategy.
* Whether old and new flows must coexist; operational monitoring after release; stakeholder validation.

This branch directly feeds the document's **high-level rollout/staging** section (§21 of the architecture document, defined in §9).

### 6.13 Documentation and continuity

* Which architecture document must be created or updated; which ADRs are needed; which glossary terms must change; which diagrams may help; which existing docs become deprecated.
* Which decisions are settled and must not be re-litigated by a later feature-/simple-grill session; which assumptions a later session must validate against code; which unresolved questions block moving to a feature/execution plan.
* How this document stays a living artifact: who updates it, and on what triggers (new evidence, a superseding decision, an invalidated assumption).

---

## 7. ADR rules

Create ADRs sparingly. Only create or offer an ADR when all of the following are true:

1. **Hard to reverse:** changing the decision later would be materially expensive.
2. **Surprising without context:** a future reader would reasonably ask why this approach was chosen.
3. **Real trade-off:** there were viable alternatives and the chosen option reflects a meaningful trade-off.

If any condition is missing, capture the decision in the architecture document but do not create an ADR. ADRs are a normal and expected output at this level — the design level is precisely where hard-to-reverse trade-offs are made — but they still must clear the bar above.

**Format, location, numbering, and what qualifies** — ADRs live in `docs/adr/` with sequential numbering (`0001-slug.md`, `0002-slug.md`, …); scan for the highest existing number and increment. Create `docs/adr/` lazily, only when the first ADR is needed. Use the repo's existing ADR convention if one exists; don't invent a new one. If the repo has an ADR index, update it.

**Template** — keep it minimal; an ADR can be a single paragraph:

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

Add optional sections only when they earn their place: a **Status** line (`proposed | accepted | deprecated | superseded by ADR-NNNN`) when decisions get revisited; **Considered Options** when the rejected alternatives are worth remembering; **Consequences** when non-obvious downstream effects need calling out.

**What qualifies** (beyond the three tests above): architectural shape ("the write model is event-sourced, the read model projected into Postgres"); integration patterns between contexts ("Ordering and Billing talk via domain events, not synchronous HTTP"); technology choices that carry real lock-in (database, message bus, auth provider — not every library); boundary and scope decisions ("Customer data is owned by the Customer context; others reference it by ID only" — the explicit no-s matter as much as the yes-s); deliberate deviations from the obvious path ("manual SQL instead of an ORM because X"); constraints not visible in the code ("can't use AWS for compliance"); and rejected alternatives whose rejection is non-obvious (picked REST over GraphQL for subtle reasons — record it, or someone re-proposes GraphQL in six months).

---

## 8. External references

Use external references only when they materially improve an architectural decision (official framework/cloud/vendor docs, protocol specs, security standards, database documentation, well-known architecture references, credible engineering articles). Prefer primary or authoritative sources. Do not cite random blog posts when the codebase and official documentation are enough.

When an external reference influences a decision, capture: title, URL, source type, why it matters, which decision it informed, and whether it is normative, supporting, or background material.

---

## 9. The durable architecture document

At the end of the session, generate the durable markdown architecture document, following the format below.

Key points, repeated here so they are not missed:

* **Location:** `docs/architecture/features/{slug}.md` (lowercase kebab-case slug). Create the directory if missing. Never save it in `tmp/`, an OS temp directory, or anywhere outside the repository documentation tree.
* **Living, not disposable.** It is the durable architectural source of truth, updated over the project's life. Re-running `design-grill` on the same feature **updates this file and bumps its status/revision header**, rather than creating a new throwaway document.
* **Captures the architecture plus a high-level rollout/staging plan** (§21) — broad phases at the capability level and the migration/cutover strategy, with **no file/symbol/task-level detail**.
* **It does not produce an implementation plan.** To implement a phase, run `feature-grill` (or `simple-grill` for a small slice) against this document.

Do not invent missing decisions. Classify missing information as blocking question, non-blocking question, optional refinement, or assumption.

### Header

Open with a short status block so a reader knows the document's standing at a glance:

```md
> **Status:** {Proposed | Accepted subset | Accepted | Superseded} — {session tag + date; note revisions, e.g. "design-grill session 2026-06-24; revised v1.1 after code review"}
> **Parent / related architecture:** {links, if any}
> **Supersedes / superseded by:** {links, if any}
> **Living document:** updated over the project's life. To implement a phase, run `feature-grill` (or `simple-grill`) against this document.
```

### Structure

Use the sections below. Drop one only if it genuinely doesn't apply, but never drop **Scope**, **Architectural decisions made**, **Rollout and implementation stages**, or the **Open questions** classification. Prefer tables and tight prose; reference consulted artifacts rather than duplicating them.

```md
# Feature Architecture: {Feature / Capability Name}

{status header block, as above}

## 1. Purpose
{What the feature is for and why now. State explicitly: this is the durable architectural source (incl. high-level rollout); it is not an implementation plan.}

## 2. Executive architectural summary
{The handful of decisions that define the architecture, stated crisply. End with the major non-goals.}

## 3. Current system context
{Relevant existing modules, entry points, data models, and patterns — verified against real code, with real paths. Call out brownfield reference implementations and constraints the design must respect.}

## 4. Documents, code, and references consulted
### 4.1 Internal sources
| Source | Type | Relevance | Status |
| --- | --- | --- | --- |
| `{path}` | {docs/code/schema} | {why it matters} | {source of truth / constraint / supporting / deprecated} |

### 4.2 External sources
{Title, URL, why it mattered, and normative/supporting/background — or "None required."}

## 5. Domain language and terminology
{Terms canonicalized this session. Keep the durable glossary in CONTEXT.md; list here the terms this feature relies on.}

| Term | Definition |
| --- | --- |
| {Canonical Term} | {Domain definition} |

## 6. Scope
### 6.1 Designed now (in scope for this document)
- {the full architectural model this document defines}
### 6.2 Implemented first (if phasing applies)
- {the slice intended to ship first — high level}
### 6.3 Deferred (designed, not now)
- {designed but explicitly not in the near-term rollout}
### 6.4 Out of scope (permanent)
- {deliberately excluded; non-goals}

## 7. Architectural principles and design philosophy
- {principle}

## 8. Main use cases and scenarios
### Scenario: {Name}
**Actor / trigger:** {…}
**Preconditions:** {…}
**High-level flow:** {…}
**Expected outcome:** {…}
**Edge / failure cases:** {…}
**Architectural implications:** {…}

## 9. Affected modules and system boundaries
| Module / Context | Change | Notes / boundary / coupling risk |
| --- | --- | --- |
| `{module}` | {change} | {notes} |

## 10. Proposed architecture
{Ownership, collaboration model, layering, data flow, control flow, transaction/failure/integration boundaries, extension points. Text/ascii diagrams where they clarify.}

## 11. Data and state model
{Source of truth, entities, state lifecycle, derived data, audit/history, idempotency, consistency, migration/backfill, data ownership.}

## 12. API, event, and integration contracts
{Internal/external APIs, events, commands, webhooks, queue messages, DTOs, compatibility, versioning, error semantics, idempotency, consumer responsibilities.}

## 13. Security, permissions, and compliance
{Actors, permission boundaries, sensitive data, audit requirements, retention, secrets, compliance constraints, abuse cases, security-review needs.}

## 14. Operational model
{Observability, logging, metrics, alerts, tracing, retries, dead-letter/remediation, admin workflows, performance, cost, rollback, production support.}

## 15. Architectural decisions made
| Decision | Status | Rationale | Alternatives | Trade-offs | Consequences | Affected modules | ADR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| {decision} | {accepted/tentative/deferred/rejected} | {rationale} | {alternatives} | {trade-offs} | {consequences} | {modules} | {path or no} |

## 16. ADRs
ADRs that this design produced or recommends. Author them per the project's ADR convention.

### 16.1 ADRs created
| ADR | Path | Decision summary | Why it deserved an ADR |
| --- | --- | --- | --- |
### 16.2 ADR candidates not created
| Decision | Why no ADR | Captured where |
| --- | --- | --- |
### 16.3 ADRs to revisit later
- {future ADR candidate}

## 17. Alternatives rejected
| Alternative | Why it was attractive | Why rejected | Evidence / constraint | Reconsider if |
| --- | --- | --- | --- | --- |

## 18. Risks and trade-offs
| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |

## 19. Assumptions
| Assumption | Why reasonable | What could invalidate it | What to do if false |
| --- | --- | --- | --- |

## 20. Open questions
### 20.1 Blocking (resolve before a phase enters a feature/execution plan)
| Question | Why it matters | Recommended default | Resolver |
| --- | --- | --- | --- |
### 20.2 Non-blocking
| Question | Why it matters | Recommended default | Resolver |
| --- | --- | --- | --- |
### 20.3 Optional refinements
- {refinement}

## 21. Rollout and implementation stages (high-level)
> Broad strokes only. This is **not** an implementation plan and must contain no file/symbol/task-level detail. It describes *what ships in what order and why*, and *how it rolls out safely*. A later `feature-grill`/`simple-grill` session turns a single phase into an execution plan.

### Phasing
| Phase | Delivers (capability level) | Why sequenced here | High-level entry/exit |
| --- | --- | --- | --- |
| Phase 1 | {capability, not files} | {dependency/risk rationale} | {what must be true to start / to call it done} |
| Phase 2+ | {…} | {…} | {…} |

### Rollout & migration strategy
{Flag strategy; parallel run / coexistence; cutover; rollback conditions; data vs code migration; post-release monitoring. State explicitly if there is no production deployment yet.}

### Deferred (designed, not in the near-term rollout)
- {phase/capability deferred, with the gate that would un-defer it}

### Handing a phase to execution
{Which phase is the natural first execution target, and the note: run `feature-grill` (or `simple-grill` for a small slice) against this document to produce the implementation plan.}

## 22. Suggested next skills
| Skill | When to invoke | Inputs | Expected output |
| --- | --- | --- | --- |
| `feature-grill` | To plan a phase of this design for execution | This document + the chosen phase | A feature-scale implementation plan |
| `simple-grill` | If the chosen slice is small and contained | This document + the small slice | A reduced implementation plan |

## 23. Redactions and sensitivity notes
{Whether secrets/PII/PHI were encountered and how they were handled/redacted. If none, say so.}

## 24. Final instruction to the next agent
{Use this document as the primary architectural source; treat any named reference implementation as the behavioral bar to preserve; review referenced artifacts before planning/coding; do not re-litigate accepted decisions (§15) unless new repo evidence contradicts them; resolve §20.1 blocking questions before a phase enters an execution plan; to implement, run feature-grill/simple-grill against this document; keep this document updated as the project evolves.}
```

### Rules

- **Living, not disposable.** This document stays in the repo and is updated over the project's life. Re-running `design-grill` on the same feature **updates this file and bumps its status/revision header** — it does not create a new throwaway document. If an implementation discovery invalidates a decision, update the document or add a follow-up ADR rather than leaving it stale.
- **§21 is broad strokes, not a plan.** The rollout section names phases at the *capability* level and the migration/cutover strategy. The moment it starts naming files, symbols, or tasks, it has drifted into implementation-plan territory — pull it back up.
- **Decisions, terms, and tasks each have a home.** Hard-to-reverse decisions → ADRs (§7). Domain terms → `CONTEXT.md` (§5.3). Execution detail → an implementation plan produced later by `feature-grill`/`simple-grill`. This document references all three; it is the home of none of them except the architecture itself.
- **Real evidence.** Cite real paths and verify claims against the code. Mark unresolved items as blocking / non-blocking / optional questions or as assumptions — never invent decisions to fill a section.
- **Durable location only.** Save under `docs/architecture/features/{slug}.md` with a lowercase kebab-case slug. Never `tmp/`, an OS temp directory, or anywhere outside the repository documentation tree.

## 10. Suggested session flow

Use this flow unless the feature clearly requires a different order.

**Phase 1 — Orientation.** Identify the feature; clarify the strategic objective; identify expected architectural impact; locate relevant docs and code; decide whether it is new, an extension, or a replacement of an existing pattern; choose the document slug.

**Phase 2 — System and domain grounding.** Inspect existing terminology; identify affected bounded contexts and current ownership boundaries; identify existing patterns that may apply; surface contradictions between the proposal and current architecture; note documents the final document must reference.

**Phase 3 — Use-case pressure testing.** Define primary, secondary, edge, failure, and admin/operator scenarios; use them to expose missing decisions.

**Phase 4 — Architectural decision tree.** Walk the relevant branches: ownership, collaboration pattern, data ownership, transaction boundaries, consistency, event/command/API contracts, security and permissions, operational behavior, extensibility, migration and rollout.

**Phase 5 — Decision capture.** For each accepted decision, capture the decision, rationale, alternatives, and consequences; decide whether it deserves an ADR; update `CONTEXT.md` if terminology was resolved; create ADRs only where justified; ensure each decision is represented in the document.

**Phase 6 — Rollout shaping.** Turn the rollout/migration branch into the **high-level** §21: broad phases (capability level), sequencing rationale, and migration/cutover strategy. Keep it free of file/task detail.

**Phase 7 — Final durable document.** Generate the document under `docs/architecture/features/{slug}.md`, following the structure in §9.

---

## 11. Question examples

Use questions like these when relevant.

**Strategic intent**

```text
Question: Should this feature be a product-specific workflow or a reusable platform capability?
Why this matters: It determines whether to optimize for immediate delivery or future reuse across modules.
Recommended answer: Platform capability only if ≥2 concrete future consumers are already known; otherwise keep v1 feature-specific but isolate the extension points.
Tradeoffs: Platform-first improves reuse but adds abstraction cost; feature-specific is faster but may create refactoring pressure.
Implications: Module ownership, API shape, configuration strategy, and whether it deserves its own bounded context.
```

**Ownership**

```text
Question: Which module should own the canonical state for this capability?
Why this matters: The owner becomes the source of truth and controls writes, invariants, and lifecycle transitions.
Recommended answer: Assign ownership to the module that owns the business invariant, not the one that happens to trigger the workflow.
Tradeoffs: Trigger-based ownership is convenient but creates long-term coupling; invariant-based keeps the domain coherent.
Implications: Persistence, service boundaries, API direction, events, permissions, test boundaries.
```

**Consistency**

```text
Question: Which parts require strong consistency and which can tolerate eventual consistency?
Why this matters: Overusing strong consistency adds coupling; underusing it can create invalid business states.
Recommended answer: Keep domain invariants strongly consistent; allow notifications, projections, search, analytics, and external integrations to be eventually consistent.
Tradeoffs: Strong consistency improves correctness but limits decoupling; eventual improves scalability but needs reconciliation.
Implications: DB transactions, event design, read models, retries, support tooling.
```

**ADR qualification**

```text
Question: Does this decision deserve an ADR, or only a line in the architecture document?
Why this matters: ADRs should record durable, non-obvious trade-offs, not every minor choice.
Recommended answer: ADR only if hard to reverse, surprising without context, and based on a real trade-off.
Tradeoffs: Too many ADRs create noise; too few hide important intent.
Implications: Repository documentation, onboarding, future refactoring.
```

**Rollout shaping**

```text
Question: What is the smallest first phase that delivers real value while keeping the risky parts deferred?
Why this matters: It sets the §21 rollout and the natural first execution target — without dragging file-level detail into the design doc.
Recommended answer: A deterministic, narrowly-scoped first slice behind a flag; defer the model-directed/agentic/admin surfaces until the core is proven.
Tradeoffs: A smaller first phase ships sooner and de-risks; a larger one reaches the end state faster but concentrates risk.
Implications: The §21 phasing table, the cutover strategy, and what `feature-grill` picks up first.
```

---

## 12. Prohibited behaviors

Do not:

* Generate a detailed implementation plan, tickets, or low-level code tasks as the output — the rollout in §21 is broad-strokes only.
* Ask batches of questions.
* Ignore existing documentation or contradictions between user claims and code.
* Invent repository paths or decisions that were not made.
* Create ADRs for trivial or easily reversible decisions.
* Put implementation details, task lists, or architecture content in `CONTEXT.md`.
* Treat unresolved assumptions as confirmed decisions.
* Browse or cite external references unless they materially affect a decision.
* Over-engineer abstractions without concrete future pressure, or flatten decisions into generic best practices.
* Save the final architecture document in `tmp/`, `./tmp/`, or any temporary directory, or anywhere outside the repository documentation tree.
* Treat the architecture document as disposable, or let a later execution plan become the home for architectural decisions that belong in `docs/architecture/features/`.

---

## 13. Completion criteria

The skill is complete when:

* The major architectural branches relevant to the feature have been explored.
* The user has accepted, rejected, or modified the recommended answers for the major decisions.
* Relevant code and documentation were consulted where available, and contradictions with the code were surfaced.
* Terminology conflicts have been resolved or recorded as open questions; `CONTEXT.md` was updated for resolved terms, following §5.3, if applicable.
* ADRs were created only for qualifying decisions, following §7, if applicable.
* The document includes a **high-level rollout/staging** section (broad phases + migration strategy), with no file/task-level detail.
* Open questions are classified by blocking level.
* The final document is saved at `docs/architecture/features/{slug}.md`, follows the structure in §9, is suitable as a durable repository artifact, separates architectural decisions from implementation detail, and can be handed to `feature-grill`/`simple-grill` to produce an execution plan without repeating the architectural grilling session.