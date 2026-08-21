# Commercial document quality gates

## 1. Entry

- Validate `02-proposal-source.yaml` against the Skill 2 schema.
- Resolve all document interface references.
- Match source version and SHA-256 in `04-document-mapping.md`.
- Confirm draft or issued mode and internal or client audience.
- Stop an issued run when essential commercial content or authority is missing.

## 2. Commercial content

- Preserve client, project, version, status, issue date, and validity.
- Preserve every displayed amount, currency, percentage, duration, and condition.
- Require bounded scope and concrete exclusions.
- Require acceptance for every deliverable.
- Require a milestone or verifiable condition for every payment.
- Detect contradictions among scope, deliverables, schedule, team, price, payments, warranty, and terms.
- Exclude non-publishable internal information.
- Include bundled general terms only with matching canonical and mapping references.
- Mark legal content for professional review unless approval is recorded.

## 3. DOCX

Run `scripts/validate_document.py` and require:

- A4 in every section.
- Real Heading 1/2 styles.
- Cover, interior header, footer, page numbering, and visible provenance.
- Quasar-only brand assets and approved contact data.
- Editable acceptance and signature controls when included.
- Structured tables with explicit geometry.
- Required localized sections.
- Matching source version and hash in core properties and visible text.
- No placeholders in issued mode.

## 4. Visual review

Use a verified local document runtime to render and inspect every page. `q-tool-document` may perform bounded DOCX mechanics and validation, and `q-tool-pdf` may perform PDF mechanics and inspection, only when each tool's `doctor` output proves a viable local route for the required operation. Correct and rerender until there are no clipped elements, overlaps, missing glyphs, orphan headings, unreadable table splits, compressed rows, avoidable blank areas, misaligned brand elements, inconsistent hierarchy, or legacy logos. Block an issued format when rendering or inspection is unavailable.

## 5. PDF and cross-format consistency

- Generate PDF only from the validated DOCX.
- Verify that PDF text is extractable or record the limitation.
- Compare client, project, version, validity, alternatives, amounts, deliverables, milestones, and source reference.
- Require the PDF when the mapping says `pdf_required: true`.
- Do not deliver independent DOCX and PDF generations.

## 6. Workflow integrity

- Classify mapping as authored/supporting and outputs as derived/none.
- Record sources, hashes, generator, date, and `do_not_edit`.
- Return `authored_outputs`, `derived_outputs`, `updated_outputs`, `traceability_delta`, `decisions_added_or_updated`, and `risks_added_or_updated` with `global_state_updated: false` and `reconciliation_required: true`.
- Let only the root orchestrator reconcile those deltas into the artifact index, workflow state, traceability, decisions, and risks.
- Mark stale outputs when the source changes.
- Preserve immutable releases.

Result: `Passed`, `Passed with warnings`, or `Failed`. Any source, schema, version, hash, semantic divergence, or immutability error blocks completion.
