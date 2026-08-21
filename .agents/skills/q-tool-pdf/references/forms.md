# PDF forms workflow

Load this reference whenever the task involves detecting, understanding, filling, creating, flattening, or visually simulating form fields.

## 1. Identify the form technology

Run:

```bash
scripts/pdf inspect form.pdf --json
scripts/pdf form-list form.pdf --output fields.json
scripts/pdf render form.pdf --output-dir .pdf-validation/form-original --dpi 180
```

Classify the document:

- **AcroForm**: ordinary interactive fields and Widget annotations; supported by both backends within their documented field types.
- **XFA**: XML-based dynamic/static forms; ordinary AcroForm edits may be hidden or ignored by XFA-aware viewers.
- **hybrid**: both AcroForm and XFA structures; requires explicit viewer testing.
- **non-fillable visual form**: printed lines, boxes, and labels with no interactive fields.
- **signed form**: fields or document revisions may be covered by a digital signature. The Python adapter refuses populated signature fields; the Node adapter conservatively refuses any signature field before rewriting.

Stop automatic filling when the form technology is uncertain and a wrong classification could produce a legally or operationally misleading result.

## 2. Map visible labels to internal fields

Do not fill from internal field names alone.

1. Export field names, types, current values, options, flags, page/widget locations when available, and fully qualified hierarchy.
2. Render every form page.
3. Correlate each internal field with its visible label, instructions, units, option labels, and page.
4. Record a mapping with:
   - internal field name;
   - visible meaning;
   - page and widget rectangle;
   - type and accepted values;
   - source of the value to enter;
   - whether the field is required, repeated, calculated, or signed.
5. Resolve duplicate or ambiguous names before writing. Renaming fields can break JavaScript actions, calculations, or external integrations, so namespace only with an explicit preservation decision.

Complete mapping when every value has one verified target and every required visible field is accounted for.

## 3. Fill AcroForm fields

Prepare `values.json` using the schema in `operations.md`, then run:

```bash
scripts/pdf form-fill form.pdf \
  --values values.json \
  --output form-filled.pdf
```

If that output already exists, obtain explicit replacement approval before adding `--overwrite`.

Recommendations:

- Preserve the original form as a separate file.
- Match radio and choice values to exported options exactly.
- Use booleans for ordinary checkboxes; inspect export values when the form uses nonstandard on-states.
- Use a licensed embedded font for values outside the standard font encoding.
- Update appearances explicitly and render all pages.
- Test calculations and dependent fields in the viewer expected by the recipient; general-purpose libraries may not execute embedded form JavaScript.
- Keep interactive output interactive unless flattening is explicitly required.

## 4. Flatten only when requested

Flattening is a distinct output contract:

```bash
scripts/pdf form-fill form.pdf \
  --values values.json \
  --output form-flattened.pdf \
  --flatten
```

Both bundled adapters flatten the complete ordinary AcroForm, not only the keys supplied in `values.json`. Existing values are retained where possible, all ordinary field appearances are materialized, and all Widget annotations are removed. Signature, push-button, unknown, or XFA fields stop the safe flatten route.

A valid flattened result must:

1. contain visible appearances for every filled field;
2. remove interactive Widget annotations for the flattened fields;
3. retain the intended page content when opened in multiple viewers;
4. no longer expose editable form controls for those fields;
5. preserve unrelated annotations only when the contract requires it.

Setting fields read-only is not flattening. Printing to PDF may flatten visually but can discard links, accessibility, vector structure, metadata, or page fidelity; use it only as an accepted-loss fallback.

## 5. Handle non-fillable forms

For a visual form without fields:

1. Extract available text and vector geometry with coordinates.
2. Render at a known DPI and inspect the page dimensions.
3. Prefer PDF-coordinate placement derived from text/line geometry.
4. Use visual estimates only for elements that have no extractable structure.
5. Create an overlay PDF with text, marks, or signatures at verified positions.
6. Merge the overlay onto the original without rasterizing the base page.
7. Render, crop around every inserted value, and inspect alignment at high zoom.

Coordinate systems differ:

- PDF drawing usually uses a bottom-left origin.
- rendered images use a top-left origin.
- page rotation and crop boxes alter the visible mapping.

Record the transform from image pixels to PDF points instead of mixing coordinate systems ad hoc.

## 6. Signatures and sensitive fields

- Do not insert a graphical signature unless the caller explicitly authorizes that representation and understands that it is not automatically a cryptographic digital signature.
- Do not modify a cryptographically signed PDF and imply the prior signature remains valid.
- Avoid logging tax IDs, health information, credentials, or other sensitive values in field mappings and command output.
- Delete temporary field-value JSON and rendered pages according to the caller's retention policy.
- Never use OCR guesses to populate consequential fields without human verification.

## 7. Validate the filled result

Check all of the following:

- every supplied value appears in the intended visible field;
- no value appears in a duplicate field unintentionally;
- text fits the field and does not clip, shrink illegibly, or overlap labels;
- checkboxes and radio buttons display the correct state;
- choice fields show the visible option expected by the user;
- calculated or repeated values are reconciled;
- interactive fields remain editable only when intended;
- flattened output contains no remaining target widgets;
- XFA-aware and ordinary viewers do not show contradictory values;
- sensitive values are absent from unintended metadata, annotations, or prior revisions.

Complete the forms workflow only after every affected page has been rendered and reviewed.
