# PPTX troubleshooting

Load this reference only after a concrete failure or validation discrepancy appears.

## The output already exists

Confirm that the resolved target is the intended file and is not any input. Obtain explicit replacement approval, then rerun with `--overwrite`. For directory-producing commands, choose a fresh empty directory; the flag never clears a non-empty directory.

## PowerPoint offers to repair, or refuses, a deck other tools open

LibreOffice and the reading libraries tolerate structural faults PowerPoint rejects, so "it renders here" proves little.

1. Run `scripts/pptx check` and fix every reported error: undeclared content types, missing relationship targets, malformed XML, dangling `sldIdLst` entries.
2. If the deck was generated, fix the generator script and regenerate; do not hand-patch the packed XML of a generated file.
3. If the deck was edited as raw XML, the usual causes are a re-serialized part with rewritten namespace prefixes, an edit through a non-OOXML-aware XML round-trip, or a re-zipped package with altered entry metadata. Redo the edit through the modeled API or a minimal in-place element edit.
4. For generated charts, suspect incompletely declared axes or unsupported option combinations; simplify the chart configuration until the file opens, then reintroduce options one at a time.

## Rendered slides look wrong but the package checks clean

- Fonts: a substituted font changes widths and wrapping. Confirm whether the target audience machine has the font; re-check fit with a metric-safe font or accept and record the approximation.
- Blank or partial slides: exotic effects and embedded objects may not render in LibreOffice; verify in PowerPoint before treating it as a package defect.
- Wrong slide order in evidence: renders are numbered by `sldIdLst` order; regenerate the render directory instead of mixing files from two runs.

## LibreOffice hangs or produces nothing

- The tool isolates a disposable user profile; if a manual invocation hangs, a stale profile lock is the usual cause — never share a profile between concurrent conversions.
- Confirm `soffice --version` runs headless in this environment at all, and that the input path is absolute when invoking manually.
- One conversion at a time: parallel LibreOffice instances against the same profile interfere.

## replace-text reports zero or fragmented matches

- Zero matches: the visible text may differ from the stored text — check for smart quotes, non-breaking spaces, or case differences with `extract-text`, and align the map keys to the stored form.
- Fragmented-run warnings: the find string spans runs with different formatting. Either adjust the source template so each token lives in one run, target a shorter token that stays within a run, or perform a deliberate raw-XML paragraph edit and re-run `check` plus rendered QA. Do not switch to whole-frame text assignment silently; that destroys formatting the contract preserves.

## Text extraction misses content you can see

- Grouped shapes: confirm the traversal recursed groups (both backends do; a custom script may not).
- Charts, SmartArt, and embedded objects store text outside the slide's shape tree; extract from their parts deliberately or report the boundary.
- Text baked into images requires OCR, which is out of scope here; report it as an image, not as missing text.

## select produced fewer slides than expected

- Re-read the specification: order defines output order, and ranges are inclusive; `1,3-4` yields three slides.
- Repeated numbers are rejected by design; a request that needs duplication is a package-cloning task this version does not implement.
- The command verifies the reopened output's slide count; if that verification itself failed, treat the deck as suspect and re-run `check` on the input.

## The right backend never gets selected

Follow `runtime-routing.md`: check `doctor` for both runtimes, remember that a project marker is a preference rather than proof of health, and pin `--runtime` for reproducible automation. `select`, `replace-text`, and `contact-sheet` are Python-only by design; a Node pin on those commands correctly fails with exit code 5.
