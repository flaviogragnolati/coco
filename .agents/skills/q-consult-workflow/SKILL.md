---
name: q-consult-workflow
description: "Orchestrate Quasar consulting execution after an accepted non-development or mixed proposal, or an explicit engagement agreement: engagement plan, current-state assessment, intervention design, deliverable acceptance, and the execution release that reporting consumes. Use to start, resume, route, or validate a consulting, assessment, training, or managed-service engagement, execute a named stage, or recover project state. Requires the q-core-contract companion."
---

# Consulting execution workflow

Read the `q-core-contract` companion for shared governance, especially its Consulting execution section, and its `references/routing.md` for workflow routes before routing; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Remain the root orchestrator and single global state writer while delegating any subworkflow. Route stages and decide lifecycles; author no engagement plan, assessment, design, deliverable, or acceptance record here.

## Preconditions

1. Load project state, artifact index, decisions, risks, blockers, and open change requests when they exist.
2. Accept the exact accepted proposal version — its commercial release, the proposal object IDs of the deliverables in this workflow's scope, their acceptance criteria, commitments, assumptions, and exclusions — or an explicit engagement agreement the user supplies (statement of work, contract, charter) registered as the engagement's commercial reference. Never fabricate scope, deliverables, acceptance criteria, or commitments.
3. For a mixed engagement, record which proposal deliverables belong to this workflow. Software scope reaches `q-delivery-workflow` only through the proposal's development handoff, never through this workflow.
4. Block only on an unresolved commitment, missing evidence access, or a client decision that makes the next stage unsafe; otherwise route.

## Stages

1. `q-consult-engagement-plan`
2. `q-consult-current-state`
3. `q-consult-intervention`
4. `q-consult-acceptance`

Route only the stage required by current state or `target_stage`. Do not duplicate its procedure. Validate each `stage_result` against the contract schema and apply its delta — register authored artifacts as `Working` with their declared authority, record decisions and risks, route each `stale_artifacts` entry to its owning stage, carry `required_user_actions` and `next_recommended_action` into the next routing decision — before selecting the next stage.

## Gates and returns

- Engagement gate: stakeholders, decision owners, cadence, evidence access, and the deliverable register are confirmed against the accepted proposal before assessment starts.
- Assessment gate: diagnostic findings, their evidence, and declared gaps are confirmed by the user before design starts; a hypothesis is not a finding.
- Design gate: target state, recommendations, and each deliverable are confirmed at an exact version; a deliverable enters acceptance only at an approved version.
- Acceptance gate: the client's disposition per deliverable and version is recorded, never inferred from internal review, a delivered file, or silence.

Return a missing or contradicted finding to `q-consult-current-state`; return a `rework` disposition to `q-consult-intervention`; return a disputed acceptance criterion, scope, price, schedule, or commitment to change control. Record every return in state or a decision.

## Execution release

On recorded client acceptance, write `docs/consulting-workflow/05-execution-release.yaml` — the `execution-release`, canonical for accepted engagement results — naming the exact acceptance-record version, the exact accepted deliverable versions, the engagement plan, assessment, and design versions they trace to, open items, and the approval; mark the named versions `Released`. Partial acceptance releases only the accepted deliverables and lists rework and open items; a rejected deliverable returns to `q-consult-intervention` or opens a change request. This release is the "approved execution results" reporting consumes. Keep it immutable; a later acceptance produces a new release version.

## Change control and recovery

Execution never edits the accepted proposal. When a stage reports a deviation from accepted scope, price, schedule, deliverables, acceptance criteria, or another commitment:

1. Create a change request with impacted IDs.
2. Keep the accepted commercial release immutable.
3. Mark dependent engagement artifacts stale.
4. Block affected work until the required decision.
5. Route the commitment change to `q-proposal-workflow` change control when the engagement came from a proposal; when it came from an external agreement, record the user's decision as the change record and version the engagement plan.

Client feedback on an accepted deliverable or the execution release follows the contract's Client feedback rule: record it, then route an objection as a `rework` disposition in a new acceptance round, a scope, price, schedule, or commitment change through the change request above, a question to `q-ask-project`, and an acknowledgement into the acceptance record.

