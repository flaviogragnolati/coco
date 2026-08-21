# Python backend

Load this reference only after the main skill selects Python.

Use Python 3.10+ with `openpyxl >=3.1.5,<4`. Treat pandas as an optional project dependency for large data preparation, not as a runtime requirement of this skill.

## Reading and preservation

- Load once with formulas visible and, when cached results matter, a second time with `data_only=True`. Never save the `data_only` instance because it does not carry the original formula expressions.
- Use `keep_vba=True` only for read-only inspection of macro-enabled packages in this version. Preserving a VBA payload does not prove that signatures, controls, drawings, or other extensions survive a save.
- Use `keep_links=True` for inspection, but block recalculation or mutation when external workbook links or data connections are present.
- Write only the top-left cell of a merged range. Inspect style IDs, number formats, row heights, column widths, print areas, frozen panes, hidden sheets, and named ranges before changing an established workbook.
- openpyxl does not calculate formulas. A newly saved formula may have no cached result until a spreadsheet engine recalculates the file.

## Authoring

Build formulas from approved formula requirements and use English function names with comma separators in stored formulas. Keep values and formulas distinguishable. Preserve identifiers as text, dates as explicit date values, percentages as fractions, and number formats as presentation rules rather than type coercion. Treat formula-looking CSV/TSV fields as text unless the caller explicitly authorizes them as formulas.

For bulk input, prepare records first and write them through openpyxl when formulas or styles must remain editable. A pandas-computed column is a static value column unless the approved workbook mapping explicitly says that is the intended output.

Write to a temporary output in the authorized destination directory, close the workbook, run the bundled `check` and `inspect` commands, then atomically replace only an approved destination. For recalculation, compare the exact formula-set hash and count before committing the candidate; never destroy an earlier destination when post-conversion validation fails.

## Known limits

Round-tripping a workbook may lose shapes, drawings, pivot features, slicers, external data features, signatures, or extensions the library does not model. Do not edit such a workbook merely because it opens successfully. Use a separately verified Excel-native route or return the preservation gap.

For large read-only files, `read_only=True` reduces memory but removes random-access and editing capabilities. For large new files, `write_only=True` streams rows but cannot support later random edits in the same pass.
