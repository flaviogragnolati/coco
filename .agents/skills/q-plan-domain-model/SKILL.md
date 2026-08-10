---
name: q-plan-domain-model
description: "Create the canonical domain narrative and data dictionary plus supporting ERD sources from validated product and technical inputs. Use for stage 3 to define concepts, relationships, ownership, lifecycles, invariants, history, retention, and data authority before architecture. Requires the q-core-contract companion. Part of the Quasar AI delivery skills."
---

# Domain and data modeling

Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Preserve the distinction between semantic authority and visual representation.

## Inputs

Require a mature product core and technical foundation. Load relevant decisions, requirements, terminology, external-system contracts, and existing schemas.

## Outputs and authority

Create:

- `03-domain-model.md`: authored and canonical for domain semantics, invariants, ownership, and lifecycle;
- `03-data-dictionary.md`: authored and canonical for entities, attributes, definitions, and constraints;
- `03-erd.mmd`: authored and supporting; canonical only for the visual representation;
- `03-erd.svg` or another render when useful: derived with `semantic_authority: none`.

No critical relationship, invariant, or ownership rule may exist only in Mermaid.

## Procedure

1. Establish ubiquitous language and stable concept IDs.
2. Model aggregates or authority boundaries without prematurely imposing storage tables.
3. Define relationships, cardinality, lifecycle, state transitions, invariants, history, retention, and deletion.
4. Identify systems of record, derived data, sensitive fields, and access constraints.
5. Reconcile the model with requirements and the referenced technical foundation. If persistence, consistency, retention, or scale evidence invalidates a technology choice, return the affected IDs to `q-plan-tech-foundation` rather than editing its artifact.
6. Generate the Mermaid source from the documented model; render only after the source is valid.
7. Validate traceability and mark unresolved semantic decisions.

## Gate

Complete when every critical concept has a definition and owner, important relationships and invariants are textual, data authority is explicit, and diagrams match the narrative. Block on contradictions that would invalidate architecture.

Return a valid `stage_result`; standalone execution requires later orchestration reconciliation.
