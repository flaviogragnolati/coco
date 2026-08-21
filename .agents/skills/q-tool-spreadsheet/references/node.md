# Node backend

Load this reference only after the main skill selects Node.

Use Node 18+ with exactly `exceljs 4.4.0` and the declared `uuid 11.1.1` override. The override avoids the current npm advisory affecting ExcelJS's older transitive UUID range. Resolve the packages from the skill runtime or from the project root named by `SPREADSHEET_SKILL_NODE_ROOT`; the backend rejects other versions. The skill never runs `npm install` or a network audit, so environment preparation and dependency-audit policy stay outside runtime execution.

## Reading and preservation

- Treat `cell.value` as a tagged value, not a scalar. Formula, shared-formula, error, rich-text, hyperlink, and date values require separate handling.
- A formula value uses `{ formula: "SUM(B2:B9)", result: ... }`; the stored formula omits the leading `=`. Do not fabricate a cached `result` to make an unrecalculated file appear complete.
- Use `cell.text` only for bounded display or extraction. Preserve the underlying typed value when editing.
- Iterate existing rows and cells rather than probing large ranges with `getCell`, which creates cells and inflates the workbook model.
- Treat styles as mutable shared objects. Assign fresh nested objects for deliberate changes instead of aliasing another cell's style object.

## Authoring

Build formulas, values, formats, sheet names, tables, and print settings only from the approved workbook mapping. Use 8-digit ARGB color values and explicit UTC-aware date handling. Preserve leading-zero identifiers and formula-looking CSV/TSV fields as strings unless the caller explicitly authorizes formulas.

For large new workbooks, the streaming writer keeps memory bounded, but committed rows cannot be revisited. Finish values, formulas, and styles before committing each row.

Write to a temporary output in the authorized destination directory, close the workbook, run the bundled `check` and `inspect` commands, then atomically replace only an approved destination. For recalculation, compare the exact formula-set hash and count before committing the candidate; never destroy an earlier destination when post-conversion validation fails.

## Known limits

Do not use the Node backend to mutate macro-enabled or template packages. Existing pivot tables, charts, slicers, drawings, external data features, signatures, and unsupported extensions may not round-trip. Structural row or column insertion may not repair every dependent formula or named range. The safety checker rejects very large cell or merge models before ExcelJS builds its in-memory workbook representation. Use a separately verified Excel-native route or return the preservation gap when any unsupported object or rejected complexity matters.
