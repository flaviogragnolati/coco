---
name: implementation-plan
description: Produce a concrete execution/implementation plan that an AI coding agent or developer can implement without redoing discovery. Use when the user asks to plan, spec out, scope, or break down a feature, change, refactor, migration, integration, bugfix, or implementation task—especially when coding should begin from the plan. Use after architecture/discovery is settled, such as after design-grill or feature-grill, or standalone when the work is already understood. Output must define objective, scope, non-goals, deferred items, assumptions, dependencies, phased and strictly sequenced steps, file/function/data-level changes, pitfalls, acceptance criteria, testing, and rollout. Do not use for open-ended architecture exploration; use design-grill instead. This skill assumes direction is known and focuses on how to implement it.
argument-hint: "What feature, change, refactor, migration, or task should the execution plan cover?"
---

# implementation-plan

Use this skill to turn a known, well-understood piece of work into a **mid-to-low-level execution plan** that another agent — typically an AI coding agent — can pick up and implement directly.

The plan is the deliverable. It is not the implementation. The goal is to do all the thinking, sequencing, grounding, and scoping *now*, so the executing agent spends its effort writing correct code rather than rediscovering context, guessing at file locations, or making architectural decisions that should already be settled.

A good plan from this skill lets an executing agent answer, for every step: *what file do I touch, what exactly do I change, what does "done" look like, what must I not break, and what comes next.*

---

## 1. What this skill is and is not

This skill sits **below architecture and above code**.

| Skill | Level | Question it answers |
| --- | --- | --- |
| `design-grill` | High | *What is the right architecture? Which module owns this? What pattern, what boundaries, what tradeoffs?* (grills, then emits a durable architecture document) |
| `feature-grill` | Mid | *What exactly should this feature do, and what's the plan?* (grills a feature, then emits an implementation plan) |
| `simple-grill` | Low | *Small contained change — quick alignment, then a reduced plan.* (grills briefly) |
| **`implementation-plan`** (this) | **Mid–low** | ***How exactly do we build this, step by step, file by file, so an agent can execute it?*** (no grilling — assumes direction is known) |

The three `*-grill` skills **interview you to reach alignment first**, then produce their artifact. This skill does **not** grill — it assumes the direction is already settled (by a grilling session, an existing design document, or a clear request) and turns it into an executable plan. If alignment isn't there yet, run the matching grill first. Note that `feature-grill` and `simple-grill` already emit an implementation plan (full and reduced); reach for this skill directly when the work is understood and you just need the plan.

This skill **is** for:

* Producing concrete, sequenced execution steps grounded in the real codebase.
* Specifying the files, functions, signatures, data shapes, and call sites involved.
* Defining precise scope, non-goals, pitfalls, and per-step acceptance criteria.
* Making the work safe to hand to an autonomous coding agent.

This skill **is not** for:

* Exploring or deciding architecture. If the architecture is unsettled, stop and run `design-grill` first.
* Writing the actual production code. That is the executing agent's job. This plan tells it *what* and *in what order*, not the final line-by-line source.
* Producing tickets, sprint boards, or estimates as the primary output (a task breakdown is part of the plan, but the plan is engineering-facing, not project-management-facing).
* Reproducing a full conversation or a discovery transcript.

If the architectural direction is genuinely unknown, say so plainly and recommend `design-grill` before continuing. Do not invent architecture under the guise of planning.

---

## 2. What "mid-to-low level" means (read this carefully)

The single most common failure of an execution plan is landing at the wrong altitude. Too high and the executing agent has to make decisions it shouldn't; too low and you've written the code for it (badly, blind, and ahead of time).

Calibrate every task to **mid-low**: concrete enough to remove ambiguity, abstract enough to leave implementation craft to the executor.

**Too high (belongs in `design-grill`, not here):**

> Add a caching layer to improve user-lookup performance.

**Mid-low (this skill — correct):**

