---
name: q-consult-engagement-plan
description: "Turn an accepted Quasar proposal or engagement agreement into the engagement plan for consulting execution: objectives and success measures, workstreams, stakeholders and decision owners, cadence and governance, evidence and access needs, a deliverable register carrying the proposal's acceptance criteria by reference, risks, and kickoff decisions. Use at kickoff or when the engagement structure must be reconciled; it never re-scopes, re-prices, or re-schedules the proposal. Part of the Quasar AI delivery skills."
---

# Engagement plan

Read the `q-core-contract` companion for shared governance, especially its Consulting execution section; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Plan how the accepted engagement will be executed; own no commercial meaning and no diagnosis.

## Canonical output

Create `docs/consulting-workflow/01-engagement-plan.md`, authored and canonical for the engagement execution plan, with YAML frontmatter naming the accepted proposal or agreement reference and version, and these sections:

- objectives and success measures traced to proposal objective IDs;
- workstreams with scope boundaries traced to scope items and exclusions;
- stakeholder map: role, organization, decision authority, availability, information classification;
- governance and cadence: decision forums, review points, escalation path, reporting checkpoints;
- evidence and access plan: interviews, documents, data extracts, systems, observation sessions — each with owner, requested date, and classification;
- deliverable register: one row per proposal deliverable in this workflow's scope — `deliverable_id` (proposal object ID), title, acceptance criteria **by reference** to the proposal object, owner, evidence acceptance will need, planned version, status;
- risks, assumptions, and kickoff decisions with stable IDs;
- open items and required user actions.

Keep kickoff notes transient.

## Procedure

1. Load the accepted proposal version (or the external agreement) and the discovery brief when it exists; list the deliverable, scope, exclusion, assumption, and acceptance objects that bind this engagement.
2. Confirm with the user the stakeholders, decision owners, cadence, information governance, and evidence access; record what is confirmed and what is assumed.
3. Derive the deliverable register. Every in-scope proposal deliverable appears once; a deliverable that is not in the proposal is not added here — it becomes a change request through the orchestrator.
4. Adopt ideation `stakeholder-action` candidates only from a `Baselined` snapshot the orchestrator named and only as plan items the user confirmed; a candidate never becomes a commitment.
5. Record risks, assumptions, and kickoff decisions with stable IDs; route any scope, price, schedule, or commitment deviation to change control instead of resolving it here.
6. Present the plan for the engagement gate: stakeholders, cadence, evidence access, and the deliverable register confirmed against the accepted proposal.

Complete when every in-scope proposal deliverable has a register row with criteria by reference and an owner, every evidence need has an owner and classification, and every unresolved item is a named risk, assumption, or required user action.

## Reconcile

Re-run in `reconcile` mode when stakeholders, cadence, or access change or a change request is approved: create a new plan version, keep IDs stable, mark downstream assessment or design artifacts stale when the change affects them, and never absorb a commercial change the proposal has not recorded.

## Stage result

Return a valid `stage_result`: the engagement plan in `authored_outputs` (or `updated_outputs` on reconcile) with type `engagement-plan`, path, `Working` lifecycle, and the proposal or agreement reference as source ref; kickoff decisions in `decisions_added_or_updated`; risks in `risks_added_or_updated`; interviews, access requests, and client confirmations in `required_user_actions`; a missing commercial reference or unconfirmed decision owner in `blockers`; `q-consult-current-state` as `next_recommended_action`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the plan as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
