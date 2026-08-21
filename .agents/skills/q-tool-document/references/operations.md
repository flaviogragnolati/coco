# Unified document commands

Run `scripts/document <command> --help` for the authoritative options. User-facing paths may be relative; automation should prefer absolute paths.

| Command | Purpose |
|---|---|
| `doctor [--json]` | Report runtime, package, ZIP, LibreOffice, and Poppler capabilities. |
| `inspect INPUT [--json]` | Report type, parts, paragraphs, tables, comments, revisions, macros, and external relationships. |
| `extract-text INPUT [--track-changes accept|reject|all] [--output PATH]` | Extract a selected revision view as UTF-8 text. |
| `create OUTPUT (--text TEXT | --text-file PATH) [--template] [--overwrite]` | Create a basic DOCX or DOTX from approved plain text. |
| `replace-text INPUT OUTPUT --old TEXT --new TEXT [--all] [--overwrite]` | Replace exact text within one Open XML text node. |
| `comment INPUT OUTPUT --target TEXT --comment TEXT --author NAME [--overwrite]` | Add a classic Word comment anchored to exact text. |
| `redline INPUT OUTPUT --old TEXT --new TEXT --author NAME [--date ISO-UTC] [--overwrite]` | Add tracked deletion/insertion markup. |
| `accept-changes INPUT OUTPUT [--overwrite]` | Materialize ordinary accepted text revisions; block unsupported paragraph or move semantics. |
| `convert INPUT OUTPUT.docx [--overwrite]` | Convert DOC, ODT, RTF, DOCX, or DOTX through local LibreOffice. |
| `render INPUT --output-dir DIR [--dpi N] [--overwrite]` | Produce a transient validation PDF and optional page images. |
| `check INPUT [--json]` | Check safe OPC paths, ZIP integrity, required parts, relationships, and supported XML well-formedness. |

## Common controls

- `--runtime python|node` selects a backend at the dispatcher.
- `--json` requests machine-readable diagnostics where supported.
- `--overwrite` is evidence of separately established replacement approval; it does not create that approval.
- Exit `0` means the command completed its declared mechanical work. It never means semantic or visual approval.

## Operation limits

Creation intentionally produces a minimal document, not Quasar branding. Exact text operations refuse ambiguous matches unless `--all` is explicitly selected for replacement. Comments and redlines refuse anchors whose structure exceeds the selected backend's capability. Accepting changes refuses paragraph-mark deletions and move markup. Conversion and rendering refuse missing LibreOffice rather than installing or calling a remote service.
