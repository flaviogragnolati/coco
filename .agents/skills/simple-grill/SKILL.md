---
name: simple-grill
description: Lowest of three grilling levels (design-grill > feature-grill > simple-grill). Lightweight grilling session for small, well-contained changes — a single component or two, one page, one function, one simple flow. Runs a short, focused interview (at most 5 questions) to align on intent, behavior, integration, edge cases, and scope, then produces a reduced implementation plan ready to implement. Updates CONTEXT.md inline only if a new term surfaces. Use this whenever a change is small enough that feature-grill or design-grill would be overkill but you still want explicit alignment and a written plan before coding. If the work turns out to span multiple modules, introduce new domain concepts, or need ADRs, stop and escalate to feature-grill or design-grill.
argument-hint: "What small feature, component, page, or flow should be grilled and planned?"
---

# simple-grill

Use this skill to run a **short alignment grilling** for a small, well-contained piece of work and then emit a **reduced implementation plan** another agent (usually an AI coding agent) can implement directly.

The point is alignment, not exhaustiveness. You ask only the few questions that actually de-risk the change, resolve everything else by reading the code, and write down what was agreed so the executor knows exactly what to build. The deliverable is a **slimmed-down implementation plan** — the same kind of artifact `feature-grill` and `implementation-plan` produce, reduced to fit a small change, and explicitly **not** an architecture document.

Conduct the session and write the final document in the user's working language (for this project, Spanish). The instructions below are in English; the conversation with the user is not.

---

## 1. Choosing the right grill

Grilling scales with scope. Open any of the three skills and you should see the same map:

| Level | Skill | Use when | Grilling depth | Durable output |
| --- | --- | --- | --- | --- |
| **High — design** | `design-grill` | Large or cross-cutting feature; spans modules; new domain concepts/boundaries; design-pattern or major trade-off decisions; ADR-worthy | Relentless; walks the full design tree; no question cap | A durable **architecture design document** + ADRs, with a high-level rollout/staging plan |
| **Mid — feature** | `feature-grill` | A real, self-contained feature with some complexity, bounded to its domain; not a system-wide architecture effort | Thorough, bounded to the feature's real decision points | An **implementation plan** (feature scale); `CONTEXT.md`/ADR updates inline |
| **Low — simple** | `simple-grill` | Small, contained change — one or two components, a page, a function, a single simple flow | At most 5 questions | A **reduced implementation plan** |

All three produce written documentation and update `CONTEXT.md` whenever a domain term is clarified.

**You are here: the low / simple level.** **Is it actually simple?** Use this skill only when most of these hold: the change lives in roughly one place, mirrors an existing pattern, introduces no new domain concept, needs no ADR, and an experienced dev could hold the whole thing in their head.

