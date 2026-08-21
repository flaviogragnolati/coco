# Python backend

Load this reference only after routing selects Python or an operation such as `select`, `replace-text`, or `contact-sheet` requires it.

## Supported environment

- Python 3.10 or newer.
- Install from the backend project:

```bash
cd scripts/python
uv sync
uv run python pptx_tool.py doctor
```

Without `uv`:

```bash
python -m venv .venv
. .venv/bin/activate        # Windows: .venv\Scripts\activate
python -m pip install -e .
q-tool-pptx-python doctor
```

The dependency owner is `scripts/python/pyproject.toml`. Do not maintain a second unpinned requirements file. Rendering additionally needs LibreOffice (`soffice`) and Poppler (`pdftoppm`) on the PATH; the tool never installs them.

## Library roles

| Library/tool | Use it for | Do not assume |
|---|---|---|
| python-pptx | open/create packages, slides, layouts, placeholders, text frames, runs, tables, pictures, charts, notes, core properties | slide duplication, cross-deck merge, SVG/EMF pictures, rendering, `.ppt` or encrypted input |
| Pillow | contact-sheet composition, image preparation for insertion | vector fidelity or font-accurate text measurement |
| defusedxml | safe parsing of package XML during `check` | schema-level OOXML validation |
| LibreOffice | deck-to-PDF conversion for rendering | font-faithful output for fonts not installed locally |
| Poppler (`pdftoppm`) | PDF-page rasterization | direct PPTX understanding |

## python-pptx recommendations

- Treat user slide numbers as 1-based; `presentation.slides` is 0-indexed.
- Assign text at the **run** level when formatting must survive. Setting `text_frame.text` or `cell.text` replaces every paragraph with one unformatted run — acceptable only for content you are about to restyle deliberately.
- A paragraph's text is the concatenation of its runs, and editors split runs unpredictably (spell-check boundaries, formatting flicks). A search string can exist in the paragraph while existing in no single run; detect that case and report it instead of pretending the replacement happened.
- All positions and sizes are EMU integers; write them with `Inches()`, `Pt()`, `Cm()`, `Emu()` and read slide size from `presentation.slide_width/slide_height` (914400 EMU per inch).
- Address placeholders through `placeholders[idx]` — the layout's placeholder `idx`, not a list position — and take layouts from the intended master. The default template's layout order is not universal; look layouts up by inspection, not by memorized index.
- `slide.notes_slide` **creates** the notes part on access; check `slide.has_notes_slide` first when reading.
- `add_picture` accepts raster formats only; convert SVG or EMF template art before insertion, or reuse a slide that already carries it.
- New-deck creation starts from a template: `Presentation()` uses the bundled default. To inherit a design system, open the client template file itself and add slides from *its* layouts.
- Chart values can be swapped with `chart.replace_data(new_chart_data)` while keeping styling; building charts from scratch requires deliberate formatting of axes, labels, and colors or they render bare.
- python-pptx round-trips parts it does not model, so opening and saving preserves masters, theme, and most exotic content — but only for parts you did not touch.

## Restructuring slides safely

`select` operates on the presentation's slide-id list and relationship graph:

- The slide order lives in `<p:sldIdLst>`; the parts live behind relationship ids. Dropping a slide means removing its `<p:sldId>` entry **and** dropping the relationship, after which saving omits the unreachable slide part, its notes, and any media only it referenced.
- Reordering moves existing `<p:sldId>` elements; content parts are untouched.
- Duplication is not implemented because a correct clone must copy the slide part, its relationships, its notes, and register content types — cloning by reference would alias charts and media across slides. The command refuses repeated slide numbers rather than emitting an aliased deck.
- After any restructure, the tool reopens the saved file and confirms the slide count; keep that verification when extending the command.

## Raw XML edits

When a need has no modeled API (exotic placeholder properties, bullet overrides), edit the existing `lxml` elements python-pptx already exposes (`shape._element`, `paragraph._pPr`) instead of serializing and reparsing parts — reparsing through a different XML library can rewrite namespace prefixes and break the package. Parse untrusted package XML with `defusedxml` during inspection. After any raw edit, run `check` and render the affected slides.

## Rendering recommendations

- Run LibreOffice headless with an isolated, disposable user profile (the tool passes `-env:UserInstallation=` to a temp directory); a shared profile can hang on a stale lock.
- Slide N maps to PDF page N maps to image N; the tool zero-pads names so lexical order equals slide order.
- Fonts not installed locally are substituted in renders. Follow the typography rules in `design.md`: keep body text on metric-safe fonts, and distrust text-fit conclusions for substituted fonts.
- Keep DPI constant when comparing before/after renders of the same deck.

## Python pitfalls

- `Presentation()` may open `.potx`, but saving under a `.pptx` name can retain the template content type. This contract keeps POTX/PPSX read-only; require a separately converted and verified PPTX instead of renaming or round-tripping the template.
- Group shapes nest; text traversal must recurse into `GroupShapes` or it silently misses content.
- `shapes.title` can be `None` on layouts without a title placeholder; guard every title access.
- A table is not a text frame: iterate `table.rows`/`row.cells` separately or its text is invisible to your pass.
- Chart and SmartArt text is not reachable through the ordinary text-frame tree; when completeness matters, say what was not extracted.
- Saving to the input path is never safe mid-iteration; the tool's distinct-output rule exists because a failed save can truncate the file.
- python-pptx accepts many structurally damaged packages that PowerPoint repairs or refuses; a successful library open is a smoke check, not proof of validity — `check` and rendered QA remain mandatory.
