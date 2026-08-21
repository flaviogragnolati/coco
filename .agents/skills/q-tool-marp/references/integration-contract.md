# Marp delegation contract

Use this contract when another Quasar skill delegates Marp mechanics. The caller owns content, narrative, slide order, brand, approved source versions, lifecycle, release decisions, and authorized roots. `q-tool-marp` owns source-format validation, local capability checks, safe rendering, note diagnostics, and operation provenance.

## Request

Pass one `marp_request` conforming to [`marp-request.schema.yaml`](marp-request.schema.yaml) with the exact owner, source refs, approved plan, requested formats, source and theme paths plus hashes, asset and I/O roots, overwrite and sidecar policy, `network_allowed: false`, raw-HTML policy, browser hint, forbidden semantic changes, and validation demand.

The caller resolves every path before delegation. `q-tool-marp` verifies that each canonical path remains inside the declared roots and never discovers brand assets by traversing another skill. An orchestrated request keeps `caller.workflow` and `owner_skill`; a standalone request may use a null workflow.

Complete the request when one authorized source set, one immutable owner, every requested format, every write target, and the evidence required for acceptance are explicit.

## Result

Return one `marp_result` conforming to [`marp-result.schema.yaml`](marp-result.schema.yaml) with the same request ID and owner, `generator_skill: q-tool-marp`, actual runtime versions, input/output hashes, speaker-note coverage by format, separate validation and release-readiness states, persistent writes, capability gaps, warnings, blockers, and reproducible provenance.

Use `completed_with_warnings` only when all required outputs are usable and an optional check or accepted limitation remains. Use `blocked` for unauthorized paths or overwrite, network or HTML violations, missing required runtime/browser, failed required validation, semantic ambiguity, or a missing requested output. The caller reviews semantic and brand fidelity; only the root orchestrator registers persistent outputs or changes workflow state and the artifact index.
