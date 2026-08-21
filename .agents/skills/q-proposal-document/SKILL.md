---
name: q-proposal-document
description: "Generate, validate, reconcile, and release branded Quasar proposal DOCX and PDF files from the canonical proposal source. Use for the document channel to author one Markdown mapping with YAML frontmatter, preserve IDs and provenance, run render-based visual QA, and reprocess manually edited documents without silently changing commercial meaning. Requires the q-core-contract and q-proposal-design companions and may use q-tool-document or q-tool-pdf for verified format mechanics; an installed skill is not proof that its local runtime is healthy."
---

# Commercial proposal document

Read the `q-core-contract` companion for shared governance, `q-proposal-design` for the canonical Proposal Source contract, and the references in this directory; if either companion is missing, stop and install both with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-proposal-design`. Use only runtimes whose requested generation, rendering, and inspection capabilities are verified in the current environment. `q-tool-document` and `q-tool-pdf` are optional mechanics collaborators; installation alone proves neither DOCX nor PDF capability.

## Inputs

Require:

- versioned `02-proposal-source.yaml`;
- proposal release or draft status;
- the `q-proposal-design` source schema;
- `references/04-document-mapping.schema.yaml`;
- brand and style assets;
- applicable general terms;
- any manually edited DOCX being reconciled.

## Outputs and authority

Create:

- `04-document-mapping.md` with YAML frontmatter: authored, supporting channel mapping;
- editable DOCX: derived with no semantic authority;
- matching delivery PDF: derived with no semantic authority;
- validation report and provenance;
- render previews as transient QA evidence.

The canonical proposal source owns scope, price, schedule, and terms.

## Scripts

- Use `scripts/build_document.py` as the public CLI.
- Use `scripts/document_builder.py` as the internal document construction module.
- Use `scripts/validate_document.py` for structural and content validation.
- Use `scripts/simple_yaml.py` only for the supported local YAML subset.

Keep imports aligned with these names. Run each affected CLI with `--help` and execute its tests or representative generation flow after changes.

## Procedure

1. Validate the proposal source and mapping.
2. Build the DOCX from canonical objects and stable IDs.
3. Render and inspect every page.
4. Validate content, tables, totals, pagination, typography, headers, footers, and provenance.
5. Generate the PDF from the verified DOCX.
6. Mark a release only after explicit approval.
7. Register DOCX and PDF as derived artifacts with source references.

When `requested-proposal-docx-mechanics-need-inspection-editing-comment-redline-conversion-or-validation` and `q-tool-document` is installed, pass its `document_request` the exact Proposal Source and mapping versions, validated source or DOCX path, authorized output path, forbidden commercial changes, preservation requirements, and required structural and rendered checks. Keep document mapping, brand, content selection, cross-format comparison, release approval, and artifact deltas here. If the tool is absent, `use-only-a-separately-verified-local-document-route-or-block-the-docx-and-require-explicit-partial-release`.

When `requested-proposal-channel-includes-pdf-inspection-or-validation` and `q-tool-pdf` is installed, pass its `pdf_request` the exact Proposal Source and mapping versions, the validated DOCX path, required preservation and comparison checks, authorized PDF path, and `overwrite: false` unless replacement was explicitly approved. Keep commercial meaning, DOCX-to-PDF source order, PDF production through this skill's verified local route (own builder or `q-tool-document` conversion), release approval, and artifact deltas here; `q-tool-pdf` inspects and validates the produced PDF and its `create` route is programmatic-only, never a DOCX-to-PDF converter. If the tool is absent, `use-only-a-separately-verified-local-pdf-route-or-block-the-pdf-and-require-explicit-partial-release`.

Use this skill's builder for the branded proposal and route bounded DOCX mechanics through `q-tool-document` when installed. If `python-docx`, Pillow, JSON Schema Draft 2020-12 support, YAML parsing, conversion, rendering, or visual inspection remains unavailable on the selected route, identify the missing capability and block only the affected format. A mapping-only result or another supported subset requires explicit partial-release approval and must name every omitted output.

## Manual edit reconciliation

Do not track partial hashes or editable fields in this version. When a user edits a DOCX:

1. accept the edited document as an input;
2. compare it with the canonical source and mapping;
3. classify differences as semantic or channel-only;
4. return semantic differences to `q-proposal-design`;
5. reconcile approved source changes;
6. regenerate affected derivatives.

Return a valid `stage_result`: the mapping in `authored_outputs`, DOCX and PDF in `derived_outputs`, a reconciled document in `updated_outputs`, plus `traceability_delta`, `decisions_added_or_updated`, and `risks_added_or_updated`. Set `global_state_updated: false` and `reconciliation_required: true`; the root orchestrator alone applies those deltas. Standalone execution never updates global state or the artifact index.
