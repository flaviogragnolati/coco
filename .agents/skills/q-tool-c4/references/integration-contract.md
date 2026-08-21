# C4 integration contract

Use this reference for delegated calls, persistent artifacts, report assets, or codebase discovery.

## Ownership flow

```text
semantic owner -> c4_request -> q-tool-c4 -> selected backend tool/runtime
semantic owner <- c4_result  <- model/view and validation evidence
```

The semantic owner decides what the system, boundary, responsibility, interaction, deployment, or feature means. `q-tool-c4` classifies that meaning into a consistent C4 model and view set and selects a compatible backend. A renderer owns only syntax, layout mechanics, and export. The root orchestrator alone registers persistent outputs and changes global state.

## Caller rules

| Caller | Supplies | Retains |
|---|---|---|
| `q-plan-architecture` | Approved narrative/ADR refs, boundaries, responsibilities, interactions, deployment facts, audience, and required views | Architecture decisions, standards, and semantic approval |
| `q-plan-features` | Confirmed container scope, module/feature refs, responsibilities, dependencies, and audience | Module ownership, feature definition, and technical order |
| Standalone user request | Bounded target and supplied evidence, or authorization to inspect a repository | Acceptance of inferred draft meaning and output paths |
| Report source and renderers | Exact approved C4 source/view refs and channel-neutral visual intent | Report meaning in `q-report-source`; page/slide layout and brand in the renderer |
| `q-tool-mermaid` | Receives an exact selected view after C4 meaning is fixed | Mermaid syntax, validation, bounded repair, and rendering only |

Never infer that a feature module is a C4 component. A component view is valid only inside one confirmed container. For reports, consume the exact approved source/view or its traced render; never reconstruct a model from SVG, PNG, PDF, slide shapes, or prose captions.

## Artifact classification

| Artifact | Creation mode | Semantic authority | Scope |
|---|---|---|---|
| Mermaid C4 or C4-PlantUML source | authored | supporting | `visual-representation` |
| Structurizr `workspace.dsl` | authored | supporting | `visual-model` |
| Structurizr `workspace.json` with manual layout | authored | supporting | `visual-layout` |
| SVG, PNG, PDF, or embedded report/deck asset | derived | none | `presentation` |
| C4 request, model map, diagnostics, preview | transient | none | working evidence only |

An authored visual model is not canonical architecture meaning. Preserve exact source refs, hashes, backend/runtime versions, view keys, and generator/renderer provenance. If a source changes, mark dependent renders and report channels stale through the owning workflow.

## Delegation outcomes

- `completed`: every required source and render exists and all required validation passed; semantic fidelity still records caller approval/review.
- `completed_with_warnings`: requested source exists, only explicitly optional validation/rendering is unavailable, and the limitation is named.
- `blocked`: required evidence, ownership, backend capability, syntax proof, render, or semantic decision is missing.

Return syntax and layout defects to the selected tool/runtime branch. Return abstraction, identity, boundary, relationship, or responsibility ambiguity to the semantic owner. Never cross-repair between those classes.
