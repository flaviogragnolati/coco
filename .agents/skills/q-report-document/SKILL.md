---
name: q-report-document
description: "Render approved Quasar report content into traceable Markdown, editable DOCX, and matching PDF documents. Use when a baselined report source must be mapped into written channels, branded consistently, validated for content and layout, reconciled after manual edits, and registered without acquiring semantic authority. Requires the q-core-contract and q-report-deck companions and may use q-tool-document or q-tool-pdf for verified format mechanics."
---

# Generate a Quasar report

Render written report channels from one baselined report source. Keep the source as semantic authority and treat Markdown, DOCX, and PDF as regenerable derivatives with `semantic_authority: none`.

Generate Markdown directly from the approved mapping. For DOCX or PDF, use only runtimes whose requested generation, rendering, and inspection capabilities are verified in the current environment. `q-tool-document` and `q-tool-pdf` are optional mechanics collaborators; installation alone proves neither DOCX creation nor PDF conversion or rendering.

Read the `q-core-contract` companion for shared governance and its `references/report-source.schema.yaml`, and the general identity, typography, accessibility, confidentiality, and source rules in [Quasar presentation identity](../q-report-deck/references/identidad-visual.md); if either companion is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-report-deck`. Do not apply slide-specific canvas or layout patterns to documents.

## Inputs

Require:

- one schema-valid, `Baselined` report source;
- exact report-source ID and version;
- requested formats from `md`, `docx`, and `pdf`;
- language, confidentiality, delivery status, and applicable brand assets;
- a document runtime capable of producing and rendering every requested binary format.

If the runtime cannot produce or visually inspect a requested DOCX or PDF, report the missing requested format and block that format. Produce Markdown or another supported subset only when the user explicitly approves a partial release; name omitted formats and never claim full completion.

## Mapping and rendering

1. Validate the source, requested formats, and source approval.
2. Create `report-document-mapping.yaml` with source section IDs, content-block IDs, document headings, order, visual intent, and format coverage.
3. Confirm any material document-plan choice that affects emphasis, omission, or reading order.
4. Generate Markdown, DOCX, and PDF from the same source version and mapping. Preserve facts, units, dates, qualifications, source IDs, and report status exactly.
5. Render DOCX and PDF and inspect every page. Validate structure, headings, tables, charts, pagination, overflow, typography, contrast, accessibility, confidentiality, and source attribution.
6. Compare all formats against the source and mapping. Correct channel-only defects and regenerate affected derivatives.
7. Obtain release approval separately from publication or external sending.

When `requested-report-docx-mechanics-need-creation-inspection-editing-comment-redline-conversion-or-validation` and `q-tool-document` is installed, pass its `document_request` the exact Report Source and mapping versions, approved content or DOCX path, authorized output path, forbidden narrative changes, preservation requirements, and required structural and rendered checks. Keep narrative selection, document mapping, brand, cross-format comparison, release approval, and artifact deltas here. If the tool is absent, `use-only-a-separately-verified-local-document-route-or-block-the-docx-and-require-explicit-partial-release`.

When `requested-document-channel-includes-pdf-inspection-or-validation` and `q-tool-pdf` is installed, pass its `pdf_request` the exact Report Source and mapping versions, editable-source path, required preservation checks, authorized PDF path, and `overwrite: false` unless replacement was explicitly approved. Keep narrative selection, document mapping, branding, PDF production through this skill's verified local route (own builder or `q-tool-document` conversion), cross-format comparison, release approval, and artifact deltas here; `q-tool-pdf` inspects and validates the produced PDF and its `create` route is programmatic-only, never a DOCX-to-PDF converter. If the tool is absent, `use-only-a-separately-verified-local-pdf-route-or-block-the-pdf-and-require-explicit-partial-release`.

When `approved-report-visual-intent-needs-a-mermaid-derived-asset` and `q-tool-mermaid` is installed, provide the exact report-source blocks and document profile, then retain mapping, layout, brand, and page QA here. If the tool is absent, `continue-with-the-approved-textual-visual-intent-or-block-a-required-format`.

When `approved-document-visual-intent-references-an-exact-c4-source-or-view` and `q-tool-c4` is installed, request validation or rendering of the exact C4 source version and view ID for the document profile. Preserve element and relationship meaning; own only page placement, crop, caption, brand, and legibility. If the tool is absent, `use-the-approved-c4-render-or-textual-intent-and-block-any-required-missing-asset`. Never reconstruct C4 source from an SVG, PNG, PDF, or screenshot.

Keep Markdown and DOCX editable, but not authoritative. Return semantic edits to `q-report-source`; after approval, regenerate every affected document and deck channel.

## Outputs and result

Register `report-document-mapping.yaml` as authored and supporting. Register Markdown, DOCX, and report PDF as derived with `semantic_authority: none`, exact source references, and generation provenance. Keep render previews and working validation notes transient.

Return a valid `stage_result` with produced and missing formats, source and mapping IDs, validation evidence, known limitations, release and publication status, blockers, stale artifacts, and one next action. Standalone execution never updates global state or the artifact index.
