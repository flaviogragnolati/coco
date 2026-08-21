# Node backend

Load this guide only after the dispatcher selects Node.

Run directly when deterministic routing is required:

```bash
node scripts/node/document-tool.mjs --help
node scripts/node/document-tool.mjs inspect input.docx --json
```

The backend supports Node 18+ without npm dependencies. Its built-in ZIP reader/writer validates member paths, CRCs, expanded size, compression ratio, encryption flags, and supported compression methods before exposing any Open XML part. It modifies only bounded parts and writes through a temporary archive.

Node comments and redlines require the target to be the complete text of one direct paragraph run. Route a substring target to Python only when doing so preserves the caller's exact intent; otherwise return the structure gap. Text replacement can operate within one `w:t` element.

When `xmllint` is unavailable, Node `check` verifies package structure and relationship targets but reports XML-well-formedness coverage as partial. `convert` and `render` invoke verified local `soffice`; `render` uses `pdftoppm` only when present.

The bundled `package.json` is metadata and an engine declaration, not an instruction to install dependencies.
