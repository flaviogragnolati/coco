# PDF troubleshooting

Load this reference only after a concrete failure or validation discrepancy appears.

## The output already exists

Confirm that the resolved target is the intended file and is not any input. Obtain explicit replacement approval, then rerun with `--overwrite`. For directory-producing commands, choose a fresh empty directory; the flag never clears a non-empty directory.

## The PDF opens in one viewer but not another

1. Run `qpdf --check` through `scripts/pdf check`.
2. Reopen with the selected library and PDF.js or pypdf.
3. Rewrite to a new file with `repair`, then recheck.
4. Compare encryption, object streams, cross-reference tables, and minimum PDF version.
5. Do not replace the original repaired file until the rewritten copy passes visual comparison.

## Output is blank or pages disappeared

- Confirm page indexes after converting from 1-based ranges.
- Check whether pages were copied but not added to the destination document.
- Inspect media and crop boxes; an invalid crop can hide the whole page.
- Check inherited resources and object references after page copying.
- Reopen the saved bytes before atomic rename.

## Overlay or watermark is displaced

- Inspect page rotation and transfer rotation into content before placement when required.
- Distinguish media-box coordinates from crop-box visible coordinates.
- Confirm the stamp's own page box and origin.
- Render the exact affected page and compare a high-zoom crop.
- Avoid calculating positions from rendered pixels unless the DPI-to-point transform is recorded.

## Form values exist but are not visible

- Regenerate field appearances with an embedded font.
- Confirm widgets are associated with the expected page.
- Check for XFA overriding AcroForm values.
- Inspect duplicate field names and parent/child field hierarchies.
- Test another viewer; some viewers synthesize appearances while others require `/AP` streams.
- Flatten only after the interactive version renders correctly.

## Missing glyphs, black boxes, or encoding errors

- Stop using a base-14/standard font for unsupported characters.
- Embed a licensed Unicode-capable font and regenerate appearances.
- Check whether the font has the required glyphs, not merely the correct family name.
- Verify shaping requirements for complex scripts; basic glyph embedding may be insufficient.
- Render all pages and search extracted text for replacement characters.

## Text extraction is empty

- Inspect whether the page is image-only.
- Check for unusual encodings, invisible text, or text converted to vector outlines.
- Try PDF.js, pdfplumber, and `pdftotext` before deciding OCR is required.
- OCR only the pages that lack a usable text layer when mixed documents are involved.

## Text order is wrong

- Use item coordinates, direction, and line clustering rather than plain content-stream order.
- Detect columns, headers, footers, and sidebars separately.
- Use tagged-PDF structure when reliable, but validate it against the rendered page.
- Preserve page and bounding-box provenance in extracted data.

## Table extraction merges or splits cells incorrectly

- Render detected lines, intersections, and table boxes.
- Switch between line-based and text-alignment strategies.
- Tune tolerances at the page's coordinate scale, not from a copied example.
- Handle merged cells and repeated headers explicitly.
- Do not silently coerce ragged rows into a rectangular data frame.

## Encrypted input fails in Node

- `pdf-lib` cannot decrypt it.
- Confirm authorization and use qpdf to create a temporary decrypted working copy.
- Keep passwords in environment variables and send qpdf arguments through stdin.
- Delete the temporary clear-text file after validation.
- Re-encrypt the final output with AES-256 only if required by the document contract.

## OCR degraded the page image

- Retry without deskew, rotation, cleanup, or background removal options.
- Confirm language packs and page orientation.
- Compare the original and OCR renders pixel-for-pixel where appearance should remain unchanged.
- Preserve the original image layer and add only the text layer when possible.

## Memory exhaustion

- Process one page or one source document at a time.
- Avoid high-DPI rendering of all pages concurrently.
- Prefer native qpdf page operations for large composition tasks when they preserve the needed semantics.
- Do not keep duplicate ArrayBuffers, PIL images, or decoded canvases alive.
- Write batch outputs incrementally with explicit partial-result manifests.

## Signed PDF reports an invalid signature

Any byte-level rewrite can invalidate a signature or change the revision it covers. Preserve the signed original, report that the derived file is modified, and use a signature-aware workflow when a new valid signature is required.
