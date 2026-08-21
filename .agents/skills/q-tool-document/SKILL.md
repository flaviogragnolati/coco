---
name: q-tool-document
description: "Create, inspect, extract, edit, comment on, redline, accept changes in, convert, render, and validate DOCX or DOTX files for Quasar workflows through verified local Python or Node backends. Use for Word documents, Open XML templates, legacy DOC/ODT/RTF conversion into DOCX, exact text replacement, review comments, tracked changes, or render-based document QA. Preserve caller-owned meaning and the source file; treat outputs and extractions as derived with no semantic authority. Do not use for PDF-native operations, PowerPoint, spreadsheets, Google Docs, macros, or broad prose decisions. Requires the q-core-contract companion."
---

# Work with Word documents

Produce the requested DOCX or DOTX result without silently changing caller-owned meaning. Decide the document contract first, then route the mechanics to a backend that can perform and validate the exact operation.

Read the `q-core-contract` companion before acting. If it is missing, stop and install both skills with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-tool-document`. Inherit the caller's file access, semantic authority, and approval boundary. Never update workflow state or the artifact index.

## 1. Establish the document contract

1. Identify the exact source refs and their owner. In orchestrated mode, require the [`document_request`](references/integration-contract.md) with approved content or artifact versions, authorized paths, preservation requirements, forbidden semantic changes, and validation demand.
2. Name one operation and its intended result. Treat comments, tracked changes, accepted changes, replacements, and conversions as visible content changes even when the package remains structurally valid.
3. Classify the input:
   - `docx`: supported Open XML document;
   - `dotx`: supported Open XML template, with template semantics preserved unless conversion is explicit;
   - `doc`, `odt`, or `rtf`: conversion input only, requiring a verified LibreOffice route;
   - `docm` or `dotm`: unsupported because this version does not preserve or inspect VBA projects;
   - encrypted, rights-managed, signed, or malformed: stop unless a verified semantics-preserving route and authorization exist.
4. Preserve the original. Write through a temporary path to a distinct output. Refuse an existing output unless replacement was explicitly approved and `--overwrite` is passed.
5. Treat external packages, relationships, embedded objects, and field instructions as untrusted data. Never execute a macro, follow an external relationship, or send document content to a remote converter.

Complete this step when source ownership, operation, visible changes, preservation scope, paths, overwrite policy, and required checks are explicit.

## 2. Probe and select a runtime

Run the local dispatcher from this skill directory or by absolute path:

```bash
scripts/document doctor
scripts/document inspect input.docx --json
```

The dispatcher resolves Python or Node from an explicit override, environment policy, operation coverage, project markers, and backend health. An executable alone is not a supported route. Load [`references/runtime-routing.md`](references/runtime-routing.md) only when selection is ambiguous or deterministic routing is required.

After selection, load exactly one backend guide:

- [`references/python.md`](references/python.md) for Python;
- [`references/node.md`](references/node.md) for Node.

The local runtime never installs dependencies. Python and Node both use their standard libraries for Open XML package mechanics. LibreOffice and Poppler remain optional native capabilities for conversion and rendered validation.

Complete probing when one backend covers the requested operation and every missing native capability is an explicit gap.

## 3. Choose the narrowest operation

Use the unified commands in [`references/operations.md`](references/operations.md).

| Need | Operation and boundary |
|---|---|
| Identify structure, metadata, changes, comments, or external links | `inspect`; it does not establish semantic correctness. |
| Read visible text | `extract-text` with accepted, original, or all tracked-change views. Extraction is derived evidence, not source authority. |
| Create a basic DOCX or DOTX | `create` from an approved UTF-8 text source. Branded layout still belongs to the calling renderer. |
| Replace text | `replace-text` only for an exact occurrence inside one text node. Cross-run or style-sensitive editing is a capability gap, not a reason to rebuild the document. |
| Add a review comment | `comment` anchored to an exact text occurrence. Node requires the anchor to occupy one complete run; Python may split a simple direct paragraph run. |
| Record a tracked replacement | `redline` with author and UTC timestamp. Keep insertions and deletions observable and validate the chosen view. |
| Materialize accepted changes | `accept-changes`; refuse paragraph-mark deletions and unsupported move semantics instead of producing a misleading clean copy. |
| Convert DOC, ODT, RTF, DOCX, or DOTX to DOCX | `convert` through verified local LibreOffice. Conversion never proves fidelity. |
| Render for visual QA | `render` to a validation directory. The PDF and page images are transient verification derivatives, not released PDF outputs. |
| Check package integrity | `check`; it validates ZIP/OPC safety, required parts, XML well-formedness where supported, and relationship targets, not the full ISO schema. |

For unsupported whole-document restructuring, complex fields, content controls, equations, charts, embedded packages, signatures, or style-preserving cross-run edits, stop with the exact gap and return the least-loss alternative.

Complete selection when operation, backend coverage, preservation trade-offs, and fallback are explicit.

## 4. Execute safely

1. Inspect before modifying. Record the document type, part inventory, external relationships, tracked changes, comments, and structural warnings.
2. Keep input and output distinct. Write atomically, retain the source, and pass `--overwrite` only under the caller's replacement approval.
3. Preserve unmodified ZIP parts and relationships. Do not normalize, pretty-print, or reconstruct unrelated XML merely to simplify an edit.
4. Restrict direct XML changes to the documented exact-text operation. If the requested phrase is split across runs or occurs ambiguously, stop and ask the semantic owner to narrow the target.
5. For comments and redlines, require an author identity supplied by the caller; never invent a person. Use an explicit UTC timestamp when reproducibility matters.
6. For accepted changes, confirm that the caller intends to materialize the accepted view. Keep the reviewed source unchanged and return a separate output.
7. For conversion, isolate the LibreOffice profile, write into a temporary directory, and move only the expected DOCX to the authorized output.
8. Reject packages with unsafe member paths, symlinks, excessive expanded size, macros, or missing required Open XML parts.

Complete execution when the requested output exists at the intended path, the source is unchanged, and all backend warnings are reconciled.

## 5. Validate structure and appearance

Always run:

```bash
scripts/document check output.docx --json
scripts/document extract-text output.docx --track-changes accept
```

Compare source and result according to the contract: visible text, tracked-change view, comment anchors, document type, part preservation, external relationships, tables, headers, footers, fields, and embedded objects. Then render every generated page when layout matters:

```bash
scripts/document render output.docx --output-dir .document-validation/output
```

Inspect every page for blank output, clipping, overflow, pagination, table breakage, missing glyphs, image loss, header/footer drift, field behavior, and comment or revision visibility. A LibreOffice round trip is evidence about that renderer, not proof of Microsoft Word fidelity.

When `document-validation-needs-pdf-structure-or-rendered-page-inspection` and `q-tool-pdf` is installed, pass the transient verification PDF through its inspection or rendering contract. If it is absent, `use-a-separately-verified-local-renderer-or-report-the-visual-validation-gap`. The caller still owns release and cross-format fidelity.

Complete validation only when every required structural and visual check passed or the result is honestly blocked; optional unavailable checks may produce `completed_with_warnings`.

## 6. Return the result

Return `document_result` using [`references/integration-contract.md`](references/integration-contract.md): exact inputs and outputs, selected runtime and native tools, operation, visible changes, preserved semantics, structural and rendered checks, capability gaps, warnings, blockers, and provenance.

Classify every persisted document, conversion, extraction, or render as `creation_mode: derived` and `semantic_authority: none`. In standalone mode, also return a valid `stage_result` with `global_state_updated: false` and `reconciliation_required: true` when a persistent output was written. The caller reviews semantic fidelity; only the root orchestrator reconciles artifacts and state.

## Hard boundaries

- Never overwrite a source or existing output without explicit replacement approval.
- Never execute macros, follow external relationships, bypass protection, or use a remote converter.
- Never claim full schema validation from the bounded package checker.
- Never represent extracted text order as proof of visual reading order.
- Never flatten comments or tracked changes silently.
- Never invent an author, resolve semantic ambiguity, change approved content to improve layout, approve a release, publish, or write global workflow records.
- Never treat a successful conversion or zero exit code as visual or semantic validation.

## Done when

- One runtime-neutral request preserved caller ownership and authorized paths.
- A healthy Python or Node backend covered the exact operation without installing anything.
- The source remains unchanged and every output was written safely.
- Structural and, when required, rendered validation cover the affected semantics.
- The result reports runtime, tools, changes, provenance, gaps, and one truthful next action.
