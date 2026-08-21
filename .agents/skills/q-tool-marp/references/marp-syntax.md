# Marp syntax

Load this reference when authoring or revising Marp Markdown.

- Start with YAML frontmatter containing `marp: true`, the approved `theme`, `size: 16:9`, and explicit pagination policy.
- Separate slides with a line containing only `---` after the frontmatter.
- Use one primary heading or assertion per slide. Keep source IDs close to the supported claim or in speaker notes.
- Write speaker notes as Marpit comments: `<!-- note text -->`. Do not hide sensitive or unauthorized material there.
- Use local directives such as `_class`, `_paginate`, or approved background directives only when the theme defines their behavior.
- Keep raw HTML disabled unless the request selects the bounded safe policy. Markdown remains the default representation.
- Do not place `--`, server/watch/preview directives, config paths, engines, or plugin instructions in source content.

Complete authoring when frontmatter, slide boundaries, theme, notes, and source references are explicit and validate locally.
