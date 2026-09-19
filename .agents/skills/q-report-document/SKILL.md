---
name: q-report-document
description: "Render approved Quasar content into traceable Markdown, editable DOCX, and matching PDF documents. Use when a baselined report source needs written channels, or when one exact canonical Baselined or Released artifact plus its deliverable kind needs a pass-through artifact channel, with branded layout, validation, exact provenance, and no acquired semantic authority. Requires q-core-contract and q-core-identity and may use q-tool-document or q-tool-pdf for verified mechanics."
---

# Generate a Quasar report

Render written channels from either one baselined report source or one exact canonical artifact. Keep the input as semantic authority and treat Markdown, DOCX, and PDF as regenerable derivatives with `semantic_authority: none`.

Generate Markdown directly from the approved mapping. For DOCX or PDF, use only runtimes whose requested generation, rendering, and inspection capabilities are verified in the current environment. `q-tool-document` and `q-tool-pdf` are optional mechanics collaborators; installation alone proves neither DOCX creation nor PDF conversion or rendering.

Read the `q-core-contract` companion for shared governance and its `references/report-source.schema.yaml`, and [`q-core-identity` document system](../q-core-identity/references/document-system.md) for identity, typography, accessibility, confidentiality, and source rules; if either companion is missing, stop and install both with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-core-identity`. Do not apply slide-specific canvas or layout patterns to documents.

## Inputs

Require exactly one input mode:

- reporting channel: one schema-valid `Baselined` report source and its exact ID and version; or
- artifact channel: one exact canonical artifact in `Baselined` or `Released`, its artifact ID and version, owner, classification, and `deliverable_kind` from `q-core-identity`;
- requested formats from `md`, `docx`, and `pdf`;
- language, confidentiality, delivery status, and applicable brand assets;
- a document runtime capable of producing and rendering every requested binary format.

If the runtime cannot produce or visually inspect a requested DOCX or PDF, report the missing requested format and block that format. Produce Markdown or another supported subset only when the user explicitly approves a partial release; name omitted formats and never claim full completion.

## Mapping and rendering

1. Validate the selected input mode, requested formats, lifecycle, and source approval. The artifact channel never produces a report source and never changes the source lifecycle.
2. Create `report-document-mapping.yaml`. For a report source, map source section and content-block IDs. For a canonical artifact, use a pass-through mapping from its sections to the matching `deliverable_kind` skeleton and document profile; do not re-narrate, omit, or reclassify meaning.
3. Confirm any material document-plan choice that affects emphasis, omission, or reading order.
4. Generate Markdown, DOCX, and PDF from the same source version and mapping. Preserve facts, units, dates, qualifications, source IDs, and report status exactly.
5. Render DOCX and PDF and inspect every page. Validate structure, headings, tables, charts, pagination, overflow, typography, contrast, accessibility, confidentiality, and source attribution.
6. Compare all formats against the source and mapping. Correct channel-only defects and regenerate affected derivatives.
7. Obtain release approval separately from publication or external sending.

When `requested-report-docx-mechanics-need-creation-inspection-editing-comment-redline-conversion-or-validation` and `q-tool-document` is installed, pass its `document_request` the exact Report Source and mapping versions, approved content or DOCX path, authorized output path, forbidden narrative changes, preservation requirements, and required structural and rendered checks. Keep narrative selection, document mapping, brand, cross-format comparison, release approval, and artifact deltas here. If the tool is absent, `use-only-a-separately-verified-local-document-route-or-block-the-docx-and-require-explicit-partial-release`.

When `requested-document-channel-includes-pdf-inspection-or-validation` and `q-tool-pdf` is installed, pass its `pdf_request` the exact Report Source and mapping versions, editable-source path, required preservation checks, authorized PDF path, and `overwrite: false` unless replacement was explicitly approved. Keep narrative selection, document mapping, branding, PDF production through this skill's verified local route (own builder or `q-tool-document` conversion), cross-format comparison, release approval, and artifact deltas here; `q-tool-pdf` inspects and validates the produced PDF and its `create` route is programmatic-only, never a DOCX-to-PDF converter. If the tool is absent, `use-only-a-separately-verified-local-pdf-route-or-block-the-pdf-and-require-explicit-partial-release`.

When `approved-report-visual-intent-needs-a-mermaid-derived-asset` and `q-tool-mermaid` is installed, provide the exact report-source blocks and document profile, then retain mapping, layout, brand, and page QA here. If the tool is absent, `continue-with-the-approved-textual-visual-intent-or-block-a-required-format`.

When `approved-document-visual-intent-references-an-exact-c4-source-or-view` and `q-tool-c4` is installed, request validation or rendering of the exact C4 source version and view ID for the document profile. Preserve element and relationship meaning; own only page placement, crop, caption, brand, and legibility. If the tool is absent, `use-the-approved-c4-render-or-textual-intent-and-block-any-required-missing-asset`. Never reconstruct C4 source from an SVG, PNG, PDF, or screenshot.

Keep Markdown and DOCX editable, but not authoritative. Return semantic edits to `q-report-source` when the input is a report source; return them to the artifact owner named in provenance when the input is a canonical artifact. After approval, regenerate every affected channel.

## Outputs and result

Register `report-document-mapping.yaml` as authored and supporting. Register Markdown, DOCX, and PDF as derived with `semantic_authority: none`, exact source references, generation provenance, and the maximum classification inherited from their sources. Artifact-channel outputs never enter an execution release. Keep render previews and working validation notes transient.

Return a valid `stage_result` with produced and missing formats, source and mapping IDs, validation evidence, known limitations, release and publication status, blockers, stale artifacts, and one next action. Standalone execution never updates global state or the artifact index.
