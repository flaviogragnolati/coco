---
name: q-review-release
description: "Validate a Quasar release candidate integrally: reconcile its evidence checklist against the codebase audit, tests, release execution and UAT evidence, mini-review results, security, NFR, design-system, and documentation evidence, and return a ready, ready-with-accepted-risks, or blocked verdict with named gaps. Use before delivery acceptance or for a hotfix at proportional scope; never modifies the release candidate, executes a release, or approves beyond verified evidence. Part of the Quasar AI delivery skills."
---

# Integral release validation

Read the `q-core-contract` companion for shared governance, especially its Release engineering section; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Reconcile evidence into one verdict; this skill never modifies the release candidate, its evidence, or the code, and it never executes a release.

## Establish validation authority

Load at their exact versions:

- the release candidate and its evidence checklist;
- the release evidence: environments, approvals, migrations and their reversibility disposition, smoke checks, rollback drill, UAT outcomes;
- the `codebase-audit` produced over this candidate's scope;
- verification evidence and mini-review results referenced by the included execution records;
- `technical_foundation_ref`, and `design_system_ref` when the release exposes a user interface.

When an input is missing, stale, or unreadable, name it as a gap on the checklist line it was supposed to satisfy. Never reconstruct, re-run, or fill a missing input, and never treat an absent input as a satisfied one.

When `release-scope-warrants-documentation-qa-before-acceptance` and `q-review-docs` is installed, route the delivery documentation scope to it and reconcile its transient diagnostic into the documentation checklist lines. If it is absent, `continue-with-the-delivery-documentation-lens-of-the-codebase-audit-and-record-the-documentation-qa-gap`.

Complete authority setup when every checklist line resolves to a loaded evidence reference or a named gap.

## Coverage

Reconcile applicable evidence across:

- architecture, integrations, and critical flows;
- security, authorization, privacy, and data integrity;
- relevant accepted NFRs;
- migrations, deployment, and delivery documentation;
- adopted technology guidance and the freshness of the exact reviewed `technical_foundation_ref`;
- accessibility and design-system conformance when the release exposes a user interface, reporting an unvalidated token set or a stale referenced version as a gap rather than as conformance;
- requirement and acceptance coverage for the release candidate, including UAT.

Disclose generic-only or unverified stack coverage instead of extending an approval over it.

## Verdict

Write `07-integral-validation.md` beside the candidate it validates, in `docs/development-workflow/release/<rc-id>/`, and return exactly one verdict:

| Verdict | Condition |
|---|---|
| `ready` | Every checklist line has verified evidence and no blocker remains. |
| `ready_with_accepted_risks` | Every blocker is either resolved or recorded as an accepted risk that names its impact, its mitigation, and the human decision owner who accepted it. |
| `blocked` | At least one checklist line has no evidence, or a blocker has no accepted disposition. Name each blocker and the owner it returns to. |

A hotfix narrows coverage to the changed surface plus regression over the released version; it never lowers the evidence standard for the lines it does cover. Never promote `ready_with_accepted_risks` to `ready` without the named decision owner, and never widen a verdict to cover scope the evidence does not reach.

## Procedure

1. Lock the candidate version, its scope, and the checklist as the validation contract.
2. Map each checklist line to its evidence reference or gap.
3. Reconcile contradictions between the audit, the tests, the release evidence, and the mini-review results; keep the materially distinct evidence rather than collapsing it.
4. Classify each unmet line as a blocker, an accepted risk with its decision owner, or a coverage gap.
5. Write the validation with per-line coverage, the verdict, blockers with owners, accepted risks with owners, and residual gaps.

Complete when every checklist line has a disposition, every blocker names an owner, and the report identifies one truthful next action.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Audit as whole validation | A clean `q-review-codebase` report is copied forward as the integral verdict. | Treat the audit as one input and reconcile it with tests, release, UAT, and review evidence. |
| 2 | Screenshot as acceptance | A screenshot, an exit code, or an agent walkthrough is accepted as UAT evidence. | Require the recorded per-criterion outcome and its named owner, or record the gap. |
| 3 | Approving beyond verified coverage | Generic checks or an unread input are presented as full assurance. | Limit the verdict to verified evidence and name every coverage gap. |
| 4 | Fixing what it validates | Missing evidence is regenerated, or code and evidence are edited to clear a line. | Never modifies the release candidate: return the gap to its owner and keep the verdict honest. |
| 5 | Quiet risk promotion | `ready_with_accepted_risks` is reported as `ready` because the risk looked small. | Keep the verdict and name each accepted risk with the human decision owner. |

## Stage result

Return a valid `stage_result`: `07-integral-validation.md` in `authored_outputs` with type, path, `Working` lifecycle, and the candidate and evidence IDs as source refs; unmet checklist lines in `blockers`; accepted risks in `risks_added_or_updated`; coverage gaps in `warnings`; the acceptance decision or the return of a blocker to its owner as `next_recommended_action`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the validation as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.

This validation is the reconciled quality evidence; the acceptance decision belongs to `q-delivery-workflow` and the user.
