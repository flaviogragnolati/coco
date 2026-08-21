# Integration contract

Use this contract when another skill delegates representation work. The caller owns meaning and approved paths; `q-tool-mermaid` owns the encoding and verification pass.

## Request

Validate requests against [`diagram-request.schema.yaml`](diagram-request.schema.yaml). Require:

- a stable `request_id` and one operation;
- caller and owner identity;
- exact source artifact IDs and versions when persistent project meaning is represented;
- purpose, audience, type, required elements and relationships, and forbidden inferences;
- source and render paths, formats, profile, overwrite, network, and repair limits.

The optional `source.code` carries agent-authored Mermaid to the runtime. `source.path` points to an existing source for validate, revise, or render. At least one must be available before runtime execution.

This single-diagram request supports `create`, `revise`, `validate`, and `render`. Markdown `compile` is a batch operation with document and asset-directory targets, so invoke the dedicated CLI command; it returns a transactional compile result rather than pretending that a Markdown document is one Mermaid source.

## Result

Validate results against [`diagram-result.schema.yaml`](diagram-result.schema.yaml). `owner_skill` remains the caller in orchestrated mode, while `generator_skill` is `q-tool-mermaid`. The caller reviews `semantic_alignment`; the root orchestrator alone reconciles persistent outputs.

Use `completed_with_warnings` when the source exists but a requested renderer is unavailable. Use `blocked` for invalid syntax, a security violation, semantic ambiguity, an unauthorized path or overwrite, or a missing required output.
