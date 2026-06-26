---
name: feature-grill
description: Middle of three grilling levels (design-grill > feature-grill > simple-grill). Grills a real, self-contained feature — bounded to its own domain, with some genuine complexity but not a system-wide architectural effort — into an aligned, execution-ready implementation plan. Challenges the plan against the existing domain model, sharpens terminology, updates CONTEXT.md inline, and offers ADRs sparingly. Produces an implementation plan (the implementation-plan artifact) plus any CONTEXT.md/ADR updates. Use whenever a feature is more than a small contained change but does not need a full architecture design document. Escalate to design-grill if it turns cross-cutting; de-escalate to simple-grill if it's a small one- or two-file change.
argument-hint: "What feature should be grilled and turned into an implementation plan?"
---

# feature-grill

Use this skill to grill a **single, self-contained feature** until you and the user share a precise understanding of it, then emit an **execution-ready implementation plan** another agent (usually an AI coding agent) can pick up.

This is the **middle** of three grilling levels. Unlike `design-grill`, it does not settle system-wide architecture or produce a durable architecture document; unlike `simple-grill`, it isn't capped at a handful of questions. It grills the feature thoroughly but stays bounded to that feature's real decision points, challenges the plan against the project's existing language and documented decisions, and lands a concrete plan.

**Deliverables (always):**
1. An **implementation plan** — structure and rules in §4 (full variant). It carries a visible record of the alignment reached and is saved in the workspace.
2. **`CONTEXT.md`** updates whenever a domain term is clarified — glossary format in §3.
3. **ADRs** when (rarely) a decision clears the bar in §3 (template and guidance there too).

---

## Choosing the right grill

Grilling scales with scope. Open any of the three skills and you should see the same map:

| Level | Skill | Use when | Grilling depth | Durable output |
| --- | --- | --- | --- | --- |
| **High — design** | `design-grill` | Large or cross-cutting feature; spans modules; new domain concepts/boundaries; design-pattern or major trade-off decisions; ADR-worthy | Relentless; walks the full design tree; no question cap | A durable **architecture design document** + ADRs, with a high-level rollout/staging plan |
| **Mid — feature** | `feature-grill` | A real, self-contained feature with some complexity, bounded to its domain; not a system-wide architecture effort | Thorough, bounded to the feature's real decision points | An **implementation plan** (feature scale); `CONTEXT.md`/ADR updates inline |
| **Low — simple** | `simple-grill` | Small, contained change — one or two components, a page, a function, a single simple flow | At most 5 questions | A **reduced implementation plan** |

All three produce written documentation and update `CONTEXT.md` whenever a domain term is clarified.

