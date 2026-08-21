---
name: q-delivery-release
description: "Run release engineering for a Quasar delivery: form a release candidate from an exact base commit and the included execution records, prepare environments, execute deployments and migrations only under per-environment approval or record human-executed steps as evidence, run the rollback drill and state its disposition, coordinate UAT, and close delivery with the manifest and release notes. Use for a release, a hotfix, or a rollback; never validates its own release. Part of the Quasar AI delivery skills."
---

# Release engineering

Read the `q-core-contract` companion for shared governance, especially its Release engineering section; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Form, execute, and close the release candidate; never grade it. Integral validation belongs to `q-review-release` and the acceptance decision to `q-delivery-workflow` and the user.

## Canonical outputs

Create under `docs/development-workflow/release/<rc-id>/`:

- `07-release-candidate.yaml`: canonical release composition;
- `07-release-evidence.md`: supporting execution, environment, rollback, and UAT evidence;
- `08-delivery-manifest.yaml`: canonical delivered scope;
- `08-release-notes.md`: derived communication view with no semantic authority.

Never author `07-integral-validation.md`; it is `q-review-release`'s artifact. Keep environment probes, command transcripts, and deployment scratch transient.

## Modes

Choose exactly one mode per run.

### form-release-candidate

Record in `07-release-candidate.yaml`:

- `rc_id`, `release_kind: release | hotfix | rollback`, and the version it produces;
- the exact base commit or tag the release is built from;
- the included backlog items, tickets, and implementation plans at exact artifact versions;
- target environments in execution order with their preconditions;
- each schema or data migration with a reversibility disposition of `possible`, `partial`, or `impossible`, plus the restore path or the forward-fix that replaces it;
- configuration and secret **names** with their source of truth — never values;
- the rollout plan and the rollback plan;
- UAT scope, criteria, and named owners;
- the evidence checklist `q-review-release` must reconcile, one line per claim.

When `release-candidate-includes-a-schema-or-data-migration-with-material-operational-risk` and `q-tool-database-schema` is installed, delegate `migration-design` with the confirmed database profile, observed schema, workload, and rollout constraints, and reconcile its transient result into the migration entries here. If the tool is absent, `continue-with-the-migration-plan-in-the-implementation-record-and-declare-the-specialist-migration-gap`.

Complete when every included record resolves to an exact version, every migration states its reversibility disposition, and every checklist line names the evidence that will satisfy it.

### execute-release

Per environment, in the declared order:

1. Verify preconditions: base commit, build artifact, configuration and secret availability by name, and the previous environment's recorded outcome.
2. Obtain explicit approval naming this environment and this operation. Production approval is never inferred from a staging approval, and one approval never covers two operations.
3. Run the project's discovered deploy and migration commands, or, when the agent lacks access, record the human-executed step with its source, operator, timestamp, command or console action, and outcome. Human-executed evidence is labelled as such and never presented as agent evidence.
4. Run the smoke checks the candidate declares and record their output.
5. Drill the rollback in a lower environment before the production run and record whether the restore reproduced the pre-release state, was partial, or is impossible.

Write every result into `07-release-evidence.md` with provenance. On a failed precondition, missing approval, or failed smoke check, stop at that environment and return the blocker with the exact pending effect and the safe next action.

Complete when every executed environment has an approval reference, a command or human-executed record, a smoke-check result, and a rollback disposition.

### coordinate-uat

Produce the UAT plan from the candidate's scope and criteria: sessions, participants, data, and per-criterion pass conditions. Sessions run as `required_user_actions`; record each criterion's outcome, evidence reference, and owner. A screenshot, a zero exit code, or an agent walkthrough is not user acceptance. Record refused, deferred, or unreachable criteria as named gaps rather than as passes.

Complete when every UAT criterion carries a recorded outcome and owner, or an explicit gap.

### close-delivery

Write `08-delivery-manifest.yaml` with delivered scope and its source IDs, versions, environments and their deployment timestamps, the integral validation reference and verdict, the acceptance decision reference, known deviations, accepted risks, and open follow-ups routed to their owners. Derive `08-release-notes.md` from the manifest, the included backlog items, and the tickets; keep it `creation_mode: derived` with `semantic_authority: none` and provenance naming its sources.

Run this mode only after `q-review-release` has returned a verdict and `q-delivery-workflow` has recorded the acceptance decision.

Complete when the manifest reconciles every included record with an outcome, and the notes add no claim absent from the manifest.

## Git boundary

Name the exact base commit or tag in the candidate and the manifest. Requesting a release tag, branch, or push is a `required_user_action` with the repository, exact operation, and ref scope stated; this skill declares no Git side effect and performs no Git mutation.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Deploying on an inferred approval | A staging approval, or a general "ship it", is read as authorization for production or for a migration. | Obtain one explicit approval per environment and per operation before the effect. |
| 2 | Exit code as evidence | A zero exit code is written into the evidence as a working release. | Record the declared smoke-check result and its output beside the command. |
| 3 | Fake reversibility | A destructive migration is declared reversible on the strength of an untested DOWN script. | Declare rollback as possible, partial, or impossible and record the tested restore or the forward-fix. |
| 4 | Editing a released version | A hotfix rewrites the accepted release, manifest, or notes in place. | Form a new release candidate over the released version and deliver a new version. |
| 5 | Secrets in the candidate | Connection strings, tokens, or keys are pasted into the candidate or the evidence. | Record the secret name and its source of truth only. |

## Stage result

Return a valid `stage_result`: the release candidate, release evidence, and delivery manifest in `authored_outputs` with type, path, `Working` lifecycle, and source IDs; the release notes in `derived_outputs` with generation provenance; a migration or execution risk in `risks_added_or_updated`; the approval taken and the reversibility disposition in `decisions_added_or_updated`; UAT sessions, tag, branch, and push requests in `required_user_actions`; a missing approval, failed check, or unavailable execution capability in `blockers`; the next mode as `next_recommended_action`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the release candidate as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
