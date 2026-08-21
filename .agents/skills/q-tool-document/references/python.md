# Python backend

Load this guide only after the dispatcher selects Python.

Run directly when deterministic routing is required:

```bash
python3 scripts/python/document_tool.py --help
python3 scripts/python/document_tool.py inspect input.docx --json
```

The backend uses only Python 3.10+ standard-library modules for DOCX/DOTX package mechanics. It reads ZIP members in memory after rejecting unsafe paths, symlinks, excessive expanded size, and suspicious compression ratios. It preserves untouched parts and writes every output atomically.

Python can split a simple run whose target occupies part of one `w:t` element for comments and redlines. It refuses nested hyperlinks, fields, content controls, multi-text runs, and cross-run targets because splitting those structures can change formatting or behavior.

`check` is a bounded OPC/Open XML check, not full XSD validation. `convert` and `render` invoke a verified local `soffice`; `render` uses `pdftoppm` only when present. Missing native tools are capability gaps.

Use `--json` diagnostics in automation and record the Python, LibreOffice, and Poppler versions in provenance when those tools run.
