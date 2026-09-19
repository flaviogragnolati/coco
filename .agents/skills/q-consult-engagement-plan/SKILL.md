---
name: q-consult-engagement-plan
description: "Turn an accepted Quasar proposal or engagement agreement into the engagement plan for consulting execution: objectives and success measures, workstreams, stakeholders and decision owners, cadence and governance, evidence and access needs, a deliverable register carrying the proposal's acceptance criteria by reference, risks, and kickoff decisions. Use at kickoff or when the engagement structure must be reconciled; it never re-scopes, re-prices, or re-schedules the proposal. Part of the Quasar AI delivery skills."
---

# Engagement plan

Read the `q-core-contract` companion for shared governance, especially its Consulting execution section; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Plan how the accepted engagement will be executed; own no commercial meaning and no diagnosis.

## Canonical output

Create two authored canonical files and one supporting evidence register under `docs/consulting-workflow/`:

- `01-engagement-plan.md`, canonical for the engagement execution plan, with YAML frontmatter naming the accepted proposal or agreement reference and version;
- `01-commitment-register.yaml`, the single source of engagement commitment IDs by reference for both an accepted proposal and an external agreement.
- `01-evidence.yaml`, authored and supporting for kickoff confirmations, supplied agreement locators, and other engagement-planning evidence; every entry uses the core evidence schema and a run-wide unique `EVD-nnn`.

The engagement plan contains these sections:

- objectives and success measures traced to proposal objective IDs;
- workstreams with scope boundaries traced to scope items and exclusions;
- stakeholder map: role, organization, decision authority, availability, information classification;
- governance and cadence: decision forums, review points, escalation path, reporting checkpoints;
- evidence and access plan: interviews, documents, data extracts, systems, observation sessions — each with owner, requested date, and classification;
- commitment-register pointer: the exact `01-commitment-register.yaml` version used by this plan; do not duplicate its rows in the narrative;
- risks, assumptions, and kickoff decisions with stable IDs;
- open items and required user actions.

Keep kickoff notes transient.

Author each commitment-register row in this form:

```yaml
- commitment_id: DEL-001 | AC-001 | SVC-001
  kind: deliverable | acceptance_criterion | service
  title: "literal copy from the commercial source"
  source:
    ref: "proposal@x.y" | "agreement@x.y"
    object_id: DEL-001 | null
    locator: null | "p. 4 §3.2"
  owner: "..."
  planned_version: "..."
  status: planned | active | completed | superseded
```

Copy each title literally; never reformulate commercial meaning. Require `source.locator` for every row copied from an external agreement. Proposal rows retain their stable `DEL-nnn` and `AC-nnn` object IDs; agreement rows receive the corresponding stable ID only after the user confirms the literal mapping. Use `service` only for a committed recurring session, SLA, or managed-service obligation.

## Procedure

1. Load the accepted proposal version (or the external agreement) and the discovery brief when it exists; list the deliverable, scope, exclusion, assumption, and acceptance objects that bind this engagement.
2. Confirm with the user the stakeholders, decision owners, cadence, information governance, and evidence access; record what is confirmed and what is assumed.
3. Derive the commitment register by literal copy. Every in-scope `DEL-nnn` and its `AC-nnn` rows appear once and every criterion resolves to its deliverable; an item absent from the accepted proposal or agreement becomes a change request through the orchestrator.
4. Adopt ideation `stakeholder-action` candidates only from a `Baselined` snapshot the orchestrator named and only as plan items the user confirmed; a candidate never becomes a commitment.
5. Record risks, assumptions, and kickoff decisions with stable IDs; route any scope, price, schedule, or commitment deviation to change control instead of resolving it here.
6. Present the plan for the engagement gate: stakeholders, cadence, evidence access, and the commitment register confirmed against the accepted proposal or agreement.

Complete when every in-scope deliverable and acceptance criterion has one literal register row with its commercial source, owner, and planned version; every agreement row has a locator; every evidence need has an owner and classification; and every unresolved item is a named risk, assumption, or required user action.

## Reconcile

Re-run in `reconcile` mode when stakeholders, cadence, access, or a commercial source changes or a change request is approved: version the commitment register with the plan, keep IDs stable, report affected downstream assessment or design versions as `stale_artifacts`, and never absorb a commercial change the proposal has not recorded.

## Stage result

Return a valid `stage_result`: the engagement plan, `01-commitment-register.yaml`, and `01-evidence.yaml` in `authored_outputs` (or `updated_outputs` on reconcile) with their declared types, paths, `Working` lifecycle, authority, and the proposal or agreement reference as source ref; kickoff decisions in `decisions_added_or_updated`; risks in `risks_added_or_updated`; interviews, access requests, and client confirmations in `required_user_actions`; a missing commercial reference or unconfirmed decision owner in `blockers`; `q-consult-current-state` as `next_recommended_action`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the plan as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
