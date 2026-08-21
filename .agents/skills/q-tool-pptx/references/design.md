# Deck design and visual QA

Load this reference before authoring a new deck or restyling slides, and again when running visual validation. It owns presentation craft; the runtime guides own the APIs.

## Content discipline

- One message per slide. A slide that needs a paragraph of explanation is an outline problem, not a font-size problem; split it or return the fit problem to the content owner.
- The caller owns the words. Trim, split, or re-layout with approval — never invent, drop, or reword commitments to make content fit.
- Every slide should carry one visual anchor: an image, chart, table, diagram, or strong typographic statistic. A deck of bare bullet lists reads as unfinished.
- Speaker notes carry the narration; slides carry the evidence. Do not move notes content onto the slide to fill space.

## Palette

- Choose colors informed by the topic and the client's identity, not a generic default. When a template or brand palette exists, it wins; when none exists, propose one and record it in the result.
- Use one dominant color for most of the visual weight, one or two supporting tones, and a single accent reserved for emphasis. Equal-weight multicolor slides read as noise.
- Keep contrast honest: dark text on light ground or light on dark, checked against the real background, including images behind text.
- Apply the palette consistently across every slide — same accent for the same semantic role throughout.

## Typography

Rendered QA in this skill uses LibreOffice, which substitutes any font it does not have; a substituted font with different metrics makes overflow checks unreliable. Therefore:

- Prefer widely-installed, metric-stable fonts for body text (Arial, Calibri, Times New Roman, Courier New and similar Office-shipped families). They render true in QA and open correctly on the audience's machine.
- Decorative or client-brand fonts are fine for titles when the caller requires them, but size those containers with visible slack and treat the rendered fit as approximate; note that limitation in validation results.
- Never rely on a font the audience's Office installation is unlikely to have unless embedding is explicitly licensed and approved.
- Keep a clear size hierarchy: slide titles noticeably larger (roughly 36–44 pt), section headers in the 20–28 pt band, body text 14–18 pt, captions 10–12 pt. A deck where titles and body are near-equal sizes loses its structure at projection distance.
- Left-align body text and lists; reserve centering for titles and isolated statements.

## Layout

- Set the slide size first and design inside it with at least ~0.5 in of margin on every edge; nothing touches the canvas boundary.
- Vary layouts across the deck — columns, image-plus-text, grids, full-bleed images with overlaid titles, big-number callouts — instead of repeating one title-and-bullets pattern.
- Align to a simple grid: consistent gutters, consistent block spacing, columns that share edges. Uneven gaps are the second most visible defect after overflow.
- Whitespace is a feature. A slide two-thirds full and legible beats a full slide nobody reads.
- When filling a template, map each content section onto the template layout that fits it, and delete unused template slots entirely (image and text together) rather than leaving orphaned decoration.

## Data on slides

- Use native chart objects for anything the format can chart, so the client can edit them; rasterize only chart types the format cannot represent.
- Style charts deliberately: a title or headline takeaway, labeled values where precision matters, palette-consistent series colors, quiet gridlines and axes. Unstyled default charts look like placeholders.
- Big-number callouts (one large figure with a small label) communicate single statistics better than a chart.
- Tables are for lookup, not narrative; cap visible rows and move detail to an appendix or the source document.

## Visual QA checklist

Render every generated slide (or every affected slide of an edit) and inspect the images fresh — after writing generator code you see what you intended, not what rendered. Check in this order:

1. **Overflow and truncation first**: text spilling past its box, cut at the slide edge, or colliding with a neighbor. This is the most common and most visible defect. For substituted fonts, trust your slack margins, not the pixel fit.
2. Overlapping elements: text through shapes, images over labels, stacked artifacts.
3. Leftover template content: placeholder strings, lorem ipsum, `{{tokens}}`, orphaned decorations positioned for content that changed shape. Pair the rendered pass with `extract-text` and scan for placeholder patterns.
4. Alignment and spacing: ragged column edges, uneven gutters, elements nearly touching, margins collapsing.
5. Contrast: labels over busy images, light-on-light or dark-on-dark text and icons.
6. Consistency: same palette roles, same title position, same footer treatment across slides.
7. Content integrity: every requested section present, order correct, charts and images actually rendered (not empty frames), notes intact when required.

Fix, re-render only the affected slides, and stop; do not restyle unaffected slides during QA. Record accepted imperfections explicitly in the result instead of hoping they pass unnoticed.
