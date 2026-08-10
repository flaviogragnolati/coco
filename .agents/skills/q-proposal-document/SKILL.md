---
name: q-proposal-document
description: "Generate, validate, reconcile, and release branded Quasar proposal DOCX and PDF files from the canonical proposal source. Use for the document channel to map content, preserve IDs and provenance, run render-based visual QA, and reprocess manually edited documents without silently changing commercial meaning. Requires the q-core-contract companion."
---

# Commercial proposal document

Read the `q-core-contract` companion for shared governance and the references in this directory; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Use the document runtime required by the workspace for rendering and visual QA.

## Inputs

Require:

- versioned `02-proposal-source.yaml`;
- proposal release or draft status;
- `references/04-document-mapping.schema.yaml`;
- brand and style assets;
- applicable general terms;
- any manually edited DOCX being reconciled.

## Outputs and authority

Create:

- `04-document-mapping.yaml`: authored, supporting channel mapping;
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

## Manual edit reconciliation

Do not track partial hashes or editable fields in this version. When a user edits a DOCX:

1. accept the edited document as an input;
2. compare it with the canonical source and mapping;
3. classify differences as semantic or channel-only;
4. return semantic differences to `q-proposal-design`;
5. reconcile approved source changes;
6. regenerate affected derivatives.

Return a valid `stage_result`; standalone execution does not update global state or artifact index.
