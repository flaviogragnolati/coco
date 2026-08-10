---
name: q-code-grill-feature
description: "Align a bounded but non-trivial feature and produce a durable execution-ready implementation plan. Use when work has meaningful behavior or dependencies but does not require system-wide architecture; escalate to q-code-grill-design or de-escalate to q-code-grill-simple as scope changes. Part of the Quasar AI delivery skills."
---

# Feature grill

This is the middle refinement level. Inspect the real repository and existing domain language before asking questions.

## Procedure

1. Confirm the objective, user-visible outcome, source backlog or requirement IDs, and must-not-break behavior.
2. Map current modules, flows, data, contracts, tests, the referenced technical foundation when available, and applicable decisions.
3. Resolve only material questions about behavior, scope, integration, edge cases, authorization, failure, migration, rollout, and acceptance.
4. Challenge fuzzy terminology and update project context only when a durable term changes.
5. Offer an ADR only for a durable architectural decision.
6. Produce an ordered implementation plan grounded in exact files, functions, data, dependencies, and tests.
7. Validate the plan with the user. Route any material stack selection not already settled to `q-plan-tech-foundation`.

## Durable output

Create one `Working` feature implementation plan. Include objective, alignment, scope and non-goals, current context, approach, assumptions, ordered phases and tasks, cross-cutting concerns, pitfalls, testing, rollout and rollback, documentation, risks, open questions, definition of done, and instructions for execution.

Do not add an execution log. When execution begins, `q-code-implement` updates the original ticket or execution record, not this plan as a work diary.
