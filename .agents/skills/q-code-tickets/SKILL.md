---
name: q-code-tickets
description: "Optionally convert settled work into durable, traceable tickets for multiple executors, sessions, or tracker coordination. Use when distribution adds value; a single executor may proceed directly from a ready backlog item, issue, or implementation plan. Part of the Quasar AI delivery skills."
---

# To tickets

Read `TRACKERS.md` when resolving a tracker. Ticket creation is optional.

Read the `q-core-contract` companion for shared governance and its stage-result schema; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Gate

Use this skill only when work needs distribution, a tracker, multiple executors, or cold-start continuity. Otherwise continue directly to `q-code-implement`.

Obtain explicit authorization before publishing to an external tracker. When no tracker is used, create versioned Markdown tickets in the project.

## Procedure

1. Load the settled source and preserve backlog, requirement, decision, and plan IDs.
2. Confirm tracker, publication mode, and distribution boundary.
3. Cut vertical tracer-bullet tickets with explicit dependency edges.
4. Make each ticket executable cold: objective, context, scope, non-goals, affected areas, guardrails, acceptance criteria, verification, dependencies, and source links. Carry the exact `design_system_ref` version into any interface ticket, because a cold executor cannot infer the design contracts from the ticket alone.
5. Self-check the set before review: every source requirement and acceptance criterion maps to a ticket, no ticket contains a step a cold executor cannot act on, and names, signatures, paths, and schemas match across tickets. Then review coverage and sequencing with the user.
6. Publish or write only after the required approval.
7. Record created ticket IDs back in the originating backlog or plan.

Tickets are durable `Working` execution records. `q-code-implement` updates each original ticket with status, change summary, acceptance coverage, tests, mini-review result, deviations, and follow-ups. It does not create a parallel durable summary.

Ticket creation never stages or commits repository changes. A later commit is a separate Git operation outside this skill and requires its own explicit authorization.

## Stage result

Return a valid `stage_result`: each created ticket in `authored_outputs` with its tracker ID or Markdown path, `Working` lifecycle, and `execution-ticket` type; the originating backlog item or plan that now carries the ticket IDs in `updated_outputs`; source IDs in `traceability_delta`; a pending tracker publication in `required_user_actions` — never report an unpublished ticket as published. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result as the contract's standalone-persistence rule requires — beside the written tickets, or beside the originating backlog item or plan when the tickets live only in an external tracker; never write workflow state or the artifact index.
