# Unified spreadsheet commands

Run `scripts/spreadsheet <command> --help` for authoritative options. Automation should prefer absolute paths.

| Command | Purpose |
|---|---|
| `doctor [--json]` | Report runtime, package, LibreOffice, and operation capabilities. |
| `check INPUT [--json]` | Check bounded ZIP/OPC safety, required XLSX parts, and preservation-sensitive package flags. |
| `inspect INPUT [--json] [--max-cells N]` | Report sheets, dimensions, formulas, cached results, formula errors, and a bounded cell preview. |
| `convert INPUT OUTPUT [--sheet NAME] [--view values|formulas] [--overwrite] [--json]` | Convert CSV/TSV to XLSX or one workbook sheet to CSV/TSV; extensions select the delimiter and `--view` selects cached values or formulas for extraction. |
| `recalculate INPUT OUTPUT.xlsx [--timeout N] [--overwrite] [--json]` | Recalculate through local LibreOffice into a distinct XLSX and verify formula preservation and errors. |
| `render INPUT.xlsx --output-dir DIR [--timeout N] [--overwrite] [--json]` | Produce a transient validation PDF with local LibreOffice. |

Creation and domain-specific editing use a bounded project-local script following the selected runtime guide because arbitrary cell mapping, formulas, formats, and tables are caller-owned semantics rather than a safe generic command.

## Common controls

- `--runtime python|node` selects a backend at the dispatcher.
- `--json` requests machine-readable diagnostics.
- `--overwrite` records separately established replacement approval; it never creates that approval.
- Exit `0` means the command completed its declared mechanical operation. It does not certify business logic, visual fidelity, or Microsoft Excel compatibility.

## Operation limits

Mutation commands accept `.xlsx` only. Macro-enabled and template packages are limited to inspection, checking, and CSV/TSV extraction in this version; they are never saved back as workbooks. Recalculation and rendering block macros, external links, external-data formulas, data connections, and embedded executable content instead of using `--force`; recalculation commits only after formula-set validation. Conversion preserves delimited input as text by default so identifiers and formula-looking fields are not silently coerced; the caller may author a more specific typed conversion script when needed.

The bundled untrusted-input guard rejects archives above 64 MiB compressed or
256 MiB expanded, more than 1,000,000 cell records, more than 10,000 merged
ranges, unsafe paths, encryption, or suspicious compression. These are package
safety limits, not Excel format limits. Route a larger or unusually complex
workbook to a separately isolated and verified specialist environment.
