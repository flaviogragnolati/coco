# Theme CSS guide

Load this reference only when creating or revising a Marp theme.

- Begin with `/* @theme <stable-id> */` and scope slide rules to `section` plus named classes.
- Declare `size: 16:9` in the source and design on a 1280×720-equivalent canvas.
- Use local system-font stacks unless the caller supplies an authorized embeddable font. Do not use `@import`, remote fonts, or remote `url(...)` values.
- Define a restrained palette with CSS custom properties, visible focus and source styles, and sufficient contrast. Never rely on color alone.
- Keep layout classes semantic and few: lead, section, columns, evidence, metrics, table, and close are usually sufficient.
- Avoid scripts, generated remote content, hidden overflow that masks content, and decorative effects that impair fidelity.
- Hash the exact CSS used for rendering and deliver it with the source bundle.

Complete theme work when the CSS is offline, stable, legible, scoped, validated, and traceable to its owning visual identity or neutral design brief.
