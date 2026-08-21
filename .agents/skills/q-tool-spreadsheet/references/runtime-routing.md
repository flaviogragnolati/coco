# Runtime routing

Load this reference only when automatic selection is ambiguous, a backend is unavailable, or reproducible automation requires a fixed runtime.

## Controls

| Control | Meaning |
|---|---|
| `--runtime python|node` | Highest-priority dispatcher override. |
| `SPREADSHEET_SKILL_RUNTIME` | Process-level runtime override. |
| `SPREADSHEET_SKILL_PREFER=python|node` | Preference when both backends are healthy. |
| `SPREADSHEET_SKILL_RUNTIME_ORDER=python,node` | Ordered automatic fallback. |
| `SPREADSHEET_SKILL_NO_FALLBACK=1` | Fail instead of leaving a marked project runtime. |
| `SPREADSHEET_SKILL_PYTHON` / `SPREADSHEET_SKILL_NODE` | Explicit executable path. |
| `SPREADSHEET_SKILL_NODE_ROOT` | Project or prepared environment whose `package.json` resolves `exceljs`. |

Use an explicit runtime in CI. Use automatic routing for interactive work.
The POSIX dispatcher also interprets nearest project markers, ordered fallback,
and `SPREADSHEET_SKILL_NO_FALLBACK`. The PowerShell dispatcher supports explicit
runtime, runtime preference, executable overrides, and an explicitly supplied
`SPREADSHEET_SKILL_NODE_ROOT`; it does not infer project roots or ordered
fallback, so set those controls directly on Windows when reproducibility matters.

## Selection

1. Parse the operation and workbook type before routing.
2. Apply `--runtime`, then `SPREADSHEET_SKILL_RUNTIME`.
3. Reject a backend that lacks its declared package or operation coverage.
4. Inspect the nearest project markers and only prefer that runtime when its dependency check succeeds.
5. Apply the configured preference and fallback order.
6. Report the selected runtime, package version, native tools, and gaps.

`check`, `doctor`, and `--help` use standard-library or built-in mechanics. Cell-level inspection and conversion need `openpyxl >=3.1.5,<4` in Python or `exceljs 4.4.0` with the declared `uuid 11.1.1` override in Node. Recalculation and rendering additionally need local LibreOffice. The tool never installs or audits any of them.

## Capability matrix

| Capability | Python | Node | Shared native tool |
|---|---:|---:|---|
| Doctor and bounded ZIP/OPC check | yes | yes | — |
| XLSX inspect and extraction | `openpyxl` | `exceljs` | — |
| Caller-specific XLSX create/edit script | `openpyxl` | `exceljs` | — |
| CSV/TSV ↔ XLSX conversion | yes | yes | — |
| Recalculate into a distinct XLSX | wrapper and verification | wrapper and verification | LibreOffice Calc |
| Render workbook to validation PDF | wrapper and verification | wrapper and verification | LibreOffice Calc |
| `.xlsm`, `.xltm`, `.xltx` read-only inspect/check | yes | yes | — |
| Macro/template mutation or recalculation | no | no | specialist route required |
| Microsoft Excel fidelity certification | no | no | Microsoft Excel review required |

Fallback is allowed only before an output is committed and only when it preserves the same operation contract. If neither backend covers the request, return read-only inspection, a caller-owned edit plan, or the exact calculation/rendering gap rather than a plausible damaged workbook.
