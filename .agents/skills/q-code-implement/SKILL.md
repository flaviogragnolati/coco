---
name: q-code-implement
description: "Execute settled work from a ready backlog item, issue, ticket, or implementation plan. Use to write production code, tests, migrations, and required documentation while preserving scope, keeping internal planning transient, verifying acceptance, running the mini review, and updating the original durable record. Part of the Quasar AI delivery skills."
---

# Implement

Use only when direction is settled. Return to the appropriate grill or planning skill if the source is missing, contradictory, or materially incomplete.

Read the `q-core-contract` companion for shared governance and its stage-result schema; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Load

1. Read repository instructions, the original execution record, and the applicable technical foundation, application standards, and ADRs when they exist. For interface work, read the exact `design_system_ref` version and build from its tokens and component contracts; note any declared token-validation gap rather than treating the token set as verified.
2. Resolve acceptance criteria, scope, non-goals, dependencies, must-not-break behavior, and required approvals.
3. Inspect the real code before editing.
4. Discover the project's actual build, test, analysis, formatting, migration, and packaging commands. Select `q-code-tdd` only when explicitly requested or chosen. Testing remains required either way.

## Execute

1. Keep internal plans, scratchpads, and delegation messages transient.
2. Implement in the required order and keep the diff inside scope.
3. Add or update tests and documentation that the change requires.
4. Run focused checks after each meaningful step and broader proportional checks before close.
5. Stop on an architecture, product, stack, priority, or commercial contradiction; route an unsettled technology decision to `q-plan-tech-foundation` and a needed change to a reusable design contract to `q-plan-design-system`, and do not widen the change silently.

Use parallel executors only for independent work with clear ownership. Their coordination is not a persistent project artifact.

## Mini review

When `code-change-and-its-verification-are-complete-and-the-mini-review-is-due` — always, after implementation and verification:

1. Run `q-review-code` for standards and specification conformance. If it is not installed, `close-with-a-blocker-naming-q-review-code-and-its-install-command-and-never-report-the-change-as-reviewed` (`npx skills add flaviogragnolati/ai-workflow --skill q-review-code`).
2. Run `q-review-comments` for affected comments and docstrings. If it is not installed, `close-with-a-blocker-naming-q-review-comments-and-its-install-command-and-never-report-the-comment-review-as-done` (`npx skills add flaviogragnolati/ai-workflow --skill q-review-comments`).
3. Correct blockers and rerun relevant checks.
4. Keep both review results distinct. A missing reviewer is a blocker in the stage result and in the durable record, never a skipped step.

## Durable close

Update only the original durable record:

- ticket when one exists;
- otherwise the originating backlog item, issue, or explicit implementation plan record.

Record status, change summary, acceptance coverage, test evidence, mini-review result, deviations, decisions, blockers, and follow-ups. Do not create a second durable implementation diary.

Return changed files, checks, review result, residual risk, record updated, and next action.

## Stage result

Also return a valid `stage_result` with no `authored_outputs`: the updated durable record in `updated_outputs`; a decision taken during execution in `decisions_added_or_updated`; a planning artifact the change contradicted under `stale_artifacts`; unmet acceptance or a failed check in `blockers`; the mini-review result and residual risk in `warnings`. Do not register scratchpads, internal plans, or delegation messages as outputs. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the updated record as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
