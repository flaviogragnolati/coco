# PPTX delegation contract

Use this contract when another Quasar skill delegates PPTX mechanics. The caller owns deck meaning, approved source versions, lifecycle, release decisions, and authorized paths. `q-tool-pptx` owns runtime selection, safe file operations, structural checks, rendered inspection, and operation provenance.

## Request

Pass one `pptx_request` conforming to [`pptx-request.schema.yaml`](pptx-request.schema.yaml) with:

- `schema_version: "1.0"` and a stable `request_id`;
- one operation from the command contract, or `create` for a programmatic authoring route;
- caller `skill_id`, `workflow`, and `mode`;
- `owner_skill`; the caller's optional workflow remains under `caller.workflow`;
- every persistent source as an exact artifact ID and version, plus its path and hash when available;
- `work_classification` (create, template fill, restructure, read/extract, validate/render, or derived deliverable), slide scope, intended result, preservation requirements, and forbidden semantic changes;
- input and output paths, `overwrite: false | true`, and the approval reference when true;
- `runtime: auto | python | node`;
- required structural and visual checks;
- `design_constraints` for creation: template reference or brand palette, typography rules, slide size, and any layout mandates.

For a generated Report or Proposal deck, name the exact canonical source version. The renderer remains the owner; this tool must not revise content, narrative order, branding intent, commitments, or release state to make a slide fit.

Complete the request when the tool can identify one authorized source set, one output target, one runtime policy, every preservation requirement, and the validation evidence the caller needs.

## Result

Return one `pptx_result` conforming to [`pptx-result.schema.yaml`](pptx-result.schema.yaml) with:

- `schema_version: "1.0"`, the same `request_id`, and `outcome: completed | completed_with_warnings | blocked`;
- `owner_skill` unchanged and `generator_skill: q-tool-pptx`;
- selected runtime and backend tools with observable versions when available;
- operation, slide scope, and inputs;
- each output path and hash, classified as `creation_mode: derived` and `semantic_authority: none`;
- structural and visual validation states, inspected slides, and any unavailable check;
- preserved semantics, intentional changes, accepted losses, warnings, and blockers;
- provenance linking the exact source refs and command contract.

Use `completed_with_warnings` only when every required output exists and is usable but a non-required check is unavailable or an accepted limitation remains (for example, an approximate text-fit verdict on a substituted font). Use `blocked` for an unsupported or unauthorized operation, missing required runtime or renderer, structural failure, required visual-validation gap, fragmented-run replacement that could not be completed, semantic-preservation conflict, or missing requested output.

The caller reviews semantic fidelity and incorporates accepted outputs into its own `stage_result`. Only the root orchestrator registers persistent outputs or changes workflow state and the artifact index.
