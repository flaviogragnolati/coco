---
name: q-consult-intervention
description: "Design the intervention for a Quasar consulting engagement: target-state processes, operating model, standards, playbooks, governance, measurement, and an adoption roadmap traced to diagnosed findings and to the proposal's deliverables, and author each deliverable at its own declared scope. Use after a confirmed current-state assessment; it routes any scope, price, schedule, or commitment change to proposal change control and never accepts its own deliverables. Part of the Quasar AI delivery skills."
---

# Intervention design

Read `q-core-contract` for shared governance and `q-core-identity` for the selected document-kind skeleton; if either is missing, stop and install both with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-core-identity`. Design the remedy from confirmed findings; diagnose nothing new here — a missing or contradicted finding returns to `q-consult-current-state`.

## Canonical outputs

Create under `docs/consulting-workflow/`:

- `03-intervention-design.md`: authored, canonical for target state and recommendations — options considered and trade-offs, selected target state (processes, roles, operating model, governance, standards, measurement), rationale traced to finding IDs, adoption roadmap, risks and open items, deliverable map;
- simple form, `03-deliverables/<DEL-id>-<slug>.md`: one authored canonical file per deliverable;
- compound form, `03-deliverables/<DEL-id>/deliverable.md`: the one authored canonical meaning plus registered component files in the same directory; each component is `derived` or `supporting`, traces through `source_ref: "deliverable.md@<version>"`, and is never canonical;
- `03-working/<kind>-<slug>.md`: an authored supporting `working-document` used only for pre-deliverable structure or draft work;
- `03-evidence.yaml`: authored and supporting for design confirmations, client statements, and evidence created during intervention, using run-wide unique `EVD-nnn` IDs;
- `03-process-maps/<process>.mmd`: Mermaid source for confirmed target-state maps, authored, supporting for visual representation.

Every canonical deliverable uses `consulting-deliverable-frontmatter.schema.yaml`: `deliverable_id`, `deliverable_kind`, version, declared scope, `criteria_ref`, `source_findings`, status, classification, and components when compound. Select `deliverable_kind` from `../q-core-identity/references/document-kinds/` and use that kind's structural skeleton, never its example content. A component is part of the authored deliverable package; a client-facing DOCX or PDF uses the contract's `q-report-document` artifact channel over an exact `Baselined` or `Released` version and never becomes a component. Keep other design notes transient.

## Procedure

1. Load the confirmed assessment version, the engagement plan's deliverable register, and the accepted proposal's deliverable and acceptance objects; list the findings each deliverable must address.
2. Options: for each material design choice state two or more options with trade-offs against the engagement's criteria. An adopted ideation snapshot supplies options and their assumptions here, never a selected design.
3. Target state: define processes, roles, hand-offs, controls, systems and data needs, governance, standards, and measurement; trace each element to findings; use the diagram branch below for a confirmed target-state map.
4. Deliverables: select the registered `deliverable_kind`. When a deliverable is extensive or the client must approve its structure, first author a `working-document` with `kind: outline` from the `q-core-identity` skeleton, confirm it with the user and, when applicable, record client confirmation through a `q-consult-session` engagement record; archive it as `Archived` when the deliverable version is approved. This branch is triggered by size or request, never by default. Then author the simple or compound canonical form at its declared scope; cite findings and criterion IDs; state what it deliberately excludes; register each compound component against the canonical version.
5. Adoption roadmap and measurement: phases, owners, prerequisites, quick wins versus structural changes, leading and lagging indicators with baselines from the assessment where evidenced.
6. Commitment check: when the design implies work, cost, time, or deliverables beyond the accepted proposal, stop and return a change request through the orchestrator; do not absorb it.
7. Before confirming versions, when documentation QA is warranted, run the `q-review-docs` branch below and close or route every finding. Confirm target state, recommendations, and each deliverable version with the user; present the reviewed versions for the design gate.

Complete when every register deliverable at this stage's scope exists at an exact version with criteria by reference and traced findings, every recommendation traces to a finding or a declared assumption, and every commitment deviation is a change request.

## Delegated mechanics

When `confirmed-target-state-process-or-operating-model-needs-a-diagram` and `q-tool-mermaid` is installed, delegate authoring, validation, and rendering; keep the textual design canonical and the diagram supporting. If it is absent, `continue-with-the-canonical-textual-design-and-record-the-visual-capability-gap`.

When `client-facing-prose-is-drafted-and-the-user-requests-a-clarity-or-ai-pattern-pass-before-the-gate` and `q-tool-humanizer` is installed, pass the exact prose sections, their language, and a meaning lock — every claim, number, name, price, date, citation, and commitment that must not change — for `detect` and, if requested, `rewrite` or `improve`; adopt a revision into this owned artifact only after checking the lock, and keep the pass out of any derived render. If it is absent, `keep-the-prose-as-authored-and-record-that-no-humanization-pass-ran`.

When `deliverable-versions-are-ready-for-confirmation-and-documentation-qa-is-warranted-before-the-design-gate` and `q-review-docs` is installed, pass the exact deliverable versions and acceptance-criterion refs for read-only documentation QA; apply owner-routed corrections here and rerun QA before the design gate. If it is absent, `continue-with-owner-review-against-the-acceptance-criteria-and-record-the-qa-gap`.

When `a-deliverable-component-is-a-calculation-model-or-data-table-the-client-will-operate` and `q-tool-spreadsheet` is installed, pass a meaning-locked `spreadsheet_request`, retain canonical meaning in `deliverable.md`, and register the returned file as a derived component. If it is absent, `author-the-table-in-markdown-and-record-the-spreadsheet-capability-gap`.

When `a-deliverable-component-must-be-delivered-as-an-editable-docx-template-or-form` and `q-tool-document` is installed, pass the exact canonical source and authorized destination in a `document_request`; register the DOCX as derived with provenance. If it is absent, `author-the-content-in-markdown-and-record-the-docx-capability-gap`.

When `a-deliverable-component-is-a-training-or-workshop-deck` and `q-report-deck` is installed, pass the exact canonical source version and presentation intent; keep the deck derived and register it as a component. If it is absent, `author-the-slide-outline-in-markdown-and-record-the-deck-capability-gap`.

## Boundaries

Never accept a deliverable, edit the assessment or the proposal, or present a recommendation without a traced finding or a declared assumption. A `rework` disposition from acceptance returns here with its items and produces a new deliverable version.

## Stage result

Return a valid `stage_result`: the intervention design, canonical deliverables, `03-evidence.yaml`, working documents, supporting components, and process-map sources in `authored_outputs` under their declared authority, with derived components in `derived_outputs` (or the matching update fields on rework), all with type, path, `Working` lifecycle, and exact source refs; design decisions in `decisions_added_or_updated`; adoption risks in `risks_added_or_updated`; a change request as a `blockers` entry naming the deviating commitment; user confirmations in `required_user_actions`; `q-consult-acceptance` as `next_recommended_action`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the design as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
