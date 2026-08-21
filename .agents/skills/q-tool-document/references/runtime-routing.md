# Runtime routing

Load this reference only when automatic selection is ambiguous, a backend is unavailable, or reproducible automation requires a fixed runtime.

## Controls

| Control | Meaning |
|---|---|
| `--runtime python|node` | Highest-priority command override. |
| `DOCUMENT_SKILL_RUNTIME` | Process-level runtime override. |
| `DOCUMENT_SKILL_PREFER=python|node` | Preference when both routes are healthy. |
| `DOCUMENT_SKILL_RUNTIME_ORDER=python,node` | Ordered automatic fallback. |
| `DOCUMENT_SKILL_NO_FALLBACK=1` | Fail instead of leaving a marked project runtime. |
| `DOCUMENT_SKILL_PYTHON` / `DOCUMENT_SKILL_NODE` | Explicit executable path. |

Use an explicit runtime in CI. Use automatic routing for interactive work.

## Selection

1. Parse the operation before routing.
2. Apply `--runtime`, then `DOCUMENT_SKILL_RUNTIME`.
3. Reject a runtime that lacks operation coverage or dependencies.
4. Inspect the nearest project markers: Node package/lock files or Python project/lock/version files.
5. Apply the preference and fallback order.
6. Report the selected runtime and capability gaps.

Python package operations need only Python 3.10+ standard-library modules. Node package operations need only Node 18+ built-ins. Both conversion and rendering paths require LibreOffice; page rasterization additionally requires `pdftoppm`.

## Capability matrix

| Capability | Python | Node | Shared native tool |
|---|---:|---:|---|
| Doctor, inspect, extract text, create, check | yes | yes | — |
| Exact text replacement | one text node | one text node | — |
| Comment anchor | simple direct paragraph run; substring allowed | one complete direct paragraph run | — |
| Text insertion/deletion redline | simple direct paragraph run; substring allowed | one complete direct paragraph run | — |
| Accept ordinary text insertions/deletions | yes | yes | — |
| Full paragraph-mark or move acceptance | no | no | specialist editor required |
| DOC/ODT/RTF conversion | wrapper | wrapper | LibreOffice |
| DOCX/DOTX render to validation PDF | wrapper | wrapper | LibreOffice |
| Validation-page rasterization | wrapper | wrapper | Poppler `pdftoppm` |
| Full ISO/IEC 29500 XSD validation | no bundled route | no bundled route | separately verified validator required |

## Fallback

Fallback is allowed only before an output is committed and only when it preserves the requested semantics. Do not cross runtimes to conceal different comment-anchor or redline coverage. If neither backend covers the exact operation, return the smallest safe alternative: inspection, extracted text, an unmodified source copy, or an owner-routed edit plan.