**Escalate mid-session if the floor opens up.** If you discover the change spans several modules, forces a new domain term or boundary decision, or surfaces a choice that is hard to reverse and a real trade-off (i.e. ADR-worthy), stop and say so plainly: this is no longer "simple." Recommend `feature-grill` (or `design-grill` if it's genuinely cross-cutting), and don't force the small format onto a big problem. Needing far more than 5 questions to reach alignment is itself a signal you're in the wrong skill.

---

## 2. What to do

Run a focused interview to reach shared understanding, then write the plan.

- **Hard cap: at most 5 questions to the user.** This is a ceiling, not a target — ask fewer when fewer suffice. The cap forces you to spend questions only on what matters.
- **Read before you ask.** If the codebase, an existing pattern, CONTEXT.md, or a prior doc can answer something, go find out instead of asking. A question spent on something you could have read is a wasted question out of your budget of 5.
- **One question at a time.** Wait for the answer before moving on; later questions often depend on earlier answers.
- **Recommend a default for every question.** Don't just ask what the user wants — propose the answer you'd pick and a one-line why, so they can accept, tweak, or reject. Most "simple" features should be confirmations, not open prompts.
- **Cross-reference claims with code.** When the user says "the app already does X," verify it where you can. If the code disagrees, surface the contradiction immediately rather than planning on a false premise.

Use this shape per question:

```text
Question: {single question}
Why it matters: {one line}
Recommended default: {your pick, and why in a few words}
```

---

## 3. What to grill on (pick only what's unresolved, ≤5 total)

These are the high-value areas for a small change, in priority order. Ask about an area **only** if it's genuinely unclear and not answerable from the code — skip the ones the codebase already settles.

1. **Intent & end state** — what "done" looks like as observable behavior. *What should the user see/be able to do, and how do we know it's correct?* This is the #1 source of rework; resolve it first.
2. **Location & pattern to mirror** — which file/component/page/function this lives in, and which existing pattern the executor should copy. Cite the real path.
3. **Inputs / outputs / data shape** — props, params, state, request/response or query shape. Small surface, high friction if wrong.
4. **Edge cases & failure modes** — empty, loading, error, validation, permissions. Small features most often break here precisely because these get skipped.
5. **Scope edge** — what is explicitly *not* included, and what existing behavior must not break.

You will rarely need all five as questions; several are usually answered by reading the code or are obvious from the request. The list is a checklist of what alignment must cover, not a script to read aloud.

---

## 4. CONTEXT.md — light, lazy, optional

At the start, glance for `CONTEXT.md` (and `CONTEXT-MAP.md` if the repo has multiple contexts) so your terminology matches the project's.

- If, during the session, a domain term gets clarified or newly pinned down, update `CONTEXT.md` **inline, right then** — don't batch it. Keep it a glossary only: a tight definition and, opinionatedly, the words to avoid for the same concept (format below). No implementation details.
- **Don't create `CONTEXT.md` unless there's something real to write.** Most simple changes add nothing to it; "None" is a perfectly normal outcome.
- **No ADRs here.** This skill doesn't produce ADRs. If a decision feels ADR-worthy (hard to reverse + surprising later + a genuine trade-off), that's your cue to escalate (see §1), not to write one inside a "simple" plan.

**`CONTEXT.md` format.** Use this unless the repo already has a different convention:

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

## 5. Produce the reduced implementation plan

Once you and the user are aligned, write the plan. It must keep the intent, a clear description of the work, and — most importantly — **a visible record of the alignment reached**. That alignment section is what distinguishes this from a bare task list.

Calibrate tasks at mid-low altitude (same as the full plan): name the file, the symbol/signature, the concrete change, and the acceptance criterion — but stop before writing the finished code. Ground every path in the real codebase; mark new files `[NEW]`.

Because the scope is small, **don't split into phases** by default — a single ordered list of steps is almost always right. Order matters only where there's a real hazard (e.g. a migration before the code that reads the new column); call those out, skip ceremony otherwise.

---

## 6. The reduced plan

Write the plan using the structure below — a flat, phase-free subset of the implementation-plan structure. Never drop **Alignment reached**, **Scope**, or **Execution steps** — the alignment record is what makes this a grilling output rather than a bare task list. Because the scope is small, don't split into phases; a single ordered step list is almost always right, with ordering hazards called out explicitly.

### Structure

```md
# Simple Plan: {Feature / Change Name}

## 1. Objective & intent
- **Done means:** {verifiable end state}
- **Why:** {the intent / reason}
- **For:** {AI coding agent / developer}

## 2. Alignment reached
| Topic | Decision | Source |
| --- | --- | --- |
| {e.g. empty-state behavior} | {what we agreed} | {user / code / default accepted} |

## 3. Scope
- **In scope:** {what this delivers}
- **Out of scope / non-goals:** {what the executor must NOT do}
- **Must not change / break:** {behavior/contract/invariant to preserve}

## 4. Context & integration points
{Where it lives, with real paths. The existing pattern to mirror (cite it). Any constraint found in the code.}

## 5. Execution steps (ordered)
1. **{step name}**
   - **File(s):** `{path}` (`[NEW]` if new)
   - **Symbol / signature:** `{function / component / type / endpoint + shape}`
   - **Change:** {what to do, operationally — not the finished code}
   - **Acceptance:** {how we know this step is done and correct}
2. **{step name}** …

{Note any ordering hazard explicitly. No phases unless genuinely needed.}

## 6. Edge cases & pitfalls
- {specific edge case or hazard — empty, error, validation, permissions, an easy-to-miss companion edit, etc.}

## 7. Testing & validation
- **Tests to add/update:** {file + what it asserts}
- **Commands:** `{test}`, `{lint}`, `{type-check}` as applicable
- **Manual check:** {steps}
- **Success criteria:** {what counts as passing}

## 8. Open questions & assumptions
- **Open (with default):** {anything unresolved + the default to proceed on}
- **Assumptions:** {each assumption + what to do if false}

## 9. CONTEXT.md updates
{Glossary terms added/updated this session, or "None."}
```

## 7. Output location

Save the plan inside the current workspace (never an OS temp dir, never outside the workspace):

```text
./tmp/simple-plan-{feature-slug}.md
```

Create `./tmp/` if needed; use a lowercase kebab-case slug from the feature name. If the repo already has a plan convention (e.g. `docs/plans/`), follow it instead. After saving, present the file with `present_files` if that tool is available.

---

## 8. Quality checklist & guardrails

Before delivering, confirm:

- **Alignment is visible.** §2 of the plan captures the decisions reached, not just tasks.
- **You stayed within budget.** At most 5 questions; everything else came from the code or sensible defaults.
- **Right altitude.** Each step has file + symbol + change + acceptance — never the finished code, never a vague goal.
- **Real paths.** Every cited path/symbol exists or is marked `[NEW]`.
- **Scope is unmistakable.** In / out / must-not-break are clear.
- **Edge cases named.** The real ones for this change, not boilerplate.
- **Still simple.** If it stopped being simple during the session, you escalated instead of forcing this format.

Do **not**: balloon this into the full `implementation-plan` document; exceed 5 questions; grill a genuinely large or cross-cutting feature with this skill; write ADRs here; fabricate file paths; or omit the alignment record, scope, or must-not-break guardrails.