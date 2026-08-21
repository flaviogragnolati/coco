# Unified operation contract

Load this reference when constructing commands or consuming machine-readable results. Commands use the same names and user-facing semantics across the Python and Node backends.

## Invocation

POSIX:

```bash
scripts/pptx [--runtime python|node] [--json] [--quiet] [--overwrite] COMMAND ...
```

PowerShell:

```powershell
./scripts/pptx.ps1 [-Runtime python|node] [-Json] [-Quiet] [-Overwrite] COMMAND ...
```

Backend-direct invocations are supported for diagnostics:

```bash
python3 scripts/python/pptx_tool.py COMMAND ...
node scripts/node/pptx-tool.mjs COMMAND ...
```

## Common commands

`--overwrite` is a global, approval-bearing flag. All file and directory outputs refuse a pre-existing target by default.

```text
doctor
inspect INPUT [--json]
extract-text INPUT --output FILE [--slides SPEC] [--with-notes]
extract-notes INPUT --output FILE [--slides SPEC]
extract-media INPUT --output-dir DIR
select INPUT --slides SPEC --output OUTPUT
replace-text INPUT --map VALUES_JSON --output OUTPUT [--slides SPEC] [--include-notes]
render INPUT --output-dir DIR [--dpi N] [--format png|jpeg] [--slides SPEC]
contact-sheet INPUT --output FILE [--columns N] [--width PX] [--dpi N]
check INPUT [--json]
```

`select` keeps the listed slides in the listed order and drops the rest. Repeated slide numbers are rejected: slide duplication needs package-level part cloning that this version deliberately does not implement. Cross-deck merge is equally out of scope; both return exit code 5 with the boundary named.

## Creating a new deck

The unified adapter deliberately has no generic `create` command. New-deck creation needs a content and design contract — slide size, palette, typography, layout variation, per-slide message, media, and editable-source ownership — that cannot be represented safely by a filename alone. Route creation to Python and author the deck programmatically with python-pptx together with `references/design.md`; then return to the shared `check` → `inspect` → `render` validation sequence. The Node package intentionally declares no creation library in this version because the current PptxGenJS dependency tree did not pass the package's vulnerability gate.

Do not interpret the absence of a generic CLI command as missing creation support. It is an intentional boundary against emitting an under-specified presentation-shaped artifact.

## Slide-range grammar

User-facing slide ranges are 1-based and inclusive.

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

- `last` resolves after the deck is opened.
- Preserve the order in the specification; for `select` the specification order is the output order.
- Reject repeated slides everywhere: `select` refuses duplication and render specifications refuse repeated pages.
- Reject zero, negative numbers, descending ranges, malformed tokens, and slides beyond the deck.

## Replacement map

`replace-text` takes one JSON document:

```json
{
  "replacements": {
    "{{CLIENT_NAME}}": "Acme Hospital",
    "{{QUARTER}}": "Q3 2026"
  }
}
```

An array form `[{"find": "...", "replace": "..."}]` is also accepted. Semantics:

- Replacement happens inside individual runs, so character formatting survives.
- A `find` string that never matched produces a warning; treat it as a contract mismatch, not noise.
- A `find` string present in a paragraph but split across runs produces a fragmented-run warning and is left unchanged; resolve it at the source or with a deliberate raw-XML edit, never by reassigning the whole frame silently.
- `--include-notes` extends replacement into speaker notes.
- Template slots with no corresponding content must be removed by a deliberate edit, not left as placeholder text; `extract-text` plus a placeholder scan belongs to validation.

## Result envelope

With `--json`, commands write one JSON object to stdout:

```json
{
  "ok": true,
  "command": "select",
  "runtime": "python",
  "backend": ["python-pptx"],
  "inputs": ["deck.pptx"],
  "outputs": ["subset.pptx"],
  "warnings": [],
  "details": {}
}
```

`runtime` is `python` or `node`. Human-readable diagnostics go to stderr. A failed command returns `ok: false` when JSON mode is active and exits non-zero.

## Exit codes

| Code | Meaning |
|---:|---|
| 0 | success |
| 2 | invalid arguments or slide specification |
| 3 | unreadable or malformed input |
| 4 | missing runtime package or native executable |
| 5 | unsupported capability or semantic preservation requirement |
| 6 | output or validation failure |
| 8 | partial batch success |

## Atomic output

Every command that creates a single file requires input and output to be distinct, writes a temporary sibling, closes it, and renames it to the requested output; `select` additionally reopens the saved package and confirms the slide count before the rename. A pre-existing distinct output is rejected unless explicit approval is represented by `--overwrite`; even then, the existing file remains in place until the temporary file is complete.

## Directory outputs and partial work

`render` and `extract-media` require an output directory that does not exist or is empty. `--overwrite` does not authorize deleting or mixing a non-empty directory. This prevents stale files from being mistaken for current results. They write `manifest.json`; when a command fails after producing some files, the manifest records `ok: false`, completed outputs, and the failure message. Treat that directory as partial evidence and choose a new empty directory for a retry.

## Rendering pipeline

`render` and `contact-sheet` convert the deck to PDF with a headless, profile-isolated LibreOffice invocation and rasterize pages with Poppler's `pdftoppm`. Slide N maps to page N. Rendering is a validation instrument with two consequences: fonts not installed locally are substituted, so text-fit conclusions are approximate for unsafe fonts (see the typography rules in `design.md`), and the rendered images are derived evidence with no semantic authority over the package.
