# Python backend

Load this reference only after routing selects Python or an operation such as table extraction requires it.

## Supported environment

- Python 3.10 or newer.
- Install from the backend project:

```bash
cd scripts/python
uv sync
uv run python pdf_tool.py doctor
```

Without `uv`:

```bash
python -m venv .venv
. .venv/bin/activate        # Windows: .venv\Scripts\activate
python -m pip install -e .
q-tool-pdf-python doctor
```

The dependency owner is `scripts/python/pyproject.toml`. It installs the runtime libraries plus ReportLab, which is used by the bundled fixtures and by the documented programmatic-creation path. Do not maintain a second unpinned requirements file.

## Library roles

| Library/tool | Use it for | Do not assume |
|---|---|---|
| pypdf | document inspection, page copy, merge/select/split, rotation, boxes, overlays, metadata, encryption primitives, AcroForm fields | visual rendering, reliable table extraction, XFA preservation, secure redaction |
| pdfplumber | text with coordinates, layout inspection, tables, ruling lines, visual table debugging | scanned text without OCR, document rewriting |
| pypdfium2 | fast page rendering to images | full document-level editing |
| ReportLab | programmatic PDF creation and overlay generation | editing arbitrary existing PDF object graphs |
| qpdf | structural checks, authorized decryption, AES-256 encryption, repair/rewrite, linearization | semantic understanding of visible content |
| Poppler | `pdftotext`, `pdftoppm`, `pdfimages` | preservation when rewriting PDFs |
| OCRmyPDF | add a searchable OCR layer to scanned PDFs | perfect recognition or lossless appearance after optional cleanup |

## Recommended sequence

1. Run `doctor` and `inspect`.
2. Use pypdf for document-level manipulation.
3. Use pdfplumber only when layout coordinates or tables are material.
4. Use PDFium or Poppler to render affected pages.
5. Use qpdf for structural validation even when pypdf wrote the output.
6. Reopen the output with pypdf and render it before handoff. Never pass `--overwrite` unless replacement of that exact target was explicitly approved.

## pypdf recommendations

- Prefer `PdfWriter.append()` or `merge()` for whole-document and page-range composition rather than manually rebuilding every object when document-level preservation matters.
- Treat user page numbers as 1-based; library page indexes are 0-based.
- Call `transfer_rotation_to_content()` before merging an overlay onto a rotated page when visual placement would otherwise use a misleading coordinate system.
- Clone page objects before applying distinct transformations to repeated source pages.
- When merging forms, namespace duplicate field names before composition. Identical field names can cause values to mirror across unrelated widgets.
- Use `auto_regenerate=False` while updating fields unless a specific viewer requires regeneration. Generate appearances explicitly and validate in more than one viewer when form fidelity matters.
- For true flattening, materialize field appearances and remove Widget annotations. Read-only flags alone do not flatten.
- Treat XFA as a separate form technology. Filling AcroForm dictionaries can leave an XFA viewer showing stale values.
- Use AES-256 when encryption is required. Do not rely on a library default that may select legacy RC4.
- Do not treat permissions flags as strong access control; they are viewer-enforced restrictions once the file can be decrypted.
- Do not persist raw qpdf `--check` or encryption reports from password-bearing files; older encryption modes can expose reconstructed user-password material.

## pdfplumber recommendations

- It performs best on machine-generated PDFs with an actual text layer.
- Inspect `chars`, `words`, lines, and rectangles before tuning table settings.
- Choose table strategies from visible structure:
  - `lines` for ruled tables;
  - `text` for aligned columns without borders;
  - explicit vertical/horizontal lines for mixed layouts.
- Render a debugging image with detected edges and table boxes before accepting extracted cells.
- Preserve page number and bounding box provenance in extracted table JSON.
- Do not concatenate rows across pages merely because column counts match; detect repeated headers and continuation semantics.

## Rendering recommendations

- Prefer pypdfium2 for in-process rendering and Poppler as the portable external fallback.
- When Poppler or another native tool must read an encrypted PDF, create an authorized temporary clear-text working copy through qpdf's stdin argument mechanism; never put the password in process arguments.
- Convert DPI to PDFium scale as `dpi / 72`.
- Render with a white background when comparing appearance across viewers that handle transparency differently.
- For visual comparison, keep DPI, antialiasing, color mode, and crop-box choice constant before and after.
- Large pages at high DPI can exhaust memory. Render one page at a time and release image objects promptly.

## Programmatic creation

Use ReportLab for custom page composition and Platypus for flowing text, tables, headers, and page breaks. Prefer an editable source format plus a proven converter for long business documents that need styles, headings, references, accessibility, or revision workflows.

Font rules:

- Embed a licensed Unicode-capable TrueType/OpenType font when the document uses non-Latin text or symbols outside base-14 fonts.
- Do not assume Unicode subscript or superscript glyphs exist in built-in fonts. Use layout markup or position smaller glyphs explicitly.
- Check font embedding rights before distributing the PDF.
- Render every page and search for replacement glyphs, empty boxes, or clipped accents.

## Python pitfalls

- Mutating a page object can affect later uses if the same object is reused.
- Page rotation, media box, crop box, trim box, and visible coordinates are different concepts.
- A crop box hides content; it does not delete it.
- Extracted text order can diverge from reading order in multi-column, positioned, or tagged PDFs.
- Rewriting may invalidate incremental signatures and can discard unsupported document-level structures.
- `strict=False` may open a malformed PDF but does not prove the rewrite is semantically safe.
- A successfully written PDF can still contain blank appearances, missing fonts, broken links, or off-page overlays.
- OCR output needs language packs matching the document; otherwise recognition quality can be misleadingly poor.

## Python-only table command

```bash
scripts/pdf --runtime python extract-tables input.pdf \
  --pages 1-5 \
  --output tables.json
```

The output keeps one entry per table with its page number, bounding box when available, and raw cell matrix. Infer headers and continuation semantics explicitly rather than treating the first extracted row as authoritative. Treat the result as extracted evidence, not as a canonical reconstruction of the source document.
