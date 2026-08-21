# Node backend

Load this reference only after routing selects Node.

## Supported environment

The bundled PDF.js release requires a modern Node runtime. Use Node 22.13 or newer for the reference path.

Node:

```bash
cd scripts/node
npm install
node pdf-tool.mjs doctor
```

The dependency owner is `scripts/node/package.json`.

## Library roles

| Library/tool | Use it for | Do not assume |
|---|---|---|
| pdf-lib | create and modify PDFs, copy pages, draw overlays, set boxes and rotation, inspect/fill/flatten AcroForms | page-text extraction, encrypted PDF support, XFA preservation, rendering |
| pdfjs-dist | parse pages, extract text items and coordinates, inspect annotations, page geometry | general document rewriting or exact logical reading order |
| @pdf-lib/fontkit | embed custom fonts and update form appearances for broader Unicode coverage | unrestricted font licensing or automatic text shaping for every script |
| qpdf | structural validation, authorized decryption, AES-256 encryption, repair/rewrite, linearization | visible-content interpretation |
| Poppler | page rendering, text fallback, embedded-image extraction | PDF rewriting |
| OCRmyPDF | OCR orchestration | browser-only execution or perfect recognition |

## Runtime-specific execution

Use Node as the compatibility baseline. Keep the adapter ESM and import Node built-ins with `node:` specifiers. Resolve input paths from the caller's current working directory, not from the script directory.

The Node dependencies are pure JavaScript. Native canvas packages complicate installation, so page rendering delegates to Poppler instead of embedding a mandatory canvas dependency. For encrypted inputs, native-tool commands use an authorized qpdf-generated temporary working copy so passwords are not exposed in process arguments.

## pdf-lib recommendations

- Load bytes into `PDFDocument` only for documents of a size that fits comfortably in memory; most operations are not streaming.
- Use `copyPages()` only for page-centric documents. The bundled adapter refuses merge/select/split when an input contains AcroForm or XFA fields because `copyPages()` does not preserve their document-level semantics reliably. Route those files to Python/qpdf.
- Use `embedPage()` plus `drawPage()` for stamps and watermarks, and calculate scale/offset from actual page boxes.
- Inspect `getRotation()`, `getMediaBox()`, and `getCropBox()` before placing content.
- Register fontkit and embed an authorized font when field values or generated text exceed WinAnsi coverage.
- Call `form.updateFieldAppearances(font)` when appearance generation matters, then inspect the rendered result.
- Call `form.flatten()` only after values and appearances are verified. Flattening is irreversible in the output and does not make an XFA form equivalent to a flattened AcroForm.
- Use the form field's typed API (`PDFTextField`, `PDFCheckBox`, `PDFRadioGroup`, `PDFDropdown`, `PDFOptionList`) rather than guessing from object internals.
- Save to a temporary path, reopen the bytes, and validate before rename.

## PDF.js recommendations

- Use the legacy Node build from `pdfjs-dist/legacy/build/pdf.mjs` for the command-line adapter.
- Pass a `Uint8Array` to `getDocument()` and close/destroy the loading task after use.
- Preserve text item transforms, width, height, direction, and font name when layout matters.
- Joining `item.str` with spaces is only a plain-text approximation. Reconstruct lines and columns from coordinates for layout-sensitive extraction.
- Disable or isolate risky dynamic evaluation when processing untrusted documents according to the host's threat model.
- Do not configure a browser worker path for the Node CLI unless the deployment deliberately uses worker threads.

## Programmatic creation

Use `pdf-lib` for fixed-position layouts, overlays, forms, and low-level page composition. Use pdfmake or an HTML-to-PDF pipeline for flowing business documents with styles, tables, headers, footers, and automatic pagination.

Creation rules:

- Define page size and margins explicitly.
- Embed fonts and images once, then reuse references.
- Implement line wrapping and page breaks deliberately when using low-level drawing APIs.
- Do not use canvas screenshots of text as a substitute for real text unless the caller accepts accessibility and search losses.
- Validate in at least two PDF viewers when forms or advanced fonts are involved.

## Node pitfalls

- `pdf-lib` does not extract ordinary page text; use PDF.js or a native text extractor.
- `pdf-lib` does not decrypt encrypted PDFs. Preprocess with qpdf only with authorization.
- Do not persist raw qpdf `--check` or encryption reports from password-bearing files; older encryption modes can expose reconstructed user-password material.
- Page copying can lose outlines, attachments, tags, and interactive-form relationships. The bundled Node adapter rejects form-bearing merge/select/split operations rather than emitting a plausible but broken form.
- Standard fonts do not cover arbitrary Unicode. Missing glyphs may throw or render incorrectly.
- PDF.js text item order is content-stream order, not guaranteed human reading order.
- Browser examples that depend on DOM canvas or worker URLs do not transfer unchanged to Node.
- Large documents can require several copies of the byte buffer during load, modification, and save.
- Node or dependency failures are runtime failures, not PDF corruption; route to Python before any output is committed rather than retrying mutations.
- Form appearance behavior varies across viewers. A field value existing in the object graph does not prove it is visible.
- Any rewrite can invalidate digital signatures and incremental revision expectations.

## Runtime smoke sequence

Run this after installing dependencies:

```bash
node pdf-tool.mjs doctor
node pdf-tool.mjs inspect tests/fixtures/basic.pdf --json
node pdf-tool.mjs select tests/fixtures/basic.pdf --pages 2,1 --output /tmp/selected.pdf
node pdf-tool.mjs check /tmp/selected.pdf
```

Never pass `--overwrite` during the smoke sequence unless replacement of the exact target was explicitly approved.
