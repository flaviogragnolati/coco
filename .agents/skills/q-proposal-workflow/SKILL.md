---
name: q-proposal-workflow
description: "Orchestrate Quasar discovery and commercial proposals from initial client evidence through readiness, canonical proposal design, web or DOCX/PDF channels, client disposition, commercial close, optional development handoff, and optional reporting. Requires the q-core-contract companion."
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

An accepted non-development proposal may close commercially, route to a future/manual execution process, and optionally route to reporting. It must not leave a development gate pending.

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

## Reporting

At an approved proposal, commercial-close, consulting, or other reporting checkpoint, delegate to `q-report-workflow`. Pass the reporting request, relevant discovery and proposal artifact IDs and versions, `root_orchestrator: q-proposal-workflow`, `global_state_writer: q-proposal-workflow`, and the exact `return_to` disposition or action.

Remain the global state writer and reconcile the composite reporting delta after it returns. Reporting is optional and does not determine discovery or proposal completion. After commercial close, reporting may instead run as the next root workflow.

## Change control and manual edits

Keep accepted commercial releases immutable. Use change requests for subsequent scope, price, schedule, or commitment changes.

When a DOCX is edited manually, reintroduce it through `q-proposal-document` for reconciliation. Do not implement partial hashes or editable-field tracking in this version.

## Completion

Update state and index only after validating the stage delta. Report disposition, artifact versions, gates, unresolved items, optional next routes, and one next action.
