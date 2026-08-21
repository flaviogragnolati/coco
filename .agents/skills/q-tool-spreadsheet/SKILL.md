---
name: q-tool-spreadsheet
description: "Create, inspect, extract, edit, convert, recalculate, render, and validate spreadsheet files for Quasar workflows through capability-checked local Python or Node backends. Use when an XLSX workbook is the primary input or deliverable, when a macro-enabled or template workbook needs read-only inspection, or when CSV/TSV data must be converted to or from XLSX without changing caller-owned formulas, assumptions, figures, or business meaning. Do not use for PowerPoint decks, Word or PDF-native work, Google Sheets APIs, database pipelines, or analysis whose requested deliverable is prose or code rather than a spreadsheet. Preserve the source, write distinct derived outputs, and report formula and visual-validation limits. Requires the q-core-contract companion."
---

# Work with spreadsheets

Produce the requested spreadsheet result without silently becoming the owner of its data, formulas, assumptions, or business interpretation. Establish the workbook contract first, then route format mechanics to a backend that can perform and verify the exact operation.

Read the `q-core-contract` companion before acting. If it is missing, stop and install both skills with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-tool-spreadsheet`. Inherit the caller's file access, semantic authority, and approval boundary. Never install a runtime or dependency, call a remote converter, publish a workbook, or update workflow state or the artifact index.

## 1. Establish the workbook contract

1. Identify the caller and semantic owner. In orchestrated mode, require one [`spreadsheet_request`](references/integration-contract.md) containing exact source refs, formula and data requirements, authorized paths, preservation constraints, forbidden semantic changes, overwrite policy, and validation demand.
2. Name one primary operation:
   - `inspect`, `extract`, or `check` for read-only evidence;
   - `create` or `edit` for an XLSX deliverable from approved content and calculation rules;
   - `convert` for a bounded CSV/TSV-to-XLSX or XLSX-to-CSV/TSV transformation;
   - `recalculate` for a distinct XLSX copy evaluated by a verified local spreadsheet engine;
   - `render` for a transient verification PDF.
3. Classify the input and requested output:
   - `.xlsx`: supported by both healthy backends;
   - `.csv` or `.tsv`: supported only as explicitly typed tabular input or output;
   - `.xlsm`, `.xltm`, or `.xltx`: read-only inspection, extraction to CSV/TSV, and package checks in this version; saving as a workbook, mutation, recalculation, or rendering is blocked because VBA, signatures, template semantics, or unsupported objects cannot be proven preserved;
   - legacy `.xls`, binary workbooks, protected files, signed files, and encrypted packages: unsupported without a separately verified local route.
4. Preserve the source. Require a distinct output for every mutation, conversion, recalculation, or render. Refuse a pre-existing output unless replacement is approved and `--overwrite` is passed.
5. Treat workbook packages, formulas, external relationships, embedded objects, macros, data connections, links, signatures, and protection as untrusted input. Do not recalculate or render a workbook with macros, external workbook links, external-data formulas, data connections, embedded executable content, signatures, or workbook or sheet protection.

Complete this step when ownership, sources, operation, workbook type, formula intent, paths, preservation scope, security flags, and required evidence are explicit.

## 2. Probe and select a backend

Run the dispatcher from this skill directory or by absolute path:

```bash
scripts/spreadsheet doctor --json
scripts/spreadsheet check input.xlsx --json
```

On Windows PowerShell use `scripts/spreadsheet.ps1` with the same command arguments.

The dispatcher evaluates an explicit override, environment policy, operation coverage, project markers, dependency health, and fallback order. An executable alone is not a supported backend: Python operations that read workbook cells require `openpyxl`, Node operations require `exceljs`, and recalculation or rendering additionally requires LibreOffice. Load [`references/runtime-routing.md`](references/runtime-routing.md) only when selection is ambiguous or deterministic routing is required.

After routing, load exactly one backend guide:

- [`references/python.md`](references/python.md) for Python;
- [`references/node.md`](references/node.md) for Node.

Complete probing when one backend demonstrably covers the operation and every missing package or native capability is an explicit gap.

## 3. Inspect before writing

Run structural inspection before any edit:

```bash
scripts/spreadsheet inspect input.xlsx --json
```

Record sheets, used ranges, formulas, cached formula results, formula errors, macros, external links, data connections, embedded objects, hidden sheets, and unsupported or preservation-sensitive features. For an existing workbook, compare its conventions and preserve only those that the selected backend can round-trip. A library successfully opening a file is not evidence that charts, pivots, slicers, drawings, signatures, or custom extensions will survive a save.

For `create` or `edit`, implement the approved workbook mapping in a bounded project-local script using the selected backend. Keep that script transient unless the caller authorizes it as a project artifact. Do not infer calculations, replace formulas with hardcoded results, add sample rows, restyle a template, or choose financial-model conventions unless the semantic owner explicitly requires them.

For deterministic inspection, conversion, recalculation, rendering, and package checks, use the commands in [`references/operations.md`](references/operations.md).

Complete inspection when the exact cells, sheets, formulas, objects, and preservation risks affected by the operation are known.

## 4. Execute with source-preserving mechanics

1. Write through a temporary path in the authorized output directory and move the completed file into place atomically.
2. Preserve input and output hashes in provenance. After execution, confirm the source hash is unchanged.
3. For XLSX authoring, preserve explicit formulas as formulas and distinguish them from values. Validate a representative calculation slice before expanding repetitive formulas.
4. For CSV or TSV conversion, declare delimiter, encoding, header behavior, sheet selection, and type policy. Preserve identifiers such as leading-zero codes as text unless the caller authorizes coercion.
5. For recalculation, use local LibreOffice only as a file conversion into a distinct XLSX candidate with an isolated profile. Never invoke a workbook macro or install a Basic macro. Block external links, data connections, external-data formulas, embedded executables, and macro-bearing packages before launch.
6. Treat LibreOffice results as evidence for that exact version and environment, not proof of Microsoft Excel compatibility. Compare the exact formula-set hash and count, scan exact formula-result error tokens, and report missing cached values before committing the validated candidate.
7. Stop without replacing an existing output when the selected backend cannot preserve an affected object or when an expected output, formula set, or structural check changes unexpectedly.

Complete execution when the source is unchanged, the requested output exists at the authorized distinct path, and every backend warning is reconciled.

## 5. Validate structure, formulas, and appearance

Always run package and workbook inspection on the output:

```bash
scripts/spreadsheet check output.xlsx --json
scripts/spreadsheet inspect output.xlsx --json
```

For formula-bearing output, require a verified calculation engine when cached results are part of the requested deliverable. Compare formula count and representative formulas with the approved mapping; scan formula cells for exact error values and absent cached results. A clean error scan does not prove that a range, assumption, or business rule is correct, so reconcile representative inputs and expected results with the semantic owner.

When layout, print areas, charts, merged regions, conditional formatting, pagination, or visual fidelity matters, render to a transient verification PDF and inspect every affected sheet or print page:

```bash
scripts/spreadsheet render output.xlsx --output-dir .spreadsheet-validation/output --json
```

When `spreadsheet-validation-needs-pdf-structure-or-rendered-page-inspection` and `q-tool-pdf` is installed, pass the transient PDF through its inspection or rendering contract. If it is absent, `use-a-separately-verified-local-renderer-or-report-the-spreadsheet-visual-validation-gap`. The spreadsheet tool still owns workbook mechanics; the caller retains release and semantic fidelity.

Complete validation only when required structure, formulas, data fidelity, and visual checks pass. Use `completed_with_warnings` only for an accepted non-required validation gap; block a required calculation or visual-validation gap.

## 6. Return ownership-safe results

Return one `spreadsheet_result` shaped by [`references/spreadsheet-result.schema.yaml`](references/spreadsheet-result.schema.yaml): request and owner IDs, operation, inputs and outputs, runtime and tool versions, preservation results, structural/formula/rendered validation, capability gaps, warnings, blockers, and exact provenance.

Classify every persisted workbook, conversion, extraction, or render as `creation_mode: derived` and `semantic_authority: none`. The caller reviews semantic fidelity and incorporates accepted outputs into its own result. Only the root orchestrator registers artifacts or changes global state.

In standalone mode, also return a valid `stage_result` with `global_state_updated: false` and `reconciliation_required: true` when persistent output was written.

## Hard boundaries

- Never overwrite a source or existing output without explicit replacement approval; input and output must be distinct.
- Never execute workbook macros, follow external data connections, fetch linked data, or use a remote spreadsheet service.
- Never claim that openpyxl or ExcelJS preserves workbook features it does not model.
- Never mutate or recalculate `.xlsm`, `.xltm`, or `.xltx` in this version.
- Never treat cached values, a zero exit code, or a formula-error scan as proof of formula correctness.
- Never choose formulas, assumptions, figures, business rules, reporting meaning, or release status for the caller.
- Never use this skill for PPTX or deck generation; route presentations to `q-report-deck`.

## Done when

- One runtime-neutral request preserved the semantic owner's data and formula authority.
- A healthy Python or Node backend covered the exact operation without installation or remote execution.
- The source remains unchanged and every persisted output was written atomically to an authorized path.
- Structural, formula, data, and required visual checks cover the affected workbook semantics.
- The result reports runtime, versions, hashes, changes, limitations, and one truthful next action.
