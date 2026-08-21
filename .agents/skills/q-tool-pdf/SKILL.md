---
name: q-tool-pdf
description: "Inspect, extract, create, transform, fill, secure, render, and validate PDF files for Quasar workflows through one runtime-neutral workflow. Use when a user or another skill needs to read a PDF; extract text, tables, metadata, pages, or images; merge, split, reorder, rotate, crop, stamp, or watermark pages; create a PDF; inspect or fill forms; add or remove authorized encryption; OCR a scanned document; repair or linearize a PDF; or verify a generated PDF. Select Python or Node from an explicit override, project markers, installed dependencies, and operation coverage, then load only that runtime reference. Do not use it to author DOCX or PPTX files, decide source meaning, or treat a PDF render as semantic authority. Preserve the source and validate both PDF structure and rendered output. Requires the q-core-contract companion."
---

# Work with PDFs

Produce the requested PDF result without silently changing the source or degrading content. Keep the PDF workflow independent of the implementation runtime: decide what the document needs first, then route to the backend that can perform and verify it.

Read the `q-core-contract` companion before acting. If it is missing, stop and install both skills with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-tool-pdf`. Inherit the caller's file access, authority, and approval boundary. Never update workflow state or the artifact index; return persistent outputs to the root orchestrator for reconciliation.

## 1. Establish the document contract

1. Identify the input PDF or the source material from which a PDF will be created. In orchestrated mode, require the caller contract in [`references/integration-contract.md`](references/integration-contract.md), including owner, exact source refs, authorized paths, and forbidden semantic changes.
2. State the requested operation, page scope, output format, naming, and whether the result must preserve forms, bookmarks, links, metadata, accessibility, vector content, encryption, or signatures.
3. Classify the PDF before acting:
   - **digitally generated**: selectable text and structured objects are likely available;
   - **scanned or image-only**: OCR may be required;
   - **fillable AcroForm**: fields can usually be inspected and updated;
   - **XFA or hybrid form**: ordinary form libraries may not preserve behavior;
   - **encrypted or signed**: authorization and integrity constraints apply;
   - **derived deliverable**: the canonical source may be DOCX, PPTX, HTML, Markdown, or another editable artifact rather than the PDF.
4. Preserve the original. Write to a distinct output path through a temporary file. Refuse an existing output unless the caller explicitly authorizes replacement and passes `--overwrite`.
5. Treat a password, private document, signature, redaction request, or irreversible flattening as security-sensitive. Obtain the required authority from the caller and keep secrets out of command history and logs.

Complete this step when the source, operation, page semantics, preservation requirements, output path, and security boundary are explicit.

## 2. Preflight the environment and document

Run the dispatcher from this skill directory or by absolute path:

```bash
scripts/pdf doctor
scripts/pdf inspect input.pdf --json
```

On Windows PowerShell use `scripts/pdf.ps1` with the same arguments.

The dispatcher resolves Python or Node in this order:

1. `--runtime python|node`;
2. `PDF_SKILL_RUNTIME`;
3. operation coverage;
4. nearest Python or Node project markers and locally installed dependencies;
5. the first healthy backend in `PDF_SKILL_RUNTIME_ORDER`.

Use `references/runtime-routing.md` only when selection is ambiguous, a backend is missing, or the caller needs deterministic routing. Do not select a runtime merely because its executable exists; its required packages and external tools must also be available for the requested operation.

Inspect before transforming. At minimum record page count, page sizes and rotations, encryption, metadata, form type, text-layer presence, and obvious structural warnings. Render representative pages when layout, forms, images, clipping, rotation, or visual fidelity matters.

Complete preflight when one viable route is selected and the document characteristics that could change the operation are known.

## 3. Choose the narrowest operation path

Use the unified command contract in `references/operations.md`. Load exactly one runtime guide after routing:

- Load `references/python.md` when the selected backend is Python.
- Load `references/node.md` when the selected backend is Node.
- Also load `references/forms.md` for field inspection, filling, flattening, or non-fillable form overlays.

Prefer the smallest tool that preserves the required semantics:

| Need | Default path |
|---|---|
| Inspect, rotate, crop, stamp, metadata, or ordinary AcroForm work | Selected Python or Node backend |
| Merge, select, split, or reorder plain PDFs | Selected backend; when interactive forms or document-level preservation matter, prefer Python/qpdf and validate explicitly because the Node adapter refuses form-bearing page copies |
| Extract page text in Node | PDF.js, not `pdf-lib` |
| Extract tables or debug coordinates and ruling lines | Python `pdfplumber`; route to Python unless the caller explicitly accepts a custom Node implementation |
| Render pages | Python PDFium when available; otherwise Poppler `pdftoppm` from either runtime |
| Extract embedded images | Poppler `pdfimages` from either runtime |
| OCR image-only pages | OCRmyPDF/Tesseract from either runtime after confirming OCR is needed |
| Encrypt, decrypt with authorization, inspect encryption, repair, or linearize | `qpdf` from either runtime |
| Create a text-heavy business document | Author an editable source, validate it, then export to PDF |
| Create a custom programmatic PDF | ReportLab in Python or pdfmake/`pdf-lib` in Node; follow the selected runtime guide |
| Secure redaction | Use a true redaction engine and verify object removal; never simulate redaction with an opaque rectangle |

Do not rasterize a vector PDF merely to make an edit easier unless the user accepts the loss of selectable text, links, accessibility, and print quality. Do not OCR a PDF that already has an adequate text layer.

Complete selection when the operation, backend, dependencies, semantic trade-offs, and fallback are explicit.

## 4. Execute without corrupting document semantics

1. Use 1-based page numbers in user-facing commands. Convert to library indexes only inside the backend.
2. Validate page ranges before writing. Reject duplicates or allow them deliberately for page duplication; never guess whether a range is inclusive.
3. Keep input and output paths distinct unless the caller explicitly requests replacement and a backup exists.
4. Write outputs atomically. Pass `--overwrite` only after explicit replacement approval. Remove temporary files after success or failure.
5. Preserve or deliberately update metadata, outlines, annotations, attachments, and forms according to the document contract. Page-copy operations do not automatically preserve every document-level feature.
6. Normalize page rotation before overlays when the selected library requires it. Confirm coordinate systems before drawing, cropping, or placing form values.
7. Pass passwords through environment variables or protected input, never literal CLI arguments in durable automation.
8. Stop on unsupported encrypted PDFs, XFA behavior, malformed forms, unavailable fonts, or missing native tools. Route to a compatible backend or report the blocker instead of emitting a plausible but damaged PDF.

For batch work, process files independently, retain a machine-readable result per input, and distinguish partial success from full success.

Complete execution when the requested output exists at the intended path, the source is unchanged, and all backend warnings have been reconciled.

## 5. Validate structure and appearance

Run structural validation first:

```bash
scripts/pdf check output.pdf
scripts/pdf inspect output.pdf --json
```

Then render the affected pages and inspect them:

```bash
scripts/pdf render output.pdf --output-dir .pdf-validation/output --dpi 160
```

Compare before and after for operations that can change layout. Verify, as applicable:

- page count, order, dimensions, crop boxes, and rotation;
- text remains selectable and in the intended reading order;
- overlays, watermarks, and form appearances are visible and correctly placed;
- no clipping, overflow, missing glyphs, black boxes, blank pages, or unexpected rasterization;
- links, annotations, bookmarks, attachments, metadata, and forms meet the declared preservation scope;
- OCR text is usable without materially degrading the page image;
- encrypted output opens with the intended credentials and permissions;
- redacted information is absent from extracted text, images, annotations, incremental revisions, and embedded objects;
- a modified signed PDF is not represented as retaining the original signature validity.

For generated PDFs, inspect every page. For large transformed PDFs, inspect every affected page and a representative sample of untouched pages; use automated page-image comparison when the operation should not alter appearance.

Complete validation only when structural checks pass, rendered evidence matches the request, and any accepted losses are named.

## 6. Return the result

Return `pdf_result` using [`references/integration-contract.md`](references/integration-contract.md), including:

- the output file or exact output path;
- the selected runtime and backend tools;
- the operation and page scope applied;
- validation performed and its result;
- preserved and intentionally changed semantics;
- warnings, unsupported features, or follow-up risks.

Keep temporary renders, extracted secrets, and scratch mappings out of the final deliverables. In standalone mode, also return a valid `stage_result` with `global_state_updated: false` and `reconciliation_required: true` when persistent output was written. Do not claim success from a zero exit code alone when visual fidelity or form appearance matters.

## Hard boundaries

- Never overwrite an input PDF or an existing output without explicit replacement approval.
- Never bypass encryption without authorization.
- Never call a visual cover-up a redaction.
- Never promise preservation of a digital signature after modifying signed bytes.
- Never flatten a form by merely setting fields read-only; flattening must materialize appearances and remove interactive widgets when that is the requested result.
- Never assume XFA behaves like AcroForm.
- Never embed a font file in a deliverable unless its license and the caller's authority permit embedding.
- Never treat extracted text order as proof of visual reading order; inspect coordinates or rendering when order matters.
- Never install a runtime or dependency, use a remote converter, publish a document, or update global workflow records.

## Done when

- One runtime-neutral request contract drove the work and preserved caller ownership.
- Routing selected a backend that actually covers the operation.
- The source remains intact and the output was written safely.
- Structural and visual validation cover every affected semantic requirement.
- The final handoff identifies the output, runtime, tools, validation, and limitations.