On resume, rebuild context from state, index, decisions, risks, blockers, the accepted proposal or agreement version, and any persisted standalone stage results under `docs/consulting-workflow/`: validate each sidecar the contract's standalone-persistence rule defines, apply its delta, and delete it before continuing; the run's state and index live under its artifact root (`docs/consulting-workflow/`), with the project root as the legacy location — name which one you used. Do not reopen closed decisions without new evidence.

## Optional structured ideation

When `user-requests-structured-ideation-on-a-bounded-diagnostic-or-intervention-decision-during-execution` and `q-ideation-session` is installed, route that bounded session to it with the decision, its accountable owner, the versioned inputs, and the information classification, then record one adoption disposition from the contract's structured-ideation section before any stage consumes the result. Diagnostic and causal hypotheses go to `q-consult-current-state` for validation; intervention, governance, operating-model, and measurement options go to `q-consult-intervention`; stakeholder actions go to `q-consult-engagement-plan`. A candidate never becomes a client fact, a finding, a deliverable, or a commitment. If it is absent, `continue-the-owning-execution-stage-and-name-the-unexplored-option-space`.

## Optional engagement research

When assessment or design exposes an external uncertainty that client evidence cannot resolve, offer delegation to `q-research-workflow`. Start it only after the user authorizes the questions, boundary, privacy treatment, and budget. Pass `root_orchestrator: q-consult-workflow`, `global_state_writer: q-consult-workflow`, and an exact `return_to`; remain the global state writer and reconcile its composite delta. After it returns, obtain one explicit disposition:

- `adopt-as-engagement-input` — route the exact Research Baseline ID and version to `q-consult-current-state` or `q-consult-intervention`, which registers it as `external-research` evidence;
- `retain-as-independent` — preserve the research artifacts without using them in this engagement;
- `defer-decision` — keep the disposition unresolved and block only the finding or recommendation that depends on it.

Research never edits an engagement artifact and never opens another workflow by itself.

## Reporting checkpoints

At an explicit `consulting`, `progress`, or `completion` reporting checkpoint, delegate to `q-report-workflow`. Pass the reporting request, candidate artifact IDs and versions, `root_orchestrator: q-consult-workflow`, `global_state_writer: q-consult-workflow`, and the exact `return_to`. Remain the global state writer and reconcile the composite reporting delta. Reporting is optional and never marks a stage complete.

A client-facing DOCX, PDF, or deck of an accepted deliverable is produced through this same reporting delegation — report type `consulting` or `custom` over the exact accepted deliverable version — never as a stage channel: the render is derived with no authority, does not enter the execution release, and its semantic edits return to `q-consult-intervention`.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Doing stage work in the coordinator | The orchestrator writes the engagement plan, maps a process, drafts a deliverable, or fills the acceptance record. | Route the named stage, validate its `stage_result`, and reconcile the delta. |
| 2 | Inferring acceptance | A delivered file, a positive meeting, an internal review, or silence is recorded as client acceptance. | Record only the disposition `q-consult-acceptance` captured from the client, per deliverable and version. |
| 3 | Editing the proposal to fit execution | Scope, deliverables, criteria, price, or schedule are rewritten in engagement artifacts to match what was done. | Open a change request and route the commitment to proposal change control. |
| 4 | Diagnosis by assertion | A hypothesis from ideation, one interview, or prior experience enters the design as a validated finding. | Route it to `q-consult-current-state` and require registered evidence or a declared gap. |
| 5 | Auto-opening the next workflow | Reporting, a follow-on proposal, or delivery starts because acceptance was recorded. | Present `reporting`, `discovery-proposal`, `ai-coding`, and `close` as optional next routes and start none without an explicit choice. |

## Completion

Update state and index only after validating the stage delta. Report engagement disposition, artifact versions, gates passed, open items, optional next routes — `reporting`, `discovery-proposal` for follow-on scope Quasar would sell, `ai-coding` for a follow-on build the user starts from the accepted design, `close` — and one next action.
