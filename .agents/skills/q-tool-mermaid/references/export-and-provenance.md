# Export and provenance

Persist the Mermaid source beside its renders when project conventions allow. Record for every render:

- source path and SHA-256;
- output path, format, SHA-256, and non-empty verification;
- backend and resolved version;
- profile and relevant caller config;
- generator skill and exact semantic source refs.

Treat `.mmd` as authored/supporting for visual representation. Treat SVG, PNG, and PDF as derived/none. A render never becomes the source for semantic edits.

For Markdown compilation, keep the input unchanged, write a distinct derived Markdown file, use relative image links, stage every render, and write the derived document last. Refuse overwrite by default.
