# Spreadsheet delegation contract

Use this contract when another Quasar skill delegates spreadsheet mechanics. The caller owns approved data, formula semantics, assumptions, business interpretation, branding intent, lifecycle, release decisions, source versions, and authorized paths. `q-tool-spreadsheet` owns backend selection, bounded XLSX and delimited-text mechanics, safe file handling, structural and formula checks, rendered inspection, and operation provenance.

## Request

Pass one `spreadsheet_request` conforming to [`spreadsheet-request.schema.yaml`](spreadsheet-request.schema.yaml) with:

- `schema_version: "1.0"`, a stable `request_id`, caller, owner, and execution mode;
- one operation from the command contract;
- exact source refs, paths, versions, and hashes when available;
- workbook type, intended result, preservation requirements, formula requirements, and forbidden semantic changes;
- a distinct output path for mutations, `overwrite: false | true`, and an approval reference when true;
- `runtime: auto | python | node`;
- required structural, formula, and rendered checks;
- security flags for macros, external links, data connections, embedded objects, signatures, protection, sensitive content, and retention.

Keep passwords, protected workbook secrets, and sensitive cell values out of a durable request. A standalone request may use a stable `request:` source ref when no project artifact exists.

Complete the request when the tool can resolve one semantic owner, one authorized source set, one operation, one output policy, every preservation constraint, and the exact evidence demanded by the caller.

## Result

Return one `spreadsheet_result` conforming to [`spreadsheet-result.schema.yaml`](spreadsheet-result.schema.yaml) with:

- the same `request_id` and `owner_skill`, plus `generator_skill: q-tool-spreadsheet`;
- `outcome: completed | completed_with_warnings | blocked`;
- selected runtime and observable dependency or native-tool versions;
- exact inputs and each output path and hash;
- `creation_mode: derived` and `semantic_authority: none` for every persisted output;
- structural, formula, and rendered validation, exact formula-set hash, formula and external-formula counts, error counts, and unavailable checks;
- preserved semantics, intentional changes, capability gaps, warnings, blockers, and exact command provenance.

Use `completed_with_warnings` only when every required output is usable and an accepted non-required check or limitation remains. Use `blocked` for unauthorized overwrite, source/output collision, missing required backend or native tool, unsafe package content, unsupported macro or template mutation, structural failure, missing formula evidence, required visual-validation gap, semantic-preservation conflict, or missing output.

The caller reviews semantic fidelity and incorporates accepted outputs into its own result. Only the root orchestrator registers persistent outputs or changes workflow state and the artifact index.
