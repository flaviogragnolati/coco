---
name: q-report-document
description: "Render approved Quasar report content into traceable Markdown, editable DOCX, and matching PDF documents. Use when a baselined report source must be mapped into written channels, branded consistently, validated for content and layout, reconciled after manual edits, and registered without acquiring semantic authority. Requires the q-core-contract and q-report-deck companions."
---

# Generate a Quasar report

Render written report channels from one baselined report source. Keep the source as semantic authority and treat Markdown, DOCX, and PDF as regenerable derivatives with `semantic_authority: none`.

Use the installed document skill and document runtime for DOCX/PDF generation, rendering, and visual QA. Generate Markdown directly from the approved mapping when no binary format is requested.

Read the `q-core-contract` companion for shared governance and its `references/report-source.schema.yaml`, and the general identity, typography, accessibility, confidentiality, and source rules in [Quasar presentation identity](../q-report-deck/references/identidad-visual.md); if either companion is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-report-deck`. Do not apply slide-specific canvas or layout patterns to documents.

## Inputs

Require:

- one schema-valid, `Baselined` report source;
- exact report-source ID and version;
- requested formats from `md`, `docx`, and `pdf`;
- language, confidentiality, delivery status, and applicable brand assets;
- a document runtime capable of producing and rendering every requested binary format.

If the runtime cannot produce or visually inspect a requested DOCX or PDF, report the missing requested format and block that format. Do not claim full completion from Markdown alone unless the user explicitly approves a partial release.

## Mapping and rendering

1. Validate the source, requested formats, and source approval.
2. Create `report-document-mapping.yaml` with source section IDs, content-block IDs, document headings, order, visual intent, and format coverage.
3. Confirm any material document-plan choice that affects emphasis, omission, or reading order.
4. Generate Markdown, DOCX, and PDF from the same source version and mapping. Preserve facts, units, dates, qualifications, source IDs, and report status exactly.
5. Render DOCX and PDF and inspect every page. Validate structure, headings, tables, charts, pagination, overflow, typography, contrast, accessibility, confidentiality, and source attribution.
6. Compare all formats against the source and mapping. Correct channel-only defects and regenerate affected derivatives.
7. Obtain release approval separately from publication or external sending.

Keep Markdown and DOCX editable, but not authoritative. Return semantic edits to `q-report-source`; after approval, regenerate every affected document and deck channel.

## Outputs and result

Register `report-document-mapping.yaml` as authored and supporting. Register Markdown, DOCX, and report PDF as derived with `semantic_authority: none`, exact source references, and generation provenance. Keep render previews and working validation notes transient.

Return a valid `stage_result` with produced and missing formats, source and mapping IDs, validation evidence, known limitations, release and publication status, blockers, stale artifacts, and one next action. Standalone execution never updates global state or the artifact index.