**You are here: the mid / feature level.** **Escalate to `design-grill`** if the feature turns out to be cross-cutting — spanning multiple modules/contexts, introducing new domain concepts or boundaries, or forcing several hard-to-reverse, ADR-worthy decisions (one occasional ADR is normal here; a cluster of them means it's an architecture effort). **De-escalate to `simple-grill`** if it's really a small one- or two-file change that a five-question grilling would settle. If a `design-grill` document already exists for this area, read it first and treat its settled decisions as settled — this plan implements a phase of it.

---

## 1. What to do

Interview the user about the feature until you reach a shared, precise understanding, then write the plan.

- **Grill thoroughly, but bounded to the feature.** Walk down each branch of the feature's design — behavior, data, integration, edge cases, failure modes — resolving dependencies between decisions one at a time. You are not capped on questions, but you are scoped to *this feature*; don't drift into system-wide architecture (that's `design-grill`).
- **One question at a time.** Wait for the answer before continuing; later questions usually depend on earlier ones.
- **Recommend a default for every question.** Don't merely ask what the user wants — propose the answer you'd pick and why, so they can accept, modify, or reject it.
- **Read before you ask.** If a question can be answered by exploring the codebase, existing docs, `CONTEXT.md`, or a prior `design-grill` document, explore instead of asking.
- **Cross-reference claims with code.** When the user says "the system already does X," verify it. If the code disagrees, surface the contradiction immediately: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

---

## 2. Domain awareness and existing documentation

During codebase exploration, also look for existing documentation and decisions so your plan speaks the project's language.

### File structure

Most repos have a single context:

```text
/
├── CONTEXT.md
├── docs/
│   ├── architecture/features/      ← design-grill documents (read if one covers this area)
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts; the map points to where each one's `CONTEXT.md` and `docs/adr/` live (see the `CONTEXT.md` format in §3). Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved; if no `docs/adr/` exists, create it when the first qualifying ADR is needed.

If a `design-grill` architecture document exists for this feature's area, it is the upstream source of truth: read it, treat its accepted decisions as settled, and plan a phase of it rather than re-deciding architecture.

---

## 3. During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately: "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term: "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When relationships or behavior are being discussed, stress-test them with specific scenarios that probe edge cases and force precision about boundaries — empty states, concurrent actions, permission boundaries, failure and recovery.

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there — don't batch updates to the end. Keep `CONTEXT.md` a glossary only: no implementation details, decisions, or task lists. Use the format below.

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

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons.

If any of the three is missing, capture the decision in the plan and skip the ADR. If you find yourself wanting several ADRs at once, that's a signal the work is really architectural — consider escalating to `design-grill`.

**ADR format, location, numbering, and what qualifies** — ADRs live in `docs/adr/` with sequential numbering (`0001-slug.md`, `0002-slug.md`, …); scan for the highest existing number and increment. Create `docs/adr/` lazily, only when the first ADR is needed. Use the repo's existing ADR convention if one exists; don't invent a new one. If the repo has an ADR index, update it.

**Template** — keep it minimal; an ADR can be a single paragraph:

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

Add optional sections only when they earn their place: a **Status** line (`proposed | accepted | deprecated | superseded by ADR-NNNN`) when decisions get revisited; **Considered Options** when the rejected alternatives are worth remembering; **Consequences** when non-obvious downstream effects need calling out.

**What qualifies** (beyond the three tests above): architectural shape ("the write model is event-sourced, the read model projected into Postgres"); integration patterns between contexts ("Ordering and Billing talk via domain events, not synchronous HTTP"); technology choices that carry real lock-in (database, message bus, auth provider — not every library); boundary and scope decisions ("Customer data is owned by the Customer context; others reference it by ID only" — the explicit no-s matter as much as the yes-s); deliberate deviations from the obvious path ("manual SQL instead of an ORM because X"); constraints not visible in the code ("can't use AWS for compliance"); and rejected alternatives whose rejection is non-obvious (picked REST over GraphQL for subtle reasons — record it, or someone re-proposes GraphQL in six months).

---

## 4. The deliverable: a feature-scale implementation plan

Once you and the user are aligned, write the plan using the structure and rules below (the full implementation-plan variant).

Two things make this plan a *grilling* output rather than a bare plan: it records the **alignment reached** (§2 of the plan) in the project's own vocabulary, and every step is grounded in the real codebase.

Calibrate tasks at the altitude the rules below specify: name the file, the symbol/signature, the concrete change, the ordering constraint, and the acceptance criterion — but stop before writing the finished code. Ground every path in the real codebase; mark new files `[NEW]`. Decompose into a small number of coherent, ordered phases, each independently verifiable. Make dependencies explicit so an agent can execute top-to-bottom without an ordering surprise.

### Structure

```md
# Implementation Plan: {Feature Name}

## 1. Objective & outcome
- **Done means:** {verifiable end state an outside observer could check}
- **Why:** {reason this work is happening}
- **For:** {AI coding agent / developer}
- **Upstream design doc:** {path to the design-grill document this implements a phase of, or "none"}

## 2. Alignment reached
The decisions agreed during grilling — the record that we're on the same page and speaking the project's language.

| Topic | Decision | Source |
| --- | --- | --- |
| {e.g. partial-cancellation semantics} | {what we agreed} | {user / code / design doc / default accepted} |

## 3. Scope
- **In scope:** {what this delivers}
- **Out of scope / non-goals:** {what the executor must NOT do — be specific}
- **Deferred:** {plausibly next, but not now}
- **Must not change / break:** {existing behavior, contract, or invariant to preserve}

## 4. Current system context
{Relevant existing modules, entry points, data models, and patterns, with real paths and any constraints found in the code. Cite the closest existing feature/pattern to mirror.}

## 5. Approach & sequencing
{Chosen approach and why (schema-first, scaffold-then-fill, test-first, strangler/parallel-path, …); overall phase ordering and key dependencies; how regressions are avoided; how correctness is validated.}

## 6. Assumptions
| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |

## 7. Phased execution plan
### Phase 1 — {Name}
**Objective:** {purpose}
**Tasks:** {ordered list}
**Dependencies:** {what must precede this phase}
**Validation / done:** {how this phase is verified}

{Repeat per phase.}

## 8. Task breakdown
### {Task ID} — {Task name}
- **Files:** `{path}` (`[NEW]` if new)
- **Symbols / signatures:** `{function/class/type/endpoint + shape}`
- **Change (operational, not finished code):** {what to do}
- **Mirror this pattern:** `{path to example, if any}`
- **Depends on:** {task IDs / conditions}
- **Acceptance:** {passing test / response shape / migration result / type-check}
- **Pitfalls:** {specific hazard for this task}

{Repeat per task. Each entry should convert directly into a ticket or agent prompt.}

## 9. Cross-cutting concerns
- **Data / schema / migration / backfill:** {details or N/A}
- **Config / env / feature flags:** {details or N/A}
- **Security / permissions:** {details or N/A}
- **Observability (logs / metrics / tracing):** {details or N/A}

## 10. Pitfalls & gotchas (global)
- {cross-task hazard, stated concretely — ordering hazards, easy-to-miss companion edits (barrel re-exports, DI/route registration, env updates), backward-compatibility, transaction/idempotency, library quirks}

## 11. Testing & validation
- **Tests to add/update:** {file + what it asserts}
- **Commands:** `{test}`, `{lint}`, `{type-check}`, `{build}`
- **Manual checks / regression risks:** {…}
- **Success criteria:** {what counts as passing}

## 12. Rollout, migration & rollback
{Sequence, compatibility, feature-flag/cutover strategy, rollback conditions, post-release monitoring. State N/A and why if not applicable.}

## 13. Documentation updates
- {docs/README/runbook to change}
- **CONTEXT.md:** {terms added/updated this session, or "None"}
- **ADRs:** {ADRs created this session + path, or "None"}

## 14. Risks & trade-offs
| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |

## 15. Open questions
- **Blocking (resolve before execution):** {question + recommended default + resolver}
- **Non-blocking (resolve during execution):** {question + default}
- **Optional refinements:** {idea that may improve the design but isn't required}

## 16. Definition of done
- [ ] {objectively checkable condition}
- [ ] {objectively checkable condition}

## 17. Instructions for the executing agent
- Use this plan as the primary source; read first: {required files/docs}.
- Respect these settled decisions: {list}. Do not change: {guardrails from §3}.
- Verify before modifying: {what to confirm against the code}.
- Execute phases in order; honor task dependencies.
- Implement at the level specified — write the code the tasks describe; do not re-architect. If a blocking question is unresolved, stop and ask; for non-blocking gaps, proceed on the stated default and note the assumption.
```

### Rules

- **Right altitude.** Each task names the file, the symbol/signature, the concrete change, and the acceptance criterion — but stops before the finished code. Never a vague goal ("improve error handling"); never the full diff.
- **Real paths only.** Every cited path/symbol exists in the codebase, or is marked `[NEW]`. Never invent paths.
- **Sequenced.** An agent should be able to execute top-to-bottom. Make dependencies and ordering hazards explicit; call out the easy-to-miss companion edits.
- **Scope is unmistakable.** In / out / deferred / must-not-break are spelled out, not implied.
- **Decisions and terms live elsewhere.** Architectural decisions belong in ADRs (§3) or, for a phase of a larger design, the upstream `design-grill` document. Domain terms belong in `CONTEXT.md` (§3). The plan *references* them; it is not their home.
- **The plan is disposable; its by-products are not.** The plan lives in the workspace and can be thrown away after execution. The `CONTEXT.md` entries and ADRs it produced are durable repo files.

## 5. Output location

Save the plan inside the current workspace (never an OS temp directory, never outside the workspace):

```text
./tmp/implementation-plan-{feature-slug}.md
```

Create `./tmp/` if needed; use a stable, lowercase, kebab-case slug. If the repository already has a plan convention (e.g. `docs/plans/`), follow it instead. After saving, present the file with `present_files` if that tool is available.

Note the difference from the other levels' by-products: the **plan** is a working artifact in the workspace, but the `CONTEXT.md` entries and any ADRs you create are **durable repository files** — they live in the repo, not in `./tmp/`.

---

## 6. Quality checklist & guardrails

Before delivering, confirm:

- **Alignment is visible.** §2 of the plan records the decisions reached, in the project's vocabulary.
- **Right altitude.** Each task has file + symbol + change + acceptance — never the finished code, never a vague goal.
- **Real paths.** Every cited path/symbol exists or is marked `[NEW]`.
- **Sequenced.** An agent could execute top-to-bottom; dependencies and ordering hazards are explicit.
- **Scope is unmistakable.** In / out / deferred / must-not-break are clear.
- **Docs handled.** `CONTEXT.md` updated for resolved terms (per §3); ADRs created only for qualifying decisions (per §3); both noted in the plan's documentation section.
- **Still feature-sized.** If it became cross-cutting during the session, you escalated to `design-grill`; if it shrank to a trivial change, you de-escalated to `simple-grill`.

Do **not**: settle system-wide architecture or write a durable architecture document here (that's `design-grill`); fabricate file paths; put implementation details, decisions, or task lists in `CONTEXT.md`; create ADRs for trivial or easily reversible decisions; ship a plan an agent would have to stop and ask questions to execute; or save the plan outside the workspace.