---
name: q-plan-architecture
description: "Define canonical architecture, ADRs, and project application standards plus supporting diagrams from validated product, technical, and domain inputs. Use for stage 4 before module and feature decomposition. Requires the q-core-contract and q-tool-mermaid companions. Part of the Quasar AI delivery skills."
---

# High-level architecture and standards

Read the `q-core-contract` companion for shared governance and `q-tool-mermaid` for diagram delegation. If either is missing, stop and install both with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-tool-mermaid`. Load the exact confirmed technical foundation version. Return to its owner when an architecture-driving stack selection is unresolved or contradicted.

## Outputs and authority

Create under `docs/development-workflow/architecture/`:

- `04-architecture.md`: canonical architecture narrative;
- `04-application-standards.md`: canonical project-specific engineering rules;
- ADRs for durable decisions;
- C4 `.mmd`, `workspace.dsl`, or `.puml` sources when selected: authored and supporting for the visual model or representation;
- optional Structurizr `workspace.json` manual layout: authored and supporting only for visual layout;
- non-C4 deployment, data-flow, or sequence `.mmd` sources: authored and supporting for visual representation;
- visual renders: derived with no semantic authority.

ADRs and narrative text own architecture decisions. The technical foundation owns stack selection and adopted technology guidance. `04-application-standards.md` references applicable guidance IDs and adds only project-specific architecture and engineering rules. C4 and Mermaid sources support the selected visual model or representation only.

When the product has a user interface, `04-application-standards.md` may state where presentation boundaries lie and reference the exact design-system version that governs reusable design contracts. It must not restate tokens, component contracts, or accessibility requirements owned by `q-plan-design-system`. Standards sufficient for a minimal interface are also the signal that a separate design system is not yet warranted.

## Optional database schema assistance

When `confirmed-database-profile-needs-physical-design-or-migration-analysis` and `q-tool-database-schema` is installed, use `physical-design` for a candidate persistence mapping or `migration-design` for architecture-significant evolution. Supply the confirmed technical foundation version, approved domain artifacts, access patterns, NFRs, deployment constraints, and exact observed schema when one exists.

Treat the returned analysis as transient advice. Reconcile accepted ownership, consistency, distribution, operational, rollout, and physical-architecture decisions into this skill's narrative or ADRs; do not let the tool write them or create a parallel canonical persistence document. Return semantic contradictions to `q-plan-domain-model` and stack contradictions to `q-plan-tech-foundation`. If the tool is absent, `continue-with-evidence-bounded-architecture-and-record-the-database-analysis-gap`.

## Procedure

1. Load product, the referenced technical foundation version, domain model, decisions, risks, and existing repository constraints.
2. Define boundaries, components, responsibilities, interactions, and data ownership.
3. Cover security, failure behavior, observability, deployment, migration, and operational constraints.
4. Turn architecture-driving choices into ADRs.
5. Define standards that are specific enough for downstream implementation and review; reference adopted technology guidance IDs instead of copying them.
6. Select only architecture views that answer a named audience and question. Deployment is a supporting C4 view, not level 4; Code is the fourth static zoom level and should use an implementation notation only when it adds value.
7. When `approved-architecture-meaning-benefits-from-c4-views-or-a-synchronized-model` and `q-tool-c4` is installed, build one `c4_request` from exact narrative and ADR versions and delegate C4 abstraction consistency, backend selection, validation, and requested rendering. Keep this skill as `owner_skill`. If the tool is absent, `continue-with-canonical-architecture-and-existing-mermaid-diagram-routes`.
8. Build one `diagram_request` per approved non-C4 deployment, data-flow, sequence, state, or code-notation view and delegate Mermaid authoring, validation, and requested rendering to `q-tool-mermaid`.
9. Review every returned source for semantic fidelity before accepting it. Return syntax or layout defects to the applicable tool; resolve systems, containers, components, boundaries, protocols, ownership, deployment, and sequence meaning here.
10. Validate every requirement and domain boundary has a responsible architectural element.
11. Use optional database schema assistance only for the triggered physical or migration branch, then reconcile accepted architecture meaning here.
12. Record alternatives, trade-offs, pending decisions, downstream constraints, generator provenance, and any technical foundation guidance made stale by architecture evidence.

## Gate

Complete when the architecture can guide module ownership and implementation without hidden critical decisions and every applied technology rule resolves to the referenced technical foundation version. Return to product, technical, or domain stages when an upstream contradiction is found; never edit their owned artifacts directly. When a downstream refinement or implementation marks an owned artifact stale, reconcile here by creating a new version — never rewrite a `Baselined` version in place — and record the driving change as an ADR.

Return a valid `stage_result`; only the orchestrator reconciles state and index.
