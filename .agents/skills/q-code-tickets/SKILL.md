---
name: q-code-tickets
description: "Optionally convert settled work into durable, traceable tickets for multiple executors, sessions, or tracker coordination. Use when distribution adds value; a single executor may proceed directly from a ready backlog item, issue, or implementation plan. Part of the Quasar AI delivery skills."
---

# To tickets

Read `TRACKERS.md` when resolving a tracker. Ticket creation is optional.

## Gate

Use this skill only when work needs distribution, a tracker, multiple executors, or cold-start continuity. Otherwise continue directly to `q-code-implement`.

Obtain explicit authorization before publishing to an external tracker. When no tracker is used, create versioned Markdown tickets in the project.

## Procedure

1. Load the settled source and preserve backlog, requirement, decision, and plan IDs.
2. Confirm tracker, publication mode, and distribution boundary.
3. Cut vertical tracer-bullet tickets with explicit dependency edges.
4. Make each ticket executable cold: objective, context, scope, non-goals, affected areas, guardrails, acceptance criteria, verification, dependencies, and source links.
5. Review coverage and sequencing with the user.
6. Publish or write only after the required approval.
7. Record created ticket IDs back in the originating backlog or plan.

Tickets are durable `Working` execution records. `q-code-implement` updates each original ticket with status, change summary, acceptance coverage, tests, mini-review result, deviations, and follow-ups. It does not create a parallel durable summary.
