---
name: q-code-grill-feature
description: "Align a bounded but non-trivial feature through a dialogue and end with a durable execution-ready implementation plan. Use when work has meaningful behavior or dependencies but does not require system-wide architecture and material behavior, scope, integration, or acceptance questions are still open; use q-code-implementation-plan instead when direction is already settled and only the file-level sequence is missing. Escalate to q-code-grill-design or de-escalate to q-code-grill-simple as scope changes. Part of the Quasar AI delivery skills."
---

# Feature grill

This is the middle refinement level. Inspect the real repository and existing domain language before asking questions.

Read the `q-core-contract` companion for shared governance and its stage-result schema; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Procedure

1. Confirm the objective, user-visible outcome, source backlog or requirement IDs, and must-not-break behavior.
2. Map current modules, flows, data, contracts, tests, the referenced technical foundation when available, and applicable decisions. For interface work, load the exact `design_system_ref` version and plan against its tokens, components, states, and accessibility contracts; route a needed new reusable pattern to `q-plan-design-system` rather than defining it here.
3. Resolve only material questions about behavior, scope, integration, edge cases, authorization, failure, migration, rollout, and acceptance.
4. Challenge fuzzy terminology and update project context only when a durable term changes.
5. Offer an ADR only for a durable architectural decision.
6. Produce an ordered implementation plan grounded in exact files, functions, data, dependencies, and tests — the same artifact type and content that `q-code-implementation-plan` writes, plus this grill's alignment record.
7. Validate the plan with the user. Route any material stack selection not already settled to `q-plan-tech-foundation`.

When `bounded-feature-has-material-physical-schema-or-migration-risk` and `q-tool-database-schema` is installed, use `physical-design` or `migration-design` after the feature behavior and database profile are settled. Incorporate accepted steps and risks into this skill's execution-ready plan; do not persist the tool result separately. If the tool is absent, `continue-with-repository-grounded-feature-planning-and-record-the-specialist-database-gap`.

## Durable output

Create one `Working` implementation plan: the same artifact type `q-code-implementation-plan` writes (`implementation-plan`, canonical for `planned-execution`) with the same required content — objective, target outcome, source references, scope, non-goals, deferred work, current context, approach, assumptions, file map, ordered phases and tasks, cross-cutting concerns, pitfalls, testing, rollout and rollback, documentation, risks, open questions, definition of done, and executor instructions — plus this grill's alignment record: resolved questions, rejected options, and any durable terminology change.

Do not add an execution log. When execution begins, `q-code-implement` updates the original ticket or execution record, not this plan as a work diary.

## Stage result

Return a valid `stage_result`: the implementation plan in `authored_outputs` with its type, path, `Working` lifecycle, and source item ID; the backlog item, issue, or requirement it refines in `traceability_delta`; any ADR or durable decision in `decisions_added_or_updated`; a planning artifact the aligned scope contradicts under `stale_artifacts` with the proposed change, never restated as canonical here; a stack selection routed to `q-plan-tech-foundation` or a reusable pattern routed to `q-plan-design-system` in `next_recommended_action` or `required_user_actions`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the plan as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
