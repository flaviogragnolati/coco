---
name: q-code-implementation-plan
description: "Produce a concrete, repository-grounded execution plan for settled work without writing code. Use to plan a feature, refactor, migration, integration, or fix after direction is known — behavior, scope, and integration already decided — with ordered file-level steps, acceptance criteria, testing, rollout, and rollback; when material behavior or scope questions are still open, use q-code-grill-feature for bounded work or q-code-grill-design for cross-cutting work instead. Part of the Quasar AI delivery skills."
---

# Implementation plan

Use this skill when architecture and product direction are settled and no material behavior, scope, or integration question is open. Return to `q-code-grill-design` or `q-code-grill-feature` when material design or alignment decisions remain. A grill that ends in a plan writes this same `implementation-plan` artifact; do not write a second plan for the same item.

Read the `q-core-contract` companion for shared governance and its stage-result schema; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Inputs

Accept a backlog item, issue, ticket, architecture document, specification, or explicit request. Preserve source IDs and constraints.

## Procedure

1. Inspect repository instructions, the applicable technical foundation and adopted guidance, the exact `design_system_ref` version for interface work, relevant code, tests, schemas, migrations, and docs.
2. Lock objective, scope, non-goals, deferred work, and must-not-break behavior.
3. Choose the implementation approach and strict sequence.
4. Map the files to create, modify, and test with each file's responsibility, then break work into phases and tasks grounded in that map plus exact functions, data, and dependencies. Take module boundaries from the settled design; do not redesign them here.
5. Identify pitfalls, compatibility concerns, migrations, observability, security, and rollback.
6. Trace the item's acceptance criteria into task-level criteria and proportional verification using commands discovered from the project rather than assumed tooling; add a criterion only for a gap the item left and flag it for the backlog's next targeted-refinement.
7. Mark assumptions and blockers honestly.
8. Self-review the draft against its source before writing it: every source requirement and acceptance criterion maps to a task; every task is executable cold, so a step the executor cannot act on ("add appropriate error handling", "same as task N", a name no task defines) is a defect to fix, not an open question; and every name, signature, path, and schema a task defines matches what later tasks use.
9. Write one durable `Working` plan.

When `settled-work-needs-engine-specific-schema-or-migration-sequencing` and `q-tool-database-schema` is installed, use `schema-review` to ground the current relational state, `document-model-review` for a document model, or `migration-design` for the proposed transition. Supply exact repository evidence and the confirmed profile. Incorporate accepted sequencing, validation, recovery, and execution ownership into this plan; keep the specialist analysis transient. If the tool is absent, `continue-with-observed-repository-evidence-and-mark-the-specialist-database-gap`.

## Required content

Include objective, target outcome, source references, scope, non-goals, deferred work, current system context, approach, assumptions, file map, ordered phases, detailed tasks naming the contracts they define or consume, cross-cutting concerns, pitfalls, testing, rollout and rollback, documentation, risks, open questions, definition of done, and executor instructions.

This plan is not an implementation diary. It may be baselined, archived, or superseded. If tickets later absorb execution, `q-code-implement` updates the tickets rather than appending a parallel execution log here.

## Stage result

Return a valid `stage_result`: the plan in `authored_outputs` with its type, path, and `Working` lifecycle; source IDs in `traceability_delta`; honest assumptions and blockers in `warnings` and `blockers`; a specialist database gap as a `warning`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the plan as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
