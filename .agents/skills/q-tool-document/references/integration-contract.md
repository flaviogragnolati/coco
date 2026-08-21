# Document delegation contract

Use this contract when another Quasar skill delegates DOCX or DOTX mechanics. The caller owns approved content, meaning, branding intent, lifecycle, release decisions, source versions, and authorized paths. `q-tool-document` owns runtime selection, bounded Open XML mechanics, safe file handling, structural checks, rendered inspection, and operation provenance.

## Request

Pass one `document_request` conforming to [`document-request.schema.yaml`](document-request.schema.yaml) with:

- `schema_version: "1.0"` and a stable `request_id`;
- one operation from the command contract;
- caller and owner skill IDs plus execution mode;
- exact source artifact IDs, versions, paths, and hashes when available;
- document type, intended result, preservation requirements, and forbidden semantic changes;
- distinct input and output paths, `overwrite: false | true`, and an approval reference when true;
- `runtime: auto | python | node`;
- required structural and visual checks;
- security flags for macros, external relationships, signatures, protection, comments, tracked changes, sensitive content, and the caller's retention policy.

Do not serialize document passwords, private comment text, or other secrets into a durable request. Keep sensitive values transient.

For Proposal or Reporting, name the exact canonical source and mapping versions. The renderer remains the owner; this tool must not revise narrative, branding, commitments, report status, or release state to make the package easier to generate.

Complete the request when the tool can identify one authorized source set, one output target, one runtime policy, every preservation requirement, and the exact evidence the caller needs.

## Result

Return one `document_result` conforming to [`document-result.schema.yaml`](document-result.schema.yaml) with:

- the same `request_id` and `outcome: completed | completed_with_warnings | blocked`;
- `owner_skill` unchanged and `generator_skill: q-tool-document`;
- selected runtime and native tools with observable versions when available;
- operation and exact inputs;
- each output path and hash as `creation_mode: derived` and `semantic_authority: none`;
- structural and rendered validation, inspected pages, and unavailable checks;
- preserved semantics, intentional visible changes, capability gaps, warnings, and blockers;
- provenance linking exact source refs and command invocation.

Use `completed_with_warnings` only when every required output exists and is usable but a non-required check is unavailable or an accepted limitation remains. Use `blocked` for an unauthorized path or overwrite, missing required runtime, unsafe package, macro-bearing input, unsupported revision semantics, structural failure, required visual-validation gap, semantic-preservation conflict, or missing output.

The caller reviews semantic fidelity and incorporates accepted outputs into its own `stage_result`. Only the root orchestrator registers persistent outputs or changes workflow state and the artifact index.
