---
name: q-plan-product-core
description: "Define the canonical product core from a product idea or a versioned proposal contract. Use for stage 1 of the AI coding workflow when product intent, actors, journeys, requirements, business rules, scope, exclusions, assumptions, or pending decisions need a validated baseline. Requires the q-core-contract companion. Part of the Quasar AI delivery skills."
---

# Product core definition

Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. In orchestrated mode, write only owned domain artifacts and return a delta; do not write global state or artifact index.

## Inputs

Accept either:

- a product idea plus available research and project context; or
- a versioned proposal contract and its referenced discovery evidence.

Preserve source IDs and versions. Separate confirmed facts, supported inferences, assumptions, and unresolved questions. Never turn a proposal assumption into a product confirmation.

## Canonical output

Create `docs/development-workflow/product/01-product-core.md` as an authored, canonical `Working` artifact for product intent and scope. Include:

- problem and desired outcome;
- actors and responsibilities;
- critical journeys and scenarios;
- essential functional requirements and business rules;
- scope, exclusions, constraints, and non-goals;
- acceptance signals;
- assumptions, pending decisions, risks, and source references;
- proposal traceability when applicable.

Use stable IDs for requirements, rules, decisions, risks, and assumptions.

## Procedure

1. Load authoritative sources and current registers.
2. Resolve contradictions by source authority and version; do not silently merge incompatible claims.
3. Draft the smallest product core sufficient for technical work.
4. Ask only blocking questions that sources cannot answer.
5. Validate coverage, internal consistency, source traceability, and explicit uncertainty.
6. Mark readiness for `q-plan-tech-foundation`.

A product started without a proposal is valid. Record `commercial_contract: not_applicable` rather than inventing one.

## Gate

Complete when product intent, primary actors, core journeys, in/out scope, business rules, and blocking uncertainty are explicit. Return `blocked` when a missing decision would make technical planning speculative.

Return a valid `stage_result`. In standalone mode include `global_state_updated: false` and `reconciliation_required: true`.
