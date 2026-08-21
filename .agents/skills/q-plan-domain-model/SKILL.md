---
name: q-plan-domain-model
description: "Create the canonical domain narrative and data dictionary plus supporting ERD sources from validated product and technical inputs. Use for stage 3 to define concepts, relationships, ownership, lifecycles, invariants, history, retention, and data authority before architecture. Requires the q-core-contract and q-tool-mermaid companions. Part of the Quasar AI delivery skills."
---

# Domain and data modeling

Read the `q-core-contract` companion for shared governance and `q-tool-mermaid` for diagram delegation. If either is missing, stop and install both with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-tool-mermaid`. Preserve the distinction between semantic authority and visual representation.

## Inputs

Require a mature product core and technical foundation. Load relevant decisions, requirements, terminology, external-system contracts, and existing schemas.

## Outputs and authority

Create under `docs/development-workflow/domain/`:

- `03-domain-model.md`: authored and canonical for domain semantics, invariants, ownership, and lifecycle;
- `03-data-dictionary.md`: authored and canonical for entities, attributes, definitions, and constraints;
- `03-erd.mmd`: authored and supporting; canonical only for the visual representation;
- `03-erd.svg` or another render when useful: derived with `semantic_authority: none`.

No critical relationship, invariant, or ownership rule may exist only in Mermaid.

## Optional database schema assistance

This stage owns the semantic data schema: domain meaning, identity, attributes, relationships, invariants, lifecycle, history, retention, deletion, and authority. Physical tables, collections, engine types, indexes, ORM declarations, and migration syntax remain advisory here.

When `existing-database-schema-or-material-confirmed-profile-needs-physical-persistence-assistance` and `q-tool-database-schema` is installed, delegate the smallest useful branch after a semantic draft exists:

- use `schema-review` for an observed relational schema;
- use `document-model-review` for an observed document model;
- use `physical-design` only when the technical foundation confirms the engine and a material persistence constraint warrants a feasibility projection.

Reconcile accepted feedback about identity, cardinality, ownership, invariants, lifecycle, history, retention, or deletion into the owned domain artifacts. Keep candidate tables, collections, types, indexes, and migrations transient and route durable physical choices to `q-plan-architecture`. If the tool is absent, `continue-with-persistence-neutral-domain-model-and-record-the-database-assistance-gap`. Absence never blocks an otherwise sufficient semantic model.

## Procedure

1. Establish ubiquitous language and stable concept IDs.
2. Model aggregates or authority boundaries without prematurely imposing storage tables.
3. Define relationships, cardinality, lifecycle, state transitions, invariants, history, retention, and deletion.
4. Identify systems of record, derived data, sensitive fields, and access constraints.
5. Reconcile the model with requirements and the referenced technical foundation. If persistence, consistency, retention, or scale evidence invalidates a technology choice, return the affected IDs to `q-plan-tech-foundation` rather than editing its artifact.
6. Use optional database schema assistance only under its exact trigger and reconcile semantic findings before approving the model.
7. Build a `diagram_request` from the approved model, dictionary, and exact source versions. Keep this skill as `owner_skill`; delegate Mermaid authoring, validation, and requested rendering to `q-tool-mermaid`.
8. Review the returned `.mmd` source against approved concepts, relationships, cardinalities, and invariants. Return syntax or layout defects to the tool and keep semantic corrections here.
9. Validate traceability and mark unresolved semantic decisions. Include the source and verified renders in the stage result with `q-tool-mermaid` as generator provenance.

## Gate

Complete when every critical concept has a definition and owner, important relationships and invariants are textual, data authority is explicit, and diagrams match the narrative. A physical schema is not an exit criterion. Block on contradictions that would invalidate architecture, not on unresolved index or DDL syntax. When a downstream refinement or implementation marks the domain model or dictionary stale, reconcile here by creating a new version — never rewrite a `Baselined` version in place.

Return a valid `stage_result`; standalone execution requires later orchestration reconciliation.
