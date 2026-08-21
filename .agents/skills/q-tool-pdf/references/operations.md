# Unified operation contract

Load this reference when constructing commands or consuming machine-readable results. Commands use the same names and user-facing semantics across Python and Node.

## Invocation

POSIX:

```bash
scripts/pdf [--runtime python|node] [--json] [--quiet] [--overwrite] COMMAND ...
```

PowerShell:

```powershell
./scripts/pdf.ps1 [-Runtime python|node] [-Json] [-Quiet] [-Overwrite] COMMAND ...
```

Backend-direct invocations are supported for diagnostics:

```bash
python3 scripts/python/pdf_tool.py COMMAND ...
node scripts/node/pdf-tool.mjs COMMAND ...
```

## Common commands

`--overwrite` is a global, approval-bearing flag. All file and directory outputs refuse a pre-existing target by default.

```text
doctor
inspect INPUT [--json]
extract-text INPUT --output FILE [--layout]
merge --output OUTPUT INPUT [INPUT ...]
select INPUT --pages SPEC --output OUTPUT
split INPUT --output-dir DIR [--chunk-size N]
rotate INPUT --pages SPEC --degrees {90,180,270,-90,-180,-270} --output OUTPUT
crop INPUT --pages SPEC --box LEFT,BOTTOM,RIGHT,TOP --output OUTPUT
watermark INPUT --stamp STAMP_PDF --pages SPEC --output OUTPUT [--underlay] [--fit contain|stretch|none]
form-list INPUT --output FIELDS_JSON
form-fill INPUT --values VALUES_JSON --output OUTPUT [--flatten] [--font FONT_FILE]
render INPUT --output-dir DIR [--dpi N] [--format png|jpeg] [--pages SPEC]
extract-images INPUT --output-dir DIR
extract-tables INPUT --output OUTPUT_JSON [--pages SPEC]
check INPUT
repair INPUT --output OUTPUT
linearize INPUT --output OUTPUT
decrypt INPUT --output OUTPUT [--password-env ENV_NAME]
encrypt INPUT --output OUTPUT --user-password-env ENV_NAME --owner-password-env ENV_NAME
ocr INPUT --output OUTPUT [--languages spa+eng] [--deskew] [--rotate-pages]
```

## Creating a new PDF

The unified adapter deliberately has no generic `create` command. New-document creation needs a content and layout contract—page size, margins, typography, wrapping, pagination, images, links, accessibility, and editable-source ownership—that cannot be represented safely by a filename alone. Load the selected runtime guide and create the document with ReportLab/Platypus, `pdf-lib`, pdfmake, or an approved source-to-PDF pipeline; then return to the shared `check` → `inspect` → `render` validation sequence.

Do not interpret the absence of a generic CLI command as missing creation support. It is an intentional boundary against emitting an under-specified document-shaped artifact.

## Page-range grammar

User-facing page ranges are 1-based and inclusive.

```text
all
1
1,3,7
2-5
1,3-5,last
odd
even
```

Rules:

- `last` resolves after the document is opened.
- Preserve the order in the specification.
- Repeated pages deliberately duplicate pages for `select`; reject repeated pages for in-place page-property operations unless the backend documents idempotent handling.
- Reject zero, negative numbers, descending ranges, malformed tokens, and pages beyond the document.

## Crop coordinates

`--box LEFT,BOTTOM,RIGHT,TOP` uses PDF points in the native PDF coordinate system, with origin at the lower-left of the unrotated page. Require `RIGHT > LEFT` and `TOP > BOTTOM`. A crop box changes the visible region; it does not securely remove hidden content outside that box.

## Form values

Use one JSON object keyed by fully qualified field name:

```json
{
  "fields": {
    "person.full_name": "Ada Lovelace",
    "person.accept_terms": true,
    "person.role": "Engineer",
    "person.country": "Argentina",
    "person.tags": ["Research", "Engineering"]
  }
}
```

Value conventions:

- text field: string;
- checkbox: boolean, or the field's explicit export value when required by the document;
- radio group: one listed option string;
- dropdown/list: one option string, or an array only when the field supports multiple selection;
- button/signature/unknown field: unsupported unless a runtime guide states otherwise.

Do not infer a field's meaning from its internal name alone. Inspect the rendered form and map values to visible labels before filling.

## Result envelope

With `--json`, commands write one JSON object to stdout:

```json
{
  "ok": true,
  "command": "merge",
  "runtime": "python",
  "backend": ["pypdf"],
  "inputs": ["a.pdf", "b.pdf"],
  "outputs": ["merged.pdf"],
  "warnings": [],
  "details": {}
}
```

Human-readable diagnostics go to stderr. A failed command returns `ok: false` when JSON mode is active and exits non-zero.

## Exit codes

| Code | Meaning |
|---:|---|
| 0 | success |
| 2 | invalid arguments or page specification |
| 3 | unreadable or malformed input |
| 4 | missing runtime package or native executable |
| 5 | unsupported capability or semantic preservation requirement |
| 6 | output or validation failure |
| 7 | authorization failure or missing/invalid secret input |
| 8 | partial batch success |

## Atomic output

Every command that creates a single file writes a temporary sibling such as `.output.pdf.<random>.tmp`, closes it, validates basic readability, and renames it to the requested output. A pre-existing output is rejected unless explicit approval is represented by `--overwrite`; even then, the existing file remains in place until the temporary file is complete. Directory-producing commands write a manifest so partial work is visible.


## Directory outputs and partial work

`split`, `render`, and `extract-images` require an output directory that does not exist or is empty. `--overwrite` does not authorize deleting or mixing a non-empty directory. This prevents stale files from being mistaken for current results. They write `manifest.json`; when a command fails after producing some files, the manifest records `ok: false`, completed outputs, and the failure message. Treat that directory as partial evidence and choose a new empty directory for a retry.

## Encrypted input and native tools

Library-backed commands read `PDF_PASSWORD` in-process. Native tools that would otherwise require a password argument are fed an authorized temporary clear-text working copy produced through qpdf's `@-` stdin argument mechanism. The working copy is deleted in a `finally`/cleanup path. If qpdf is unavailable, stop rather than exposing the password in process listings. Raw qpdf encryption/check diagnostics are suppressed whenever a password is supplied or the source is encrypted because some legacy encryption reports can reconstruct credential material.

OCR uses OCRmyPDF's `--skip-text` policy: pages that already contain text are left alone, while image-only pages are OCRed. A mixed document must still be rendered and sampled after OCR; pre-existing text does not prove every page has an adequate text layer.
