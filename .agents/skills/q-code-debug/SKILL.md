---
name: q-code-debug
description: "Diagnose and fix reproducible or hard failures in a codebase using evidence, ranked hypotheses, focused tests, and proportional project validation. Use when behavior is broken, failing, slow, flaky, or incorrect and the cause is not already confirmed. Part of the Quasar AI delivery skills."
---

# Debug

Load repository instructions, the current technical foundation when available, and the project's actual commands. Read `HARD-BUGS.md` when the failure is flaky, non-deterministic, performance-sensitive, or requires a substantial reproduction harness. Read the `q-core-contract` companion for its stage-result schema; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Procedure

1. Pin the expected and observed behavior, environment, frequency, and smallest known trigger.
2. Establish a fast pass/fail signal with a focused test or disposable reproduction.
3. Trace the relevant flow, data, boundaries, and recent changes.
4. Form a small ranked hypothesis set; state evidence that would falsify each.
5. Test hypotheses before editing.
6. Apply the smallest correction that resolves the verified cause.
7. Add or update regression coverage.
8. Run the focused and broader checks discovered from project configuration; do not assume a language, test runner, or static-analysis tool.
9. Run the mini review required by the workflow when `code-change-and-its-verification-are-complete-and-the-mini-review-is-due`: `q-review-code` for standards and specification conformance — if it is not installed, `close-with-a-blocker-naming-q-review-code-and-its-install-command-and-never-report-the-change-as-reviewed` (`npx skills add flaviogragnolati/ai-workflow --skill q-review-code`); `q-review-comments` for affected comments and docstrings — if it is not installed, `close-with-a-blocker-naming-q-review-comments-and-its-install-command-and-never-report-the-comment-review-as-done` (`npx skills add flaviogragnolati/ai-workflow --skill q-review-comments`). Keep both results distinct.
10. Update the original durable execution record.

When `database-performance-failure-has-supplied-query-plan-or-metric-evidence` and `q-tool-database-schema` is installed, pass the sanitized query shape, schema, confirmed profile, plan, metrics, distributions, and environment to `performance-review`. Keep hypothesis testing and every command execution here; the specialist only analyzes supplied evidence. If it is absent, `continue-with-evidence-led-debugging-and-mark-specialist-database-analysis-unavailable`.

Use `q-code-fix` when the cause and correction are already confirmed. When the correction alters product behavior, architecture, or a cross-module contract, the work stops being defect work: record the reclassification in the durable execution record and escalate it as a change request to the grill level that matches its scope (`q-code-grill-simple`, `q-code-grill-feature`, or `q-code-grill-design`).

Do not treat a throwaway reproduction, scratchpad, or internal plan as a durable artifact.

## Stage result

Return a valid `stage_result` as the contract requires from every development-loop skill that updates a durable record, with no `authored_outputs`: the updated durable record in `updated_outputs`; a reclassification to change work in `decisions_added_or_updated`; a planning artifact the debug correction contradicted under `stale_artifacts`; a failed check or a mini review that could not run (missing reviewer, with its install command) in `blockers`; the mini-review result and residual risk in `warnings`. Do not register hypotheses, harnesses, or reproductions as outputs. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the updated record as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
