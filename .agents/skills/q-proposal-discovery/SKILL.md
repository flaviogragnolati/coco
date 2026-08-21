---
name: q-proposal-discovery
description: "Transform client notes, transcripts, emails, and documents into a traceable Discovery Brief with problem, context, preliminary scope, constraints, engagement possibilities, assumptions, risks, pending matters, follow-up questions, and proposal readiness. Use as stage 1 of the proposal workflow. Requires the q-core-contract companion. Part of the Quasar AI delivery skills."
---

# Proposal discovery

Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Inputs and evidence

Accept raw meeting evidence and existing project records. Preserve source references, dates, participants, and document versions. Separate:

- confirmed client statements;
- supported inferences;
- working assumptions;
- unresolved questions;
- contradictions.

Never fabricate a decision, budget, deadline, acceptance criterion, or technical confirmation.

An adopted ideation snapshot may contribute candidate problem frames, open questions, assumptions, and interpretation risks, each marked as a proposal from that session. It never supplies a client fact, budget, deadline, confirmed scope, or readiness judgment, and it enters only through the orchestrator's `adopt-as-supporting-input` disposition with the exact snapshot version.

An approved Research Baseline may enter as `external-research` only when the root orchestrator records `adopt-as-proposal-input` and supplies the exact baseline ID and version. Keep its claims supporting, preserve its `as_of` and limitations, and do not let it overwrite contrary client evidence. A retained or deferred baseline is not an input to the active Discovery Brief.

## Delegated mechanics

- When `client-evidence-arrives-as-pdf-and-needs-verified-extraction` and `q-tool-pdf` is installed, pass one `pdf_request` with the exact source path, pages, requested extraction, authorized output path, and `overwrite: false`; register the extraction as derived with its provenance and cite the source, not the extract. If it is absent, `continue-with-manually-supplied-excerpts-and-record-the-extraction-gap`.
- When `client-evidence-arrives-as-docx-and-needs-verified-extraction` and `q-tool-document` is installed, pass one `document_request` the same way. If it is absent, `continue-with-manually-supplied-excerpts-and-record-the-docx-extraction-gap`.
- When `client-evidence-arrives-as-xlsx-or-csv-and-needs-verified-extraction` and `q-tool-spreadsheet` is installed, pass one `spreadsheet_request` naming sheets, ranges, and whether formulas or values are needed. If it is absent, `continue-with-manually-supplied-figures-and-record-the-extraction-gap`.

Extraction never adds a source: a supplied file is evidence by the user's supply, and its extract is derived with `semantic_authority: none`.

## Canonical output

Create a versioned Discovery Brief as an authored, canonical `Working` artifact for discovered client context. Include stable IDs for:

- client problem and desired outcomes;
- stakeholders, users, and decision makers;
- current situation and pain points;
- preliminary scope, exclusions, and constraints;
- candidate engagement model;
- known deliverables and success signals;
- budget or schedule information only when evidenced;
- assumptions, decisions, risks, contradictions, and open questions;
- source traceability, each supplied file carrying `extraction: {tool: q-tool-pdf | q-tool-document | q-tool-spreadsheet | manual | none, provenance: "..."}`;
- proposal readiness and rationale.

Create a concise follow-up question set only for gaps that materially affect proposal commitments.

## Procedure

1. Normalize evidence without erasing disagreement.
2. Identify the client's real decision and the value sought.
3. Classify possible delivery as software, consulting, assessment, training, managed service, mixed, or unresolved.
4. Map preliminary scope and constraints.
5. Record uncertainty with owner and impact.
6. Evaluate readiness.
7. Validate traceability and internal consistency.

When `material-supported-inference-adopted-external-research-or-quantitative-or-causal-claim-could-mislead-a-commercial-commitment` and `q-review-evidence` is installed, send only that bounded inference or claim, its exact source locators, adopted Research Baseline context when applicable, contradictions, and the commitment it could affect. Reconcile the transient diagnostic into assumptions, risks, contradictions, or `follow-up-questions`; Discovery retains readiness and the canonical brief. Never grade a confirmed client statement as scientific evidence, reuse Proposal Source `maturity` as evidence confidence, or delegate the readiness gate. If the reviewer is absent, `preserve-current-discovery-classification-add-targeted-follow-up-questions-and-report-expanded-evidence-review-unavailable`.

When adopted external research changes discovered context, add its exact baseline reference through this stage's owned Discovery Brief. Never let the research workflow edit the brief directly.

## Readiness gate

Return `completed` when a responsible commercial proposal can be drafted with explicit assumptions. Return `blocked` when missing information would make solution, scope, price, schedule, or responsibilities misleading.

Return a valid `stage_result`; standalone execution requires orchestration reconciliation.