> Add `getCachedUser(id: string): Promise<User | null>` in `src/users/cache.ts`, backed by the existing `RedisClient` from `src/cache/redis.ts`. Key format `user:{id}`, TTL 300s. On cache miss, fall through to `userRepository.findById` (`src/users/repository.ts:88`) and populate. Invalidate in `updateUser()` (`src/users/service.ts:142`) by calling `cache.del('user:' + id)` *after* the DB transaction commits, not before. Wire `getCachedUser` into `GET /users/:id` (`src/users/controller.ts:34`), replacing the direct repository call.

**Too low (this is the executor's job, not yours):**

> ```ts
> export async function getCachedUser(id: string): Promise<User | null> {
>   const cached = await redis.get(`user:${id}`);
>   if (cached) return JSON.parse(cached);
>   const user = await userRepository.findById(id);
>   if (user) await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 300);
>   return user;
> }
> ```

Rule of thumb: name the file, the symbol, the call site, the data shape, the ordering constraint, and the acceptance criterion. Stop before writing the function body. If a short type definition, signature, or 3–5 line pseudocode sketch removes real ambiguity, include it — but never ship the finished implementation.

---

## 3. Operating mode

### 3.1 Ground every claim in the real codebase

Do not plan against an imagined repository. Before writing tasks, inspect the actual code, schemas, configs, tests, and existing patterns. Every file path, symbol name, and call site you cite must be real (or explicitly marked as new with `[NEW]`). A plan full of plausible-but-wrong paths wastes the executing agent's time and erodes trust in the whole document.

When you reference an existing pattern the executor should copy ("follow the shape of the existing `OrdersController`"), confirm that pattern actually exists and cite where.

### 3.2 Consume upstream inputs instead of re-deriving them

If an architecture document, ADR, discovery/grilling output, PRD, design doc, or prior plan exists, read it and treat its settled decisions as settled. Reference those artifacts; do not re-litigate or duplicate them. Pull from them: the chosen approach, ownership, boundaries, non-goals, and constraints.

If `design-grill` produced `docs/architecture/features/{slug}.md`, that document is the primary architectural source of truth — read it first and build the plan on top of it.

### 3.3 Ask only essential questions, and only blocking ones

This is not a grilling skill. Do not interview the user relentlessly. Explore the codebase and upstream docs first; ask the user only when a decision genuinely blocks planning and cannot be answered from available evidence.

When you must ask, prefer the interactive option list over a wall of prose questions, keep it to the few decisions that actually matter, and provide a recommended default for each so the user can simply confirm. Anything non-blocking becomes an explicit assumption or an open question in the document, not a reason to stall.

### 3.4 Sequence everything

An AI agent executes roughly linearly and benefits enormously from an unambiguous order. For every phase and task, make dependencies explicit: *do X before Y because Y imports the type X defines* / *run the migration before deploying the code that reads the new column*. If two tasks can run in parallel, say so; if one must precede another, say why. Ordering hazards are first-class content, not an afterthought.

### 3.5 Make it self-contained

The executing agent should be able to finish without coming back to ask questions. Everything it needs must be in the plan or pointed to precisely (a file path, a doc section, an existing example to mirror). Bake assumptions in explicitly rather than leaving silent gaps.

### 3.6 Be honest about uncertainty

If you don't know something, classify it (blocking question, non-blocking question, optional refinement, or assumption) rather than papering over it with a confident guess. A plan that hides its unknowns is more dangerous than one that names them.

---

## 4. Inputs this skill accepts

Tailor the plan to whatever is available. Typical inputs, in rough order of usefulness:

* An architecture document from `design-grill` (`docs/architecture/features/{slug}.md`).
* A discovery/grilling output from `feature-grill` or `simple-grill`.
* A PRD, design doc, ADR set, or written requirements.
* A direct feature/change/refactor request from the user.
* The codebase itself (always — even with the above, the codebase is the ground truth).

If the user passed an argument to the skill, treat it as the intended focus and scope the plan accordingly.

---

## 5. Procedure

Work through these steps. Lean on the codebase and upstream docs; involve the user only for genuinely blocking decisions.

### Step 1 — Establish the target and objective

Pin down precisely what must exist when the work is done, and why. Capture the concrete end state (what an outside observer could verify), not a vague aspiration. If the objective is fuzzy and can't be sharpened from available evidence, that's a blocking question.

### Step 2 — Ground in the codebase

Inspect the repository to understand current state and locate everything the plan will touch. Useful targets:

* Entry points, routes, controllers, and the modules relevant to the feature.
* Domain/application/service layers and the existing patterns they follow.
* Data layer: schema files, migrations, models, repositories.
* Config, environment variables, feature flags, secrets handling.
* Tests covering the area (these reveal conventions and expected behavior).
* Build, lint, type-check, and CI configuration (these define "passing").
* The closest existing feature with a similar shape — the executor should usually mirror it.

Cross-check any assumption (the user's or an upstream doc's) against the actual code. If the code contradicts a stated assumption, surface it immediately rather than planning on a false premise.

### Step 3 — Lock scope

Define scope sharply in four buckets. The user explicitly cares about this; do not skimp.

* **In scope** — what this plan delivers.
* **Out of scope / non-goals** — work deliberately excluded, so the executing agent does not gold-plate or wander. Be specific ("does not touch the billing module", "no UI changes", "no new public API").
* **Deferred** — plausibly next, but explicitly not now and not allowed to drive the current design.
* **Must not change / must not break** — existing behavior, contracts, files, or invariants the executor must preserve. These are guardrails for an autonomous agent.

### Step 4 — Choose the implementation approach and overall sequencing

Decide the executor-facing strategy: e.g. schema/migration-first, scaffold-then-fill, test-first, vertical-slice-then-iterate, refactor-first-then-feature, strangler/parallel-path for risky migrations. Justify it briefly. Then lay out the high-level order of phases and the key dependencies between them.

### Step 5 — Decompose into phases, then tasks

Break the work into a small number of coherent phases (each a meaningful, independently verifiable milestone), then break each phase into concrete tasks. Keep tasks small enough to be unambiguous but large enough to be meaningful. Make intra- and inter-phase dependencies explicit.

### Step 6 — Specify each task at mid-low level

For every task, supply (see §2 for the altitude):

* The exact file(s) affected, with real paths; mark new files `[NEW]`.
* The specific symbols (functions, classes, types, endpoints) to add or change, with signatures/shapes where they remove ambiguity.
* The concrete change, described operationally — not the finished code.
* Ordering constraints relative to other tasks.
* Which existing pattern/example to mirror, cited by path.
* **Acceptance criteria**: how the executor (and a reviewer) knows the task is done and correct — a passing test, a specific response shape, a successful migration, a type-check that compiles.
* **Pitfalls for this task**: the easy-to-miss step or the thing that breaks (see §6).

### Step 7 — Surface pitfalls and gotchas

Call out, specifically and concretely, the things that trip up implementation here. See §6 for the catalog. Generic advice ("write clean code") is worthless; specific hazards ("the barrel file `src/users/index.ts` must re-export the new symbol or imports elsewhere fail at build, not runtime") are the highest-value content in the document.

### Step 8 — Define validation and testing

Specify how each phase and the whole feature is validated: which tests to add or update (and roughly what they assert), commands to run (`{test}`, `{lint}`, `{type-check}`, `{build}`), manual checks, regression risks, and what counts as success.

### Step 9 — Write the durable document

Generate the plan using the structure in §7 and the template in §10.

---

## 6. Pitfalls and gotchas — what to hunt for

A plan that names the landmines is worth several that don't. For the specific work at hand, deliberately look for and document hazards such as:

* **Ordering hazards** — migration must run before the code that reads the new column; a type must be defined before its consumers; a feature flag must exist before the gated code ships.
* **Easy-to-miss companion edits** — barrel/index re-exports, dependency-injection registration, route registration, config or `.env.example` updates, schema-to-type regeneration, generated-client updates, lockfile changes.
* **Backward compatibility** — existing callers, persisted data, public/external contracts, in-flight records, old clients during rollout.
* **Consistency and side effects** — what must happen inside vs after a transaction, idempotency, retries, duplicate events, cache invalidation, race conditions.
* **Library/version quirks** — API that changed across versions, peer-dependency constraints, ESM/CJS interop, async pitfalls (missing `await`, unhandled rejection).
* **Boundary and typing traps** — nullability, timezones and date handling, encoding, pagination limits, partial failure.
* **Test/CI traps** — fixtures or seed data that need updating, flaky areas, snapshot updates, coverage gates, lint rules that will reject the change.
* **Security/permissions** — authorization checks at the new entry point, secret handling, input validation, data exposure in logs or responses.
* **Performance** — N+1 queries, missing indexes, unbounded loads, hot paths.

Only include hazards that are real for this work. Empty boilerplate hazards are noise.

---

## 7. Required document structure

Produce the plan with the following sections. Keep it concise where possible but operationally complete — the executing agent should be able to start without redoing discovery. Use tables and numbered lists where they improve execution clarity. Reference upstream artifacts instead of duplicating their content.

1. **Objective and target outcome** — what must exist when done, the verifiable end state, who/what the plan is for (an AI coding agent unless stated otherwise), and the intended use.
2. **Scope** — in scope; out of scope / non-goals; deferred; must-not-change / must-not-break guardrails.
3. **Current system context** — relevant existing modules, entry points, data models, patterns, and constraints found in the codebase, with real paths.
4. **Inputs, artifacts, and references consulted** — architecture docs, ADRs, PRDs, prior plans, schemas, key code files, external docs. For each: path/identifier, relevance, and status (source of truth / supporting / historical / deprecated). Note unknown paths explicitly; do not fabricate.
5. **Implementation approach and strategy** — chosen approach and why, overall phase ordering, dependency management, how regressions are avoided, how correctness is validated.
6. **Assumptions** — each assumption, why it's reasonable, what would invalidate it, and what the executor should do if it proves false. Do not bury assumptions inside task descriptions.
7. **Phased execution plan** — for each phase: objective, scope, ordered tasks, inputs required, outputs expected, dependencies, validation criteria, and completion criteria.
8. **Detailed task breakdown** — the mid-low-level core (see §2 and Step 6). For each task: ID, name, files affected (real paths; `[NEW]` for new), symbols and signatures/shapes, the concrete change, preconditions, ordered steps, dependencies, acceptance criteria, and task-specific pitfalls. Format so it can be turned into tickets or agent prompts directly.
9. **Cross-cutting concerns** — data/schema/migration/backfill; config/env/feature flags; security/permissions; observability (logs, metrics, tracing). Only the parts that apply.
10. **Pitfalls and gotchas (global)** — the cross-task hazards from §6 that apply, stated concretely.
11. **Testing and validation plan** — tests to add/update and what they assert; commands to run; manual checks; regression risks; success criteria per area.
12. **Rollout, migration, and rollback** — sequence, compatibility, feature-flag/cutover strategy, rollback conditions and procedure, post-release monitoring. If not applicable, say why.
13. **Documentation updates required** — what docs/READMEs/ADRs/runbooks must change and where.
14. **Risks and tradeoffs** — each risk: why it matters, likelihood/impact if inferable, mitigation, and whether it affects sequencing/testing/rollout.
15. **Open questions** — split into blocking (must resolve before execution), non-blocking (resolve during execution), and optional refinements. For each: why it matters, who/what resolves it, and a recommended default so execution can proceed.
16. **Definition of done** — the explicit, checkable conditions that mean the whole feature is complete and correct.
17. **Instructions for the executing agent** — how to use this plan, what to read first, what decisions to respect, what it must not change, what to verify before modifying, and how to report progress. Make these precise enough to use directly.
18. **Redactions and sensitivity notes** — note and redact any secrets/PII/credentials/private data with placeholders; if none were found, say so.

---

## 8. Output location

Save the plan inside the current workspace, not the OS temp directory and not outside the workspace.

Default:

```text
./tmp/implementation-plan-{feature-slug}.md
```

Create `./tmp/` if it does not exist. Use a stable, lowercase, kebab-case slug derived from the feature name (for example `./tmp/implementation-plan-user-cache.md`).

If the repository already has a convention for plans (for example `docs/plans/`, `.plans/`, or a planning directory referenced by an upstream doc), follow that convention instead. The plan is a working document the executing agent consults during implementation; it can be archived or removed once the work ships. Never save it to a system temp directory.

After saving, if the `present_files` tool is available, present the file to the user.

---

## 9. Prohibited behaviors

Do not:

* Explore or invent architecture under the guise of planning — if the architecture is unsettled, recommend `design-grill` first.
* Write the finished production code as the plan (see §2 — stop before the function body).
* Land tasks at the wrong altitude (too vague to act on, or so detailed they replace the executor's judgment).
* Cite file paths, symbols, or patterns that don't exist — verify against the codebase or mark items `[NEW]`.
* Re-litigate or duplicate decisions already settled in an upstream architecture/discovery doc — reference them.
* Reproduce a full conversation or discovery transcript.
* Interview the user relentlessly — ask only blocking questions, with recommended defaults.
* Hide assumptions inside task descriptions, or treat unresolved questions as settled.
* Omit pitfalls, ordering hazards, scope boundaries, or "must not break" guardrails.
* Save the plan to `~`, an OS temp directory, or anywhere outside the workspace.
* Ship a plan an agent would have to stop and ask questions to execute.

---

## 10. Completion criteria

The skill is complete when:

* The objective and verifiable target outcome are clear and specific.
* Scope is locked into in / out / deferred / must-not-break.
* The plan is grounded in the real codebase, with real paths and a current-state summary.
* Upstream artifacts are referenced (not duplicated), and contradictions with the code were surfaced.
* Work is decomposed into ordered phases and mid-low-level tasks, each with acceptance criteria and dependencies.
* Pitfalls/gotchas, testing/validation, and (where applicable) rollout/rollback are captured concretely.
* Assumptions and open questions are explicit and classified by blocking level.
* A definition of done and precise instructions for the executing agent are included.
* The document is saved to `./tmp/implementation-plan-{feature-slug}.md` (or the repo's plan convention) and is detailed enough for an AI coding agent to implement without redoing discovery.

---

## 11. Quality checklist before delivering

Run this final pass before presenting the plan:

* **Altitude** — is every task mid-low (file + symbol + change + acceptance criterion), never the finished code and never just a vague goal?
* **Reality** — does every cited path/symbol exist, or is it clearly marked `[NEW]`?
* **Sequence** — could an agent execute top-to-bottom without hitting an ordering surprise? Are dependencies explicit?
* **Self-containment** — could the agent finish without asking a question that isn't already an explicit open question?
* **Scope guardrails** — are out-of-scope and must-not-break items unmistakable?
* **Pitfalls** — are the real, specific hazards named (not boilerplate)?
* **Done** — can someone objectively verify the feature is complete from the definition of done?

---

## 12. Template

Use this template for the file at `./tmp/implementation-plan-{feature-slug}.md` (or the repo's plan convention). Drop sections that genuinely do not apply, but do not silently omit scope, pitfalls, or the executing-agent instructions.

````markdown
# Implementation Plan: {Feature / Capability Name}

## 1. Objective and target outcome

- **What must exist when done:** {verifiable end state}
- **Why:** {reason this work is happening}
- **For:** {AI coding agent / developer}
- **Intended use:** {how this plan is used}

## 2. Scope

### 2.1 In scope
- {item}

### 2.2 Out of scope / non-goals
- {item the executor must NOT do}

### 2.3 Deferred
- {plausibly next, but not now}

### 2.4 Must not change / must not break
- {existing behavior, contract, file, or invariant to preserve}

## 3. Current system context

{Relevant existing modules, entry points, data models, and patterns, with real paths and any constraints found in the code.}

## 4. Inputs, artifacts, and references consulted

| Source | Path / identifier | Relevance | Status |
| --- | --- | --- | --- |
| `{name}` | `{path/URL/unknown}` | `{why it matters}` | `{source of truth / supporting / historical / deprecated}` |

## 5. Implementation approach and strategy

{Chosen approach and why; overall phase ordering and key dependencies; how regressions are avoided; how correctness is validated.}

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| `{assumption}` | `{reason}` | `{invalidator}` | `{action}` |

## 7. Phased execution plan

### Phase 1 — {Name}

**Objective:** {purpose of the phase}

**Tasks:**
1. {task}
2. {task}

**Dependencies:** {what must precede this phase}

**Validation criteria:** {how this phase is verified}

**Completion criteria:** {what "phase done" means}

{Repeat for each phase.}

## 8. Detailed task breakdown

### {Task ID} — {Task name}

- **Files affected:** `{path}` (`[NEW]` if new)
- **Symbols / signatures:** `{function/class/type/endpoint + signature or shape}`
- **Change (operational, not finished code):** {what to do}
- **Mirror this existing pattern:** `{path to example, if any}`
- **Preconditions / depends on:** {task IDs or conditions}
- **Steps:**
  1. {step}
  2. {step}
- **Acceptance criteria:** {passing test / response shape / migration result / type-check}
- **Pitfalls for this task:** {specific hazard}

{Repeat for each task. Keep entries directly convertible into tickets or agent prompts.}

## 9. Cross-cutting concerns

- **Data / schema / migration / backfill:** {details or N/A}
- **Config / env / feature flags:** {details or N/A}
- **Security / permissions:** {details or N/A}
- **Observability (logs / metrics / tracing):** {details or N/A}

## 10. Pitfalls and gotchas (global)

- {cross-task hazard, stated concretely}

## 11. Testing and validation plan

- **Tests to add/update:** {file + what it asserts}
- **Commands to run:** `{test}`, `{lint}`, `{type-check}`, `{build}`
- **Manual checks:** {steps}
- **Regression risks:** {areas}
- **Success criteria:** {what counts as passing}

## 12. Rollout, migration, and rollback

{Sequence, compatibility, feature-flag/cutover strategy, rollback conditions and procedure, post-release monitoring. State N/A and why if not applicable.}

## 13. Documentation updates required

- {doc/README/ADR/runbook to change, and where}

## 14. Risks and tradeoffs

| Risk | Why it matters | Likelihood | Impact | Mitigation | Affects sequencing/testing/rollout |
| --- | --- | --- | --- | --- | --- |
| `{risk}` | `{why}` | `{low/med/high/unknown}` | `{low/med/high/unknown}` | `{mitigation}` | `{area}` |

## 15. Open questions

### 15.1 Blocking
| Question | Why it matters | Resolver | Recommended default |
| --- | --- | --- | --- |
| `{question}` | `{why}` | `{who/what}` | `{default}` |

### 15.2 Non-blocking
| Question | Why it matters | Resolver | Recommended default |
| --- | --- | --- | --- |
| `{question}` | `{why}` | `{who/what}` | `{default}` |

### 15.3 Optional refinements
- `{idea that may improve the design but is not required}`

## 16. Definition of done

- [ ] {objectively checkable condition}
- [ ] {objectively checkable condition}

## 17. Instructions for the executing agent

- Use this plan as the primary source for implementation.
- Read first: {required files/docs}.
- Respect these settled decisions: {list}.
- Do not change: {guardrails from §2.4}.
- Verify before modifying: {what to confirm against the code}.
- Execute phases in order; honor task dependencies.
- Implement at the level the plan specifies — write the code the tasks describe; do not re-architect.
- If a blocking question is unresolved, stop and ask; for non-blocking gaps, proceed using the stated default and note the assumption.
- Report progress by {phase/task completion + which acceptance criteria passed}.

## 18. Redactions and sensitivity notes

{State whether secrets/PII/credentials/private data were encountered and how they were redacted, using placeholders like `[REDACTED_SECRET]`. If none, say so explicitly.}
````