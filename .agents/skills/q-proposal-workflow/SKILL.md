---
name: q-proposal-workflow
description: "Orchestrate Quasar discovery and commercial proposals from initial client evidence through readiness, optional delegated engagement research, canonical proposal design, web or DOCX/PDF channels, client disposition, commercial close, optional development handoff, and optional reporting. Requires the q-core-contract companion."
---

# Discovery and proposal workflow

Read the `q-core-contract` companion for shared governance and its `references/routing.md` for workflow routes; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Remain the root orchestrator and single global state writer while delegating any subworkflow.

## Stages

1. `q-proposal-discovery`
2. `q-proposal-design`
3. `q-proposal-web` when a web channel is requested
4. `q-proposal-document` when DOCX/PDF is requested

Route only the stage required by current state or `target_stage`. Do not duplicate its procedure. Validate each `stage_result` and reconcile the returned delta.

## Engagement models

Support software delivery, consulting, assessment, training, managed service, mixed engagements, and other explicit service models. Do not assume every accepted proposal continues to development.

Classify client disposition as one of:

- `accepted_with_development`;
- `accepted_without_development`;
- `negotiation_or_revision`;
- `rejected`;
- `expired`.

An accepted non-development proposal continues to `q-consult-workflow` (the `consulting-execution` workflow) or closes commercially, and may optionally route to reporting. It must not leave a development gate pending.

## Gates and returns

- Discovery gate: sufficient readiness and no critical unknown that would make commitments speculative.
- Proposal gate: internal commercial approval, distinct from client acceptance.
- Channel gate: presentation fidelity and channel quality.
- Release gate: explicit version, approval, and immutable accepted commitments.

Return scope, price, schedule, commitment, or source errors to `q-proposal-design`. Return visual, layout, accessibility, or channel-only errors to `q-proposal-web` or `q-proposal-document`.

Never let a channel renderer silently modify canonical commercial meaning.

`q-review-docs` is optional. Route to it when the user requests extended documentation QA, when an upstream proposal change may have introduced drift, or before a high-risk baseline or release. Supply the active artifact IDs or explicit durable scope. Keep its diagnostic transient and unregistered; return approved remediation to the existing proposal or channel owner and record implemented changes through the workflow's applicable changelog or change-control record.

## Development handoff

Only software or mixed engagements with applicable software scope may continue to `q-delivery-workflow`. Pass proposal object IDs, version, applicable commitments, assumptions, exclusions, unresolved references, and readiness. Do not imply technical confirmation where the proposal records only a preliminary assumption.

## Consulting handoff

A consulting, assessment, training, managed-service, or mixed engagement with non-software scope may continue to `q-consult-workflow`. Pass the accepted proposal artifact ID and version, the proposal object IDs of the deliverables, acceptance criteria, commitments, assumptions, exclusions, and unresolved references in that scope, and readiness. A mixed engagement receives both handoffs; each root workflow owns the state and index of its own run, and neither edits the proposal. A scope, price, schedule, deliverable, or acceptance-criteria change that execution reports returns here through change control.

## Optional structured ideation

When `user-requests-structured-ideation-or-opportunity-discovery-before-discovery-or-proposal-design` and `q-ideation-session` is installed, route that bounded session to it with the decision, its accountable owner, the versioned inputs, and the information classification. If it is absent, `continue-the-proposal-stage-without-a-recorded-session-and-name-the-unexplored-option-space`.

After it returns, record one disposition defined in the contract's structured-ideation section: `adopt-as-supporting-input`, `retain-as-independent`, `defer-decision`, or `reject`. Adoption is the act in which you register the exact snapshot version and mark that version `Baselined`; nothing is adopted by the session ending. Route problem frames, questions, assumptions, and interpretation risks to `q-proposal-discovery`, and solution, engagement, or workstream options to `q-proposal-design`. A candidate never becomes a client fact, scope, price, schedule, or commitment.

## Optional engagement research

When Discovery exposes an external uncertainty that materially affects a proposal decision and client evidence cannot resolve it, offer delegation to `q-research-workflow`. Start it only after the user authorizes the questions, boundary, privacy treatment, and budget. Pass `root_orchestrator: q-proposal-workflow`, `global_state_writer: q-proposal-workflow`, and an exact `return_to`; remain the global state writer and reconcile its composite delta.

After Research returns, obtain one explicit disposition:

- `adopt-as-proposal-input` — route the exact Research Baseline ID and version to `q-proposal-discovery` as `external-research`;
- `retain-as-independent` — preserve the research artifacts without using them in this proposal;
- `defer-decision` — keep the disposition unresolved and block only the commitment that depends on it.

Research never edits the Discovery Brief and never opens Proposal by itself. Treat its claims and synthesis as supporting evidence; client evidence and the proposal owners retain their declared authority.

## Reporting

At an approved proposal, commercial-close, consulting, or other reporting checkpoint, delegate to `q-report-workflow`. Pass the reporting request, relevant discovery and proposal artifact IDs and versions, `root_orchestrator: q-proposal-workflow`, `global_state_writer: q-proposal-workflow`, and the exact `return_to` disposition or action.

Remain the global state writer and reconcile the composite reporting delta after it returns. Reporting is optional and does not determine discovery or proposal completion. After commercial close, reporting may instead run as the next root workflow.

A presentation deck of an approved proposal is produced through this same reporting delegation — report type `executive` or `custom` over the exact approved `02-proposal-source.yaml` version — never as a proposal channel: the deck is derived with no commercial authority, does not enter the commercial release, and its semantic edits return to `q-proposal-design`.

## Change control and manual edits

Keep accepted commercial releases immutable. Use change requests for subsequent scope, price, schedule, or commitment changes. Client feedback after commercial close that is not a change request — a question, an acknowledgement, a lesson — is recorded, not applied; a request for new scope is a follow-on proposal.

On resume, rebuild context from this run's state and index under its artifact root (`docs/proposal-workflow/`), with the project root as the legacy location — name which one you used — and validate, apply, and delete each persisted standalone stage-result sidecar the contract's standalone-persistence rule defines before continuing.

When a DOCX is edited manually, reintroduce it through `q-proposal-document` for reconciliation. Do not implement partial hashes or editable-field tracking in this version.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Performing stage substance here | The orchestrator rewrites discovery evidence or proposal terms instead of routing their owners. | Delegate the named stage and reconcile its validated delta. |
| 2 | Letting external research override the client | A Research Baseline silently replaces contrary client evidence or accepted commercial meaning. | Keep research supporting and route any proposed meaning change through Discovery or Proposal Design. |
| 3 | Auto-adopting a returned snapshot | A Research Baseline or ideation snapshot becomes proposal input because the delegated work finished. | Obtain and record one explicit disposition: adoption, retention, or deferral for a Research Baseline; adoption, retention, deferral, or rejection for an ideation snapshot. |
| 4 | Treating a channel as the proposal owner | A web or document edit becomes the new commercial source. | Return semantic edits to `q-proposal-design` and regenerate the channel. |

## Completion

Update state and index only after validating the stage delta. Report disposition, artifact versions, gates, unresolved items, optional next routes, and one next action.
