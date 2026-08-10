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

Do not own milestones, delivery epics, product priority, capacity, dates, or delivery roadmap. Those belong to `q-plan-backlog`.

## Outputs

Create under `docs/development-workflow/implementation/`:

- `05-module-map.md`;
- `05-feature-index.yaml`;
- feature or module specifications as needed;
- `05-technical-implementation-sequence.md`.

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

## Gate

Complete when modules and features are sufficiently defined for Stage 6 to create milestones and epics. No delivery milestone or canonical epic may be introduced here.

Return a valid `stage_result`; standalone execution does not update global state.
