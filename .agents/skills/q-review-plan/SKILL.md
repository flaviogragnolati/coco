---
name: q-review-plan
description: "Audit implemented work against its approved plan hierarchy — architecture and ADRs, feature and module definitions, implementation plans, and tickets — to verify each planned slice and phase was built as approved, every deviation is recorded and reconciled in the owning durable record, and no canonical planning artifact silently kept a superseded meaning. Use for a macro conformance review of a multi-slice feature, epic, milestone, or development front during or after implementation; not for one diff, a code-quality audit, a documentation health pass, a critique of a plan document's own quality, or the release verdict. Requires the q-core-contract companion. Part of the Quasar AI delivery skills."
---

# Plan conformance review

Read the `q-core-contract` companion for shared governance, especially its artifact
authority, stale-routing, and durable-record precedence rules; if it is missing, stop and
install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.
Diagnose conformance without changing anything: never edit a plan or code, never mark an
artifact stale, never write workflow state or the artifact index. When the target is this
workflow package itself, stop and route the request to `q-maint-ai-workflow`.

## 1. Lock scope and the plan chain

1. Confirm the target belongs to a project, then read the repository instructions and the
   user's conformance question.
2. Load `00-artifact-index.yaml`, `00-workflow-state.yaml`, decisions, risks, change
   requests, and the backlog changelog when they exist. Without an index, accept explicit
   artifact paths and report the coverage limitation.
3. Resolve the plan chain top-down at exact versions: architecture narrative and ADRs;
   module map and feature index; the feature architecture document, implementation plan,
   or simple plan; the ticket set when one exists; the backlog item as the commitment;
   and the execution-record updates those plans carry.
4. Choose one scope: **front** (one backlog item and its slices), **milestone** (every
   front the milestone names), or **chain** (an explicit artifact set the user supplies).
5. Fix the repository baseline (commit, branch, or tag) the implementation evidence is
   read at.

Complete this step when the chain levels, exact versions, repository baseline, scope, and
evidence limitations are explicit — including which levels are missing (for example, no
tickets were created; that is a fact to work with, not a finding by itself).

## 2. Fix the conformance baseline

For each chain level, state what was approved and when: scope, slices, phases, acceptance
criteria, non-goals, and constraints, each at its exact artifact version. Then inventory
the deviation records that already exist: deviation and decision entries in the durable
execution record, `stale` markings in the artifact index, change-control entries, and
backlog-changelog entries.

Apply the contract's precedence rule: the backlog item is the commitment; the
implementation plan or feature architecture document is the execution record; tickets
derive from the plan. When two levels disagree about what was approved, the higher level
wins and the disagreement itself becomes a finding routed to the owning stage.

Complete this step when every in-scope slice has an approved statement at a named version
and every existing deviation record is inventoried or its absence is stated.

## 3. Walk conformance in both directions

**Plan → implementation.** Trace every planned slice, phase, and acceptance criterion to
observable evidence: code, tests, migrations, configuration, schemas, and generated
interfaces at the fixed baseline. Cite exact locations. Never accept a status field,
checkbox, or summary claim as evidence on its own — a completion claim without observable
support is a finding, not a confirmation.

**Implementation → plan.** Trace material implemented behavior inside the scope back to a
planning source at some level of the chain. Behavior with no planning source is an
unplanned addition, whether or not it is desirable.

Give every slice exactly one disposition:

| Disposition | Meaning |
|---|---|
| `conformant` | Built as approved; evidence cited. |
| `conformant-with-documented-deviation` | Diverges, and the deviation, its decision, and its reconciliation are all recorded. |
| `undocumented-deviation` | Diverges with no recorded deviation, decision, or reconciliation. |
| `not-implemented` | Planned, absent or materially incomplete at the baseline. |
| `unplanned-addition` | Implemented with no planning source in the chain. |

