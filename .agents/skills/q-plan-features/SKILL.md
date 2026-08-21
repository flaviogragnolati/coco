---
name: q-plan-features
description: "Decompose validated architecture into modules, features, vertical slices, behaviors, dependencies, and a supporting technical implementation sequence. Use for stage 5 before backlog planning; do not create delivery milestones, canonical epics, capacity plans, or product priorities. Requires the q-core-contract companion. Part of the Quasar AI delivery skills."
---

# Module and feature decomposition

Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Ownership boundary

Own:

- module map and authoritative responsibility;
- feature index and feature specifications;
- use cases, commands, queries, events, validation, authorization, and failure behavior;
- vertical slices and technical dependencies;
- approximate technical order.

For a feature with a user interface, own its surfaces and the behaviour of its states: loading, empty, error, success, read-only, permission-restricted, destructive actions, density, responsive behaviour, and content requirements. Describe what each state must do, not which component renders it.

Do not own milestones, delivery epics, product priority, capacity, dates, or delivery roadmap. Those belong to `q-plan-backlog`. Do not choose components, name design tokens, or define reusable visual or interaction language; route a pattern that recurs across features to `q-plan-design-system`.

## Outputs

Create under `docs/development-workflow/implementation/`:

- `05-module-map.md`;
- `05-feature-index.yaml`;
- feature or module specifications as needed;
- `05-technical-implementation-sequence.md`;
- optional C4 source as authored and supporting for visual model or representation, with any render derived and without semantic authority.

The technical sequence is supporting guidance for slicing and dependency order. Never name it or treat it as a delivery roadmap.

## Procedure

1. Load baselined architecture, application standards, the referenced technical foundation version, domain model, and product requirements.
2. Identify cohesive modules with one authoritative owner per responsibility.
3. Map requirements and domain behaviors to bounded features.
4. Specify happy paths, alternate paths, authorization, validation, persistence, events, failures, and test scope.
5. Prefer vertical slices over horizontal technical task lists.
6. Define dependencies and approximate technical order without assigning delivery priority.
7. Verify every in-scope requirement is assigned or has an explicit exception.
8. Return unresolved scope, boundary, or technology decisions to their owning stage; do not update the technical foundation directly.

When `approved-module-or-dependency-structure-benefits-from-a-diagram` and `q-tool-mermaid` is installed, delegate a representation of already approved modules, feature dependencies, or technical order. Keep the module map, feature index, and technical sequence authoritative. If the tool is absent, `continue-with-canonical-module-feature-and-sequence-artifacts`.

When `approved-container-scope-benefits-from-a-c4-component-view` and `q-tool-c4` is installed, supply the exact confirmed container, approved modules or components, responsibilities, relationships, feature refs, and forbidden inferences. A module is not automatically a C4 component: use a Component view only inside one confirmed container and only when the mapping adds value. Keep the module map and feature specifications authoritative. If the tool is absent, `continue-with-the-canonical-module-map-and-record-the-c4-capability-gap`.

## Gate

Complete when modules and features are sufficiently defined for backlog planning to create milestones and epics. No delivery milestone or canonical epic may be introduced here. When a downstream refinement or implementation marks the module map or a feature specification stale, reconcile here by creating a new version — never rewrite a `Baselined` version in place.

When the product has a durable visual interface, the recorded surfaces and states are also the input the conditional `q-plan-design-system` stage derives its inventory from. Record them; do not resolve them into a component catalogue.

Return a valid `stage_result`; standalone execution does not update global state.
