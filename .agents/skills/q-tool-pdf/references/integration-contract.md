# PDF delegation contract

Use this contract when another Quasar skill delegates PDF mechanics. The caller owns document meaning, approved source versions, lifecycle, release decisions, and authorized paths. `q-tool-pdf` owns runtime selection, safe file operations, structural checks, rendered inspection, and operation provenance.

## Request

Pass one `pdf_request` with:

- `schema_version: "1.0"` and a stable `request_id`;
- one operation from the command contract, or `create` for a programmatic source-to-PDF route;
- caller `skill_id`, `workflow`, and `mode`;
- `owner_skill` and `owner_workflow`;
- every persistent source as an exact artifact ID and version, plus its path and hash when available;
- the PDF classification, page scope, intended result, preservation requirements, and forbidden semantic changes;
- input and output paths, `overwrite: false | true`, and the approval reference when true;
- `runtime: auto | python | node`;
- required structural and visual checks;
- security flags for encryption, signatures, redaction, flattening, sensitive fields, and retention.

Never serialize passwords or private field values into the request. Pass secrets only through the approved environment-variable path, and keep sensitive value mappings transient.

For a generated Proposal or Report PDF, name the exact canonical source version. The renderer remains the owner; this tool must not revise content, branding intent, commitments, report status, or release state to make conversion easier.

Validate the request against [`pdf-request.schema.yaml`](pdf-request.schema.yaml).

Complete the request when the tool can identify one authorized source set, one output target, one runtime policy, every preservation requirement, and the validation evidence the caller needs.

## Result

Return one `pdf_result` with:

- `schema_version: "1.0"`, the same `request_id`, and `outcome: completed | completed_with_warnings | blocked`;
- `owner_skill` unchanged and `generator_skill: q-tool-pdf`;
- selected runtime and backend tools with observable versions when available;
- operation, page scope, and inputs;
- each output path and hash, classified as `creation_mode: derived` and `semantic_authority: none`;
- structural and visual validation states, inspected pages, and any unavailable check;
- preserved semantics, intentional changes, accepted losses, warnings, and blockers;
- provenance linking the exact source refs and command contract.

Validate the result against [`pdf-result.schema.yaml`](pdf-result.schema.yaml).

Use `completed_with_warnings` only when every required output exists and is usable but a non-required check is unavailable or an accepted limitation remains. Use `blocked` for an unsupported or unauthorized operation, missing required runtime or renderer, structural failure, required visual-validation gap, ambiguous form mapping, semantic-preservation conflict, or missing requested output.

The caller reviews semantic fidelity and incorporates accepted outputs into its own `stage_result`. Only the root orchestrator registers persistent outputs or changes workflow state and the artifact index.
