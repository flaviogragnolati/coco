---
name: q-plan-architecture
description: "Define canonical architecture, ADRs, and project application standards plus supporting diagrams from validated product, technical, and domain inputs. Use for stage 4 before module and feature decomposition. Requires the q-core-contract companion. Part of the Quasar AI delivery skills."
---

# High-level architecture and standards

Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Load the exact confirmed technical foundation version. Return to its owner when an architecture-driving stack selection is unresolved or contradicted.

## Outputs and authority

Create under `docs/development-workflow/architecture/`:

- `04-architecture.md`: canonical architecture narrative;
- `04-application-standards.md`: canonical project-specific engineering rules;
- ADRs for durable decisions;
- context, container, deployment, or sequence `.mmd` sources: authored and supporting;
- visual renders: derived with no semantic authority.

ADRs and narrative text own architecture decisions. The technical foundation owns stack selection and adopted technology guidance. `04-application-standards.md` references applicable guidance IDs and adds only project-specific architecture and engineering rules. Mermaid owns only the visual representation.

## Procedure

1. Load product, the referenced technical foundation version, domain model, decisions, risks, and existing repository constraints.
2. Define boundaries, components, responsibilities, interactions, and data ownership.
3. Cover security, failure behavior, observability, deployment, migration, and operational constraints.
4. Turn architecture-driving choices into ADRs.
5. Define standards that are specific enough for downstream implementation and review; reference adopted technology guidance IDs instead of copying them.
6. Generate diagrams that reflect, but do not replace, the narrative.
7. Validate every requirement and domain boundary has a responsible architectural element.
8. Record alternatives, trade-offs, pending decisions, downstream constraints, and any technical foundation guidance made stale by architecture evidence.

## Gate

Complete when the architecture can guide module ownership and implementation without hidden critical decisions and every applied technology rule resolves to the referenced technical foundation version. Return to product, technical, or domain stages when an upstream contradiction is found; never edit their owned artifacts directly.

Return a valid `stage_result`; only the orchestrator reconciles state and index.
