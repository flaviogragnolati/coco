---
name: q-consult-intervention
description: "Design the intervention for a Quasar consulting engagement: target-state processes, operating model, standards, playbooks, governance, measurement, and an adoption roadmap traced to diagnosed findings and to the proposal's deliverables, and author each deliverable at its own declared scope. Use after a confirmed current-state assessment; it routes any scope, price, schedule, or commitment change to proposal change control and never accepts its own deliverables. Part of the Quasar AI delivery skills."
---

# Intervention design

Read the `q-core-contract` companion for shared governance, especially its Consulting execution section; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Design the remedy from confirmed findings; diagnose nothing new here — a missing or contradicted finding returns to `q-consult-current-state`.

## Canonical outputs

Create under `docs/consulting-workflow/`:

- `03-intervention-design.md`: authored, canonical for target state and recommendations — options considered and trade-offs, selected target state (processes, roles, operating model, governance, standards, measurement), rationale traced to finding IDs, adoption roadmap, risks and open items, deliverable map;
- `03-deliverables/<deliverable-id>-<slug>.md`: one authored file per deliverable in the register, canonical only for its declared scope (a playbook, a standard, a process design, a training curriculum, an operating-model definition, a measurement framework), with frontmatter `deliverable_id` (proposal object ID), version, declared scope, acceptance criteria by reference, source findings, status;
- `03-process-maps/<process>.mmd`: Mermaid source for confirmed target-state maps, authored, supporting for visual representation.

A client-facing DOCX, PDF, or deck of a deliverable is not authored here; the orchestrator produces it through reporting delegation over the accepted version. Keep design notes transient.

## Procedure

1. Load the confirmed assessment version, the engagement plan's deliverable register, and the accepted proposal's deliverable and acceptance objects; list the findings each deliverable must address.
2. Options: for each material design choice state two or more options with trade-offs against the engagement's criteria. An adopted ideation snapshot supplies options and their assumptions here, never a selected design.
3. Target state: define processes, roles, hand-offs, controls, systems and data needs, governance, standards, and measurement; trace each element to findings; use the diagram branch below for a confirmed target-state map.
4. Deliverables: author each deliverable at its declared scope, one per file; cite findings and the proposal deliverable ID; state what it deliberately excludes.
5. Adoption roadmap and measurement: phases, owners, prerequisites, quick wins versus structural changes, leading and lagging indicators with baselines from the assessment where evidenced.
6. Commitment check: when the design implies work, cost, time, or deliverables beyond the accepted proposal, stop and return a change request through the orchestrator; do not absorb it.
7. Confirm target state, recommendations, and each deliverable version with the user; present for the design gate.

Complete when every register deliverable at this stage's scope exists at an exact version with criteria by reference and traced findings, every recommendation traces to a finding or a declared assumption, and every commitment deviation is a change request.

## Delegated mechanics

When `confirmed-target-state-process-or-operating-model-needs-a-diagram` and `q-tool-mermaid` is installed, delegate authoring, validation, and rendering; keep the textual design canonical and the diagram supporting. If it is absent, `continue-with-the-canonical-textual-design-and-record-the-visual-capability-gap`.

When `client-facing-prose-is-drafted-and-the-user-requests-a-clarity-or-ai-pattern-pass-before-the-gate` and `q-tool-humanizer` is installed, pass the exact prose sections, their language, and a meaning lock — every claim, number, name, price, date, citation, and commitment that must not change — for `detect` and, if requested, `rewrite` or `improve`; adopt a revision into this owned artifact only after checking the lock, and keep the pass out of any derived render. If it is absent, `keep-the-prose-as-authored-and-record-that-no-humanization-pass-ran`.

## Boundaries

Never accept a deliverable, edit the assessment or the proposal, or present a recommendation without a traced finding or a declared assumption. A `rework` disposition from acceptance returns here with its items and produces a new deliverable version.

## Stage result

Return a valid `stage_result`: the intervention design, each deliverable, and process-map sources in `authored_outputs` (or `updated_outputs` on rework) with type, path, `Working` lifecycle, and the assessment and engagement plan versions as source refs; design decisions in `decisions_added_or_updated`; adoption risks in `risks_added_or_updated`; a change request as a `blockers` entry naming the deviating commitment; user confirmations in `required_user_actions`; `q-consult-acceptance` as `next_recommended_action`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the design as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
