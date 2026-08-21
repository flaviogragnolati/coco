---
name: q-code-fix
description: "Apply a guarded minimal fix in a codebase when the cause and correction are already confirmed. Use for a narrow defect with a clear diagnosis; escalate to q-code-debug when investigation is needed or to refinement when behavior or architecture must change. Part of the Quasar AI delivery skills."
---

# Simple fix

Load the repository's instructions, applicable technical foundation, and actual verification commands before editing. Read the `q-core-contract` companion for its stage-result schema; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Procedure

1. Confirm the reported cause in the real code.
2. Map the blast radius and must-not-break behavior.
3. Stop if the correction crosses modules, changes a contract, or requires product or architecture decisions; see the reclassification rule below.
4. Apply the smallest complete fix.
5. Add or update regression coverage.
6. Run focused tests and other proportional checks discovered from project configuration.
7. Run the required mini review when `code-change-and-its-verification-are-complete-and-the-mini-review-is-due`: `q-review-code` for standards and specification conformance — if it is not installed, `close-with-a-blocker-naming-q-review-code-and-its-install-command-and-never-report-the-change-as-reviewed` (`npx skills add flaviogragnolati/ai-workflow --skill q-review-code`); `q-review-comments` for affected comments and docstrings — if it is not installed, `close-with-a-blocker-naming-q-review-comments-and-its-install-command-and-never-report-the-comment-review-as-done` (`npx skills add flaviogragnolati/ai-workflow --skill q-review-comments`). Keep both results distinct.
8. Update the original durable execution record.

Do not use this path to hide a feature or design change. Use `q-code-debug` when the cause is uncertain. Keep internal notes transient. A correction that alters product behavior, architecture, or a cross-module contract is reclassified as a change: record that in the durable execution record and escalate it to the grill level that matches its scope.

## Stage result

Return a valid `stage_result` as the contract requires from every development-loop skill that updates a durable record, with no `authored_outputs`: the updated durable record in `updated_outputs`; a reclassification to change work in `decisions_added_or_updated`; a planning artifact the fix contradicted under `stale_artifacts`; a failed check or a mini review that could not run (missing reviewer, with its install command) in `blockers`; the mini-review result and residual risk in `warnings`. Do not register notes or reproductions as outputs. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the updated record as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
