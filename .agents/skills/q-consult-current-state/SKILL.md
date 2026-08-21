---
name: q-consult-current-state
description: "Assess a client's current state for a Quasar consulting engagement: map as-is processes, roles, hand-offs, systems, controls, metrics, and pain points from interviews, documents, data, and observed systems; register every piece of evidence; state diagnostic findings with confidence and gaps. Use for process mapping, current-state or gap assessment, and to validate diagnostic hypotheses; it never designs the remedy. Part of the Quasar AI delivery skills."
---

# Current-state assessment

Read the `q-core-contract` companion for shared governance, especially its Consulting execution section; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Assess and diagnose the client's own current state after the engagement is accepted; design nothing. Use `q-code-explore` for a codebase, `q-research-investigate` for an external uncertainty, and `q-proposal-discovery` for pre-sale context — this stage owns none of those.

## Canonical outputs

Create under `docs/consulting-workflow/`:

- `02-current-state-assessment.md`: authored, canonical for the assessed current state — scope, textual as-is maps, roles and hand-offs, systems and data, controls, metrics where evidenced, pain points, diagnostic findings, hypothesis status, gaps, next questions;
- `02-evidence-register.yaml`: authored, supporting — one entry per evidence item a finding cites;
- `02-process-maps/<process>.mmd`: Mermaid source, authored, supporting for visual representation, only for confirmed maps.

Evidence register entry:

```yaml
- evidence_id: EVD-001
  kind: interview | document | data-extract | system-observation | client-statement | external-research
  source: "who or what, date, locator (path, page, sheet, URL, meeting)"
  classification: public | internal | confidential | restricted
  extraction: {tool: q-tool-pdf | q-tool-document | q-tool-spreadsheet | manual | none, provenance: "..."}
  supports: [FND-001]
  limitations: "..."
```

Keep interview notes and extraction scratch transient.

## Procedure

1. Scope: take processes, units, boundaries, and questions from the engagement plan; state what is out of scope.
2. Gather evidence: record each interview, observation, or data pull the agent cannot conduct as a `required_user_action` and register the outcome the user reports; extract client documents through the delegated mechanics below; register every item before citing it.
3. Map the as-is: per process, actors, trigger, steps, inputs and outputs, systems, hand-offs, controls, exceptions, and cycle time or volume where evidenced. Write the textual map first; author Mermaid source only for a confirmed map.
4. Diagnose: state each finding with its evidence IDs, confidence (`high`, `medium`, `low`), the observation that would refute it, and its impact. Every finding cites registered evidence or remains a hypothesis with its gap. Mark each hypothesis from an adopted ideation snapshot `validated`, `refuted`, or `open` with its evidence.
5. Review: when a conclusion rests on an inference or a quantitative or causal claim, use the evidence-review branch below; separate confirmed client statements from measured facts.
6. Confirm findings, confidence, and declared evidence gaps with the user; present for the assessment gate.

Complete when every finding cites registered evidence or is a marked hypothesis, every in-scope process has a map or a named gap, and every open evidence need is a required user action.

## Delegated mechanics

- When `client-evidence-arrives-as-pdf-and-needs-verified-extraction` and `q-tool-pdf` is installed, pass one `pdf_request` with the exact source path, pages, requested extraction, authorized output path, and `overwrite: false`; register the extraction as derived with its provenance. If it is absent, `continue-with-manually-supplied-excerpts-and-record-the-extraction-gap`.
- When `client-evidence-arrives-as-docx-and-needs-verified-extraction` and `q-tool-document` is installed, pass one `document_request` the same way. If it is absent, `continue-with-manually-supplied-excerpts-and-record-the-docx-extraction-gap`.
- When `client-evidence-arrives-as-xlsx-or-csv-and-needs-verified-extraction` and `q-tool-spreadsheet` is installed, pass one `spreadsheet_request` naming sheets, ranges, and whether formulas or values are needed. If it is absent, `continue-with-manually-supplied-figures-and-record-the-extraction-gap`.
- When `confirmed-process-or-stakeholder-map-needs-a-diagram` and `q-tool-mermaid` is installed, delegate authoring, validation, and rendering of the confirmed map; keep the textual map canonical and the diagram supporting. If it is absent, `continue-with-the-canonical-textual-map-and-record-the-visual-capability-gap`.
- When `an-assessed-process-is-embodied-in-software-the-user-can-open` and `q-code-explore` is installed, route one bounded orientation question with the process as lens and register its summary as a `system-observation` evidence entry. If it is absent, `continue-with-interviews-and-documents-and-record-the-system-orientation-gap`.
- When `a-diagnostic-conclusion-rests-on-a-supported-inference-or-quantitative-or-causal-claim-that-could-mislead-a-recommendation` and `q-review-evidence` is installed, send only that bounded claim, its evidence IDs, and the recommendation it could affect; reconcile the transient diagnostic into the finding's confidence and gaps. If it is absent, `keep-the-conclusion-as-a-hypothesis-with-its-evidence-gap-and-report-expanded-evidence-review-unavailable`.

Every extraction, diagram, or diagnostic is derived or transient; this stage keeps meaning, confidence, and the artifact-index delta.

## Boundaries

Never invent a metric, treat one interview as a fact, promote a hypothesis without evidence, record client-confidential material beyond its classification, or design the target state here — a remedy belongs to `q-consult-intervention`.

## Stage result

Return a valid `stage_result`: the assessment, evidence register, and process-map sources in `authored_outputs` with type, path, `Working` lifecycle, and the engagement plan version as source ref; each finding's confidence change or evidence gap in `risks_added_or_updated` when it threatens a recommendation; interviews, observations, and data pulls in `required_user_actions`; a missing evidence access or unconfirmed finding in `blockers`; `q-consult-intervention` or a targeted evidence request as `next_recommended_action`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the assessment as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
