---
name: q-code-implement
description: "Execute settled work from a ready backlog item, issue, ticket, or implementation plan. Use to write production code, tests, migrations, and required documentation while preserving scope, keeping internal planning transient, verifying acceptance, running the mini review, and updating the original durable record. Part of the Quasar AI delivery skills."
---

# Implement

Use only when direction is settled. Return to the appropriate grill or planning skill if the source is missing, contradictory, or materially incomplete.

## Load

1. Read repository instructions, the original execution record, and the applicable technical foundation, application standards, and ADRs when they exist.
2. Resolve acceptance criteria, scope, non-goals, dependencies, must-not-break behavior, and required approvals.
3. Inspect the real code before editing.
4. Discover the project's actual build, test, analysis, formatting, migration, and packaging commands. Select `q-code-tdd` only when explicitly requested or chosen. Testing remains required either way.

## Execute

1. Keep internal plans, scratchpads, and delegation messages transient.
2. Implement in the required order and keep the diff inside scope.
3. Add or update tests and documentation that the change requires.
4. Run focused checks after each meaningful step and broader proportional checks before close.
5. Stop on an architecture, product, stack, priority, or commercial contradiction; route an unsettled technology decision to `q-plan-tech-foundation` and do not widen the change silently.

Use parallel executors only for independent work with clear ownership. Their coordination is not a persistent project artifact.

## Mini review

After implementation and verification:

1. Run `q-review-code` for standards and specification conformance.
2. Run `q-review-comments` for affected comments and docstrings.
3. Correct blockers and rerun relevant checks.
4. Keep both review results distinct.

## Durable close

Update only the original durable record:

- ticket when one exists;
- otherwise the originating backlog item, issue, or explicit implementation plan record.

Record status, change summary, acceptance coverage, test evidence, mini-review result, deviations, decisions, blockers, and follow-ups. Do not create a second durable implementation diary.

Return changed files, checks, review result, residual risk, record updated, and next action.