Check every level, not only the plan: an implementation that satisfies its plan but
contradicts an ADR, a module boundary, or a feature definition is a divergence at that
level.

Complete this step when every in-scope slice carries one disposition backed by cited
evidence or a named verification gap, in both directions.

## 4. Verify deviation documentation

For every divergence, locate all four records: the deviation entry in the durable
execution record, the decision that authorized it, the stale marking on each contradicted
canonical artifact, and the reconciliation routed to (or completed by) the owning stage.
Each missing piece is its own finding. A deviation that was recorded while the upstream
canonical artifact still states the superseded meaning with no stale marking means the
durable artifact is silently wrong — report it and route reconciliation to the owning
stage; never reconcile here.

When `conformance-findings-warrant-deep-documentation-qa-over-the-affected-durable-artifacts`
and `q-review-docs` is installed, route the affected durable artifacts to it for a
document-health pass and fold its transient diagnostic into these findings. If it is
absent, `report-the-documentation-qa-gap-and-keep-findings-scoped-to-the-plan-chain`.

Complete this step when every divergence has all four records located or each missing one
recorded as its own finding.

## 5. Qualify findings

For every finding provide a stable ID, category, severity (`blocker`, `high`, `medium`,
`low`), confidence, the exact plan location and implementation evidence, the concrete
failure mode, and one owner route:

- a scope, priority, or acceptance-criteria change → `q-plan-backlog`
  (`targeted-refinement` or `replan-and-synchronize`);
- a contradicted canonical planning artifact → its owning planning stage;
- missing or incomplete implementation → the development loop through the orchestrator;
- an unrecorded deviation → the durable record's owner;
- document health beyond the chain → `q-review-docs`.

Separate confirmed divergences from risks and coverage gaps. Do not report code-quality
observations; route them to `q-review-code` or `q-review-codebase`.

Complete this step when every retained finding is reproducible, severity-ranked, and
routed to exactly one owner.

## 6. Return the transient diagnostic

Return in conversation only:

1. outcome and executive summary;
2. scope, chain versions, repository baseline, exclusions, and coverage limitations;
3. the per-slice disposition table;
4. findings ordered by severity, each with its owner route;
5. deviation-documentation status per divergence;
6. checks completed without findings;
7. remediation order grouped by owner and one next recommended action.

Never create or register an artifact, never claim stage or release completion, and never
issue a release verdict. In orchestrated use the caller may route on these findings but
must not present them as durable acceptance evidence.

Complete the review when the declared scope is exhausted, every slice has a disposition,
remaining uncertainty is explicit, and the user has one truthful next action.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Drifting into a quality audit | Findings about style, security, or performance unrelated to the plan dominate the diagnostic. | Keep the conformance lens; route quality observations to `q-review-code` or `q-review-codebase`. |
| 2 | Letting implementation redefine the plan | "The code is newer, update the plan to match" is applied as fact. | Report the divergence; the owning stage and the user decide which side changes. |
| 3 | Creating a durable conformance report | Findings are saved as a persistent audit that instantly goes stale. | Return the transient diagnostic and route remediation to each owner. |
| 4 | Status-field conformance | A "done" checkbox or summary is accepted as implementation evidence. | Cite observable evidence at the fixed baseline or report the verification gap. |
| 5 | Ceremony on a single change | A macro conformance pass runs for one diff. | Use `q-review-code`'s specification axis for one change. |
| 6 | Critiquing the plan instead of conformance | The diagnostic grades whether the plan itself is well written or well designed. | Audit implementation against the plan; route plan-document health to `q-review-docs` and replanning to `q-plan-backlog`. |

## Boundaries

Use `q-review-code` for one change, `q-review-codebase` for a quality audit,
`q-review-release` for the release verdict, and `q-review-docs` for documentation health —
including the health of a plan document read on its own. Use `q-code-implementation-plan`
or a grill to author or revise a plan. Use this skill only for the plan-to-implementation
traceability chain and its deviation records.
