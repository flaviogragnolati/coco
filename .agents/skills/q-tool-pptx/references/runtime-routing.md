# Runtime routing

Load this reference only when automatic selection is ambiguous, a backend is unavailable, or deterministic routing is required.

## Routing contract

The dispatcher selects one execution runtime: `python` or `node`.
- Underlying tools: python-pptx, Pillow, JSZip, fast-xml-parser, LibreOffice, Poppler.

The same operation can use a native CLI from either family. Rendering always delegates to LibreOffice plus Poppler; do not duplicate a renderer inside each language.

## Explicit controls

| Control | Meaning |
|---|---|
| `--runtime python\|node` | Highest-priority per-command override |
| `PPTX_SKILL_RUNTIME` | Persistent runtime override for the current process |
| `PPTX_SKILL_NODE` | Explicit Node executable |
| `PPTX_SKILL_PYTHON` | Explicit Python executable |
| `PPTX_SKILL_PREFER=python\|node` | Preference when both backends are healthy |
| `PPTX_SKILL_RUNTIME_ORDER=python,node` | Ordered fallback list |
| `PPTX_SKILL_NO_FALLBACK=1` | When a nearest project marker exists, fail instead of leaving that marked runtime after it is rejected |
| `PPTX_SKILL_SELECTED_RUNTIME` | Set by the dispatcher for backend diagnostics; do not set manually |

Use an explicit runtime in reproducible automation and CI. Use automatic routing for interactive agent work.

## Automatic selection

1. Parse the command before selecting a runtime.
2. Apply explicit runtime controls.
3. Apply operation constraints: programmatic creation, `select`, `replace-text`, and `contact-sheet` require Python in this implementation; every unified CLI command not listed there has both adapters, although `render` delegates to native tools from either family.
4. Walk from the current directory toward the filesystem root and inspect the nearest project markers:
   - Node: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`;
   - Python: `pyproject.toml`, `uv.lock`, `requirements.txt`, `.python-version`.
5. Check runtime availability and required local dependencies.
6. Apply family preference and fallback order.
7. Print the selected runtime to stderr unless `--quiet` is active.

A marker is evidence of project intent, not proof that dependencies are installed. `doctor` must distinguish executable availability, package availability, native-tool availability, and operation coverage.

## Capability matrix

| Capability | Python | Node | Shared native tool |
|---|---:|---:|---|
| Inspect deck metadata and per-slide summary | yes | yes | — |
| Extract slide text and speaker notes | yes | yes | — |
| Extract embedded media | yes | yes | — |
| Structural `check` (zip, content types, relationships, slide list, XML) | yes, plus a python-pptx open check | yes | — |
| Keep/drop/reorder slides (`select`) | yes | no built-in route | — |
| Duplicate slides or merge decks | no — explicit boundary | no | — |
| Template text fill (`replace-text`) | yes | no built-in route | — |
| Render slides to images | wrapper | wrapper | LibreOffice + `pdftoppm` |
| Labeled contact sheet | yes (Pillow) | no built-in route | LibreOffice + `pdftoppm` |
| Programmatic deck creation | python-pptx | no declared safe route | — |
| Legacy `.ppt`, `.pptm` macros, encrypted packages | unsupported | unsupported | — |

## Fallback rules

Fallback is allowed before any output is committed. It is not allowed to conceal a semantic difference.

- If Node is selected for creation, `select`, `replace-text`, or `contact-sheet`, route to Python only when Python is healthy and fallback is allowed.
- If rendering tools are missing, stop visual-sensitive operations rather than skipping validation.
- If Node or its dependencies fail, route to Python before any output is committed when Python preserves the required semantics; a runtime failure is not deck corruption.
- If the requested feature has no semantics-preserving route (slide duplication, deck merge, legacy formats), stop with the missing capability and the least-loss alternative.

## Compatibility boundary

This version supports exactly two runtimes: Python and Node. The dispatcher rejects every other runtime. Add another runtime only with its own dependency contract, executable smoke evidence, and an updated capability matrix.
