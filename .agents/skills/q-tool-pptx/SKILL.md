---
name: q-tool-pptx
description: "Create, inspect, extract, restructure, render, and validate PPTX presentations for Quasar workflows through capability-checked local Python or Node backends. Use when a PowerPoint deck is the primary input or deliverable; when slide text, notes, or media must be extracted; when slides must be selected or reordered; when approved text must fill an existing PPTX template; or when a generated or edited deck needs structural and render-based QA. Allow POTX or PPSX only on a verified read-only route. Do not use for report narrative or branding decisions, PDF-native operations, Word documents, spreadsheets, legacy PPT, macros, or encrypted packages. Preserve caller-owned meaning and the source file; treat outputs and extractions as derived with no semantic authority. Requires the q-core-contract companion."
---

# Work with PPTX presentations

Produce the requested presentation result without silently changing the source or degrading caller-owned content. Decide the deck contract first, then route mechanics to a backend that can perform and verify the exact operation.

Read the `q-core-contract` companion before acting. If it is missing, stop and install both skills with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-tool-pptx`. Inherit the caller's file access, authority, and approval boundary. Never update workflow state or the artifact index; return persistent outputs to the root orchestrator for reconciliation.

## 1. Establish the deck contract

1. Identify the input deck or approved source material. In orchestrated mode, require one schema-valid [`pptx_request`](references/pptx-request.schema.yaml) with owner, exact source refs, authorized paths, preservation requirements, forbidden semantic changes, security flags, and validation demand.
2. State the requested operation, slide scope, output format, naming, and whether the result must preserve layouts, masters, theme, speaker notes, media, charts, embedded objects, or template identity.
3. Classify the work before acting:
   - **create**: a new deck authored programmatically from approved content;
   - **template fill**: a copy of an existing template or deck whose text and structure are adjusted while its design system is preserved;
   - **restructure**: slides kept, dropped, or reordered without touching slide content;
   - **read/extract**: text, notes, or media pulled out for use elsewhere;
   - **validate/render**: structural checks and rendered evidence over an existing file;
   - **derived deliverable**: the canonical source is a report source, outline, or document — the deck is presentation-only and carries no semantic authority.
4. Classify `.pptx` as the mutable format. Treat `.potx` and `.ppsx` as read-only in this version; require a separately converted and verified `.pptx` working copy before filling either format, and do not claim that renaming or a python-pptx save performs that conversion. Legacy `.ppt`, macro-bearing `.pptm`, encrypted, protected, signed, or malformed packages are unsupported.
5. Preserve the original. Every file-producing operation uses a distinct output path through a temporary file. Refuse input/output collisions even with `--overwrite`; refuse an existing distinct output unless replacement was approved and the flag is passed.
6. Treat ZIP members, XML, relationships, embedded objects, and hyperlinks as untrusted. Never execute embedded content or follow an external relationship. Stop when package safety limits or preservation requirements cannot be met.

Complete this step when the source, operation, slide semantics, preservation requirements, output path, and authority boundary are explicit.

## 2. Preflight the environment and deck

Run the dispatcher from this skill directory or by absolute path:

```bash
scripts/pptx doctor
scripts/pptx inspect input.pptx --json
```

On Windows PowerShell use `scripts/pptx.ps1` with the same arguments.

The dispatcher resolves the Python or Node backend in this order:

1. `--runtime python|node`;
2. `PPTX_SKILL_RUNTIME`;
3. operation coverage;
4. nearest Python or Node project markers and locally installed dependencies;
5. the first healthy backend in `PPTX_SKILL_RUNTIME_ORDER`.

Use `references/runtime-routing.md` only when selection is ambiguous, a backend is missing, or the caller needs deterministic routing. Do not select a runtime merely because its executable exists; its required packages and native tools must also be available for the requested operation.

Inspect before transforming. At minimum record slide count, slide size, per-slide layout and title, notes presence, and media count. Render representative slides when layout, overflow, contrast, or visual fidelity matters; `contact-sheet` gives a fast labeled overview of every slide.

Complete preflight when one viable route is selected and the deck characteristics that could change the operation are known.

## 3. Choose the narrowest operation path

Use the unified command contract in `references/operations.md`. Load exactly one runtime guide after routing:

- Load `references/python.md` when the selected backend is Python.
- Load `references/node.md` when the selected backend is Node.
- Also load `references/design.md` before authoring or restyling slides — creation quality is a design task, not only an API task.

Prefer the smallest tool that preserves the required semantics:

| Need | Default path |
|---|---|
| Inspect, extract text/notes/media, structural check | Either backend |
| Keep, drop, or reorder slides | Python (`select`); slide duplication and cross-deck merge are out of scope in this version |
| Fill a template copy with approved text | Python (`replace-text`), then check for missed fragmented runs and leftover placeholders |
| Create a new deck | Programmatic authoring with python-pptx through the Python guide; there is deliberately no generic CLI `create` command, and the Node route does not declare a safe creation dependency in this version |
| Render slides for visual QA | `render` or `contact-sheet` (LibreOffice + Poppler from either runtime) |
| Released deck PDF | The owning renderer performs an explicitly verified export; `q-tool-pdf` may inspect or validate the resulting PDF but does not own PPTX conversion |
| Edit raw slide XML | Last resort for needs no modeled API covers; keep edits minimal and re-run `check` plus rendered QA |

Do not rebuild a deck from scratch to make an edit easier when the caller asked to preserve a template's design. Do not extract text from rendered images when the package itself is readable.

Complete selection when the operation, backend, dependencies, semantic trade-offs, and fallback are explicit.

When `pptx-validation-needs-pdf-structure-or-rendered-page-inspection`, optionally use `q-tool-pdf`; if it is absent, `use-a-separately-verified-local-renderer-or-report-the-presentation-visual-validation-gap`.

## 4. Execute without corrupting deck semantics

1. Use 1-based slide numbers in user-facing commands. Convert to library indexes only inside the backend.
2. Validate slide ranges before writing. `select` rejects repeated slides; never guess whether a range is inclusive.
3. Do structural work (keep/drop/reorder) before content edits, so content changes land on the surviving slides.
4. Keep input and output paths distinct without exception. `--overwrite` applies only to a pre-existing, distinct output.
5. Write outputs atomically. Pass `--overwrite` only after explicit replacement approval. Remove temporary files after success or failure.
6. Preserve run-level formatting when replacing text: replace inside runs, never by reassigning whole text frames. Treat a reported fragmented-run warning as unfinished work, not as success.
7. When creating, set the slide size first, keep every element inside the canvas, and follow `references/design.md` for palette, typography, layout variation, and overflow discipline.
8. Stop on unsupported package features, missing native tools, or a structural check failure. Route to the other backend or report the blocker instead of emitting a plausible but broken deck.

For batch work, process files independently, retain a machine-readable result per input, and distinguish partial success from full success.

Complete execution when the requested output exists at the intended path, the source is unchanged, and all backend warnings have been reconciled.

## 5. Validate structure and appearance

Run structural validation first:

```bash
scripts/pptx check output.pptx
scripts/pptx inspect output.pptx --json
```

Then render the affected slides and look at them:

```bash
scripts/pptx render output.pptx --output-dir .pptx-validation/output --dpi 150
```

Also extract the text and reread it — rendered inspection finds layout defects, text extraction finds content defects:

```bash
scripts/pptx extract-text output.pptx --output .pptx-validation/text.md --with-notes
```

Verify, as applicable, using the visual QA checklist in `references/design.md`:

- slide count, order, and size match the request;
- no text overflow, truncation, or collision — check this first, it is the most common defect;
- template fills left no placeholder text, orphaned visuals, or half-replaced runs;
- charts, tables, and images are present and legible; nothing was silently dropped;
- fonts render acceptably, remembering that the local renderer may substitute metrics-different fonts (see the typography rules in `references/design.md`);
- notes survived when the contract requires them.

For generated decks, inspect every slide. For large edited decks, inspect every affected slide and a representative sample of untouched slides. Rendered output is validation evidence only; the `.pptx` package remains the deliverable.

Complete validation only when structural checks pass, rendered evidence matches the request, and any accepted losses are named.

## 6. Return the result

Return a schema-valid [`pptx_result`](references/pptx-result.schema.yaml) using [`references/integration-contract.md`](references/integration-contract.md), including:

- the output file or exact output path;
- the selected runtime and backend tools;
- the operation and slide scope applied;
- validation performed and its result;
- preserved and intentionally changed semantics;
- warnings, unsupported features, or follow-up risks.

Keep temporary renders and scratch files out of the final deliverables. In standalone mode, also return a valid `stage_result` with `global_state_updated: false` and `reconciliation_required: true` when persistent output was written. Do not claim success from a zero exit code alone when visual fidelity matters.

## Hard boundaries

- Never use the input deck as an output path. Never replace a distinct existing output without explicit approval.
- Never invent, summarize, or rewrite caller-owned content to make it fit a slide; report the fit problem and let the content owner decide.
- Never treat a rendered image, exported PDF, or extracted text file as the semantic authority over the deck or its upstream source.
- Never reassign whole text frames when the contract requires preserved formatting.
- Never present a structurally valid file as validated when rendered inspection was skipped for a visual-sensitive change.
- Never embed a font file in a deliverable unless its license and the caller's authority permit embedding.
- Never execute embedded content, resolve an external relationship, bypass package protection, or process a package beyond the declared safety limits.
- Never install a runtime or dependency, use a remote converter, publish a deck, or update global workflow records.

## Done when

- One runtime-neutral request contract drove the work and preserved caller ownership.
- Routing selected a backend that actually covers the operation.
- The source remains intact and the output was written safely.
- Structural and rendered validation cover every affected semantic requirement.
- The final handoff identifies the output, runtime, tools, validation, and limitations.
