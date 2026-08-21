# Runtime routing

Load this reference only when automatic selection is ambiguous, a backend is unavailable, or deterministic routing is required.

## Routing contract

The dispatcher selects an **execution runtime** and the backend selects the **PDF engine**. These are separate decisions.

- Runtime: `python` or `node`.
- PDF engine: pypdf, pdfplumber, PDFium, pdf-lib, PDF.js, qpdf, Poppler, or OCRmyPDF.

The same operation can use a native CLI from either runtime. Do not duplicate qpdf, Poppler, or OCR behavior in each language when a tested native tool already owns it.

## Explicit controls

| Control | Meaning |
|---|---|
| `--runtime python|node` | Highest-priority per-command override |
| `PDF_SKILL_RUNTIME` | Persistent runtime override for the current process |
| `PDF_SKILL_PREFER=python|node` | Runtime preference when more than one backend is healthy |
| `PDF_SKILL_RUNTIME_ORDER=python,node` | Ordered fallback list |
| `PDF_SKILL_NO_FALLBACK=1` | When a nearest project marker exists, fail instead of leaving that marked runtime after it is rejected |
| `PDF_SKILL_SELECTED_RUNTIME` | Set by the dispatcher for backend diagnostics; do not set manually |

Use an explicit runtime in reproducible automation and CI. Use automatic routing for interactive agent work.

## Automatic selection

1. Parse the command before selecting a runtime.
2. Apply explicit runtime controls.
3. Apply operation constraints:
   - `extract-tables` requires Python in this implementation;
   - `watermark --underlay` routes to Python because the Node adapter only implements an overlay;
   - `form-fill --font` routes to Node because that path embeds a custom appearance font with fontkit;
   - other unified commands have Python and Node adapters, although some delegate to native tools.
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
| Inspect ordinary PDF | yes | yes | qpdf optional |
| Merge/select/split plain PDFs; rotate/crop ordinary PDFs | yes | yes* | qpdf optional |
| Watermark/stamp | yes | yes | qpdf optional |
| Extract text | yes | yes via PDF.js | pdftotext optional |
| Extract tables | yes | no built-in route | — |
| Render pages | yes via PDFium or Poppler | wrapper only | pdftoppm |
| Extract embedded images | wrapper | wrapper | pdfimages |
| List/fill/flatten AcroForm | yes | yes | — |
| XFA preservation | limited | limited | specialist tool required |
| OCR | wrapper | wrapper | OCRmyPDF/Tesseract |
| Encrypt/decrypt/repair/linearize | wrapper | wrapper | qpdf |
| Encrypted-PDF editing without pre-decryption | limited | unsupported by pdf-lib | qpdf preprocessing |

`*` The Node adapter refuses merge/select/split when an input contains AcroForm or XFA fields. Route those page-copy operations to Python/qpdf instead of accepting broken form semantics.

## Fallback rules

Fallback is allowed before any output is committed. It is not allowed to conceal a semantic difference.

- If Node is selected for `extract-tables`, route to Python only when Python is healthy and fallback is allowed.
- If `pdf-lib` rejects encryption, use authorized qpdf decryption into a temporary working copy, perform the operation, then re-encrypt only when the document contract requires it.
- If Node page copying detects AcroForm or XFA fields, route merge/select/split to Python/qpdf; do not suppress the preservation error.
- For Poppler, `pdfimages`, or OCRmyPDF on encrypted input, create and delete a qpdf-decrypted working copy instead of passing a password on the native tool's command line.
- If Python PDFium is unavailable, use Poppler for rendering.
- If neither renderer is available, stop visual-sensitive operations rather than skipping validation.
- If Node or its dependencies fail, route to Python before any output is committed when Python preserves the required semantics.
- If the requested feature has no semantics-preserving route, stop with the missing capability and the least-loss alternative.

## Compatibility boundary

This version supports exactly two execution runtimes: Python and Node. The dispatcher rejects every other runtime. Add another runtime only with its own package contract, executable smoke evidence, and an updated capability matrix.
