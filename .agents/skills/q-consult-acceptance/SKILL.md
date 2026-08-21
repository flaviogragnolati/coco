---
name: q-consult-acceptance
description: "Run deliverable acceptance for a Quasar consulting engagement: present each deliverable at an exact version against its proposal acceptance criteria, capture the client's disposition and its evidence, record deviations, rework, and open items, and return partial or full acceptance without inferring it. Use at a deliverable, milestone, or engagement acceptance point; it never grades its own work or releases anything. Part of the Quasar AI delivery skills."
---

# Deliverable acceptance

Read the `q-core-contract` companion for shared governance, especially its Consulting execution section; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Record the client's disposition; never infer it, never edit a deliverable, and never mark anything `Released` — the orchestrator writes the execution release.

## Canonical output

Create `docs/consulting-workflow/04-acceptance-record.yaml`, authored and canonical for deliverable acceptance:

```yaml
schema_version: "1.0"
engagement_ref: "ART-...@x.y"          # accepted proposal or agreement reference
acceptance_session:
  date: "..."
  client_parties: []                    # role or name
  quasar_parties: []
  evidence_ref: EVD-...                 # minutes, signed form, message — registered evidence
deliverables:
  - deliverable_id: DEL-...             # proposal object ID
    artifact_ref: "ART-...@x.y"         # exact deliverable version presented
    criteria_ref: []                    # proposal acceptance-criteria object IDs
    disposition: accepted | accepted_with_reservations | rework | rejected | deferred
    client_statement: "..."             # verbatim or marked paraphrase
    reservations: []
    rework_items: []
    open_items: []
```

Keep acceptance session notes transient.

## Procedure

1. Load the deliverables at the exact versions the design gate confirmed, their criteria by reference, and the engagement plan's decision authority; block a deliverable whose version is unconfirmed or whose criteria are absent.
2. When `deliverable-set-warrants-documentation-qa-before-client-acceptance` and `q-review-docs` is installed, route the deliverable set to it and return its findings to `q-consult-intervention` before presenting. If it is absent, `continue-with-owner-review-against-the-acceptance-criteria-and-record-the-qa-gap`.
3. Prepare the acceptance session: per deliverable, the criteria, the evidence that shows each criterion, and known deviations. Run the session as a `required_user_action` when the agent is not present.
4. Record per deliverable the client's disposition, statement, reservations, rework items, and open items with the registered evidence of the disposition. A disposition without evidence is `deferred`.
5. Route: `rework` returns to `q-consult-intervention` with its items; a disputed criterion, scope, or commitment goes to change control through the orchestrator; `accepted` and `accepted_with_reservations` go to the orchestrator's execution release.

Complete when every presented deliverable has a disposition with evidence or a `deferred` disposition with its reason, and every rework or dispute names its route.

## Stage result

Return a valid `stage_result`: the acceptance record in `authored_outputs` (or `updated_outputs` for a later session) with type `acceptance-record`, path, `Working` lifecycle, and the deliverable versions as source refs; each disposition in `decisions_added_or_updated`; reservations that carry risk in `risks_added_or_updated`; the session and any client confirmation in `required_user_actions`; a disputed criterion or an unconfirmed version in `blockers`; the execution release, a rework return, or a change request as `next_recommended_action`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the record as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
