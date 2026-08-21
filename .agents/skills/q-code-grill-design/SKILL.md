---
name: q-code-grill-design
description: "Run deep architectural alignment for a large or cross-cutting change that affects multiple modules, domain boundaries, major trade-offs, or ADRs. Use to create a durable feature architecture document before feature-level execution planning. Part of the Quasar AI delivery skills."
---

# Design grill

This is the deepest refinement level: `q-code-grill-design > q-code-grill-feature > q-code-grill-simple`. Read `GLOSSARY.md`; use `DESIGN-IT-TWICE.md` or `DEEPENING.md` only when the relevant decision needs them.

Read the `q-core-contract` companion for shared governance and its stage-result schema; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Boundary

Use this skill when work changes boundaries, domain concepts, major interfaces, operational architecture, security model, or rollout strategy across modules. De-escalate when the work is bounded.

Create a durable `Working` architecture document at `docs/development-workflow/architecture/features/<feature-slug>.md` plus necessary ADRs in the same ADR location `q-plan-architecture` uses under `docs/development-workflow/architecture/`, continuing that ADR numbering and naming this document as the ADR source. Do not create a low-level implementation plan or execution log.

## Precedence and return to planning

This document is canonical only for `feature-architecture`: the architecture of this change. It yields to the current planning versions it cites — architecture narrative and ADRs (`q-plan-architecture`), module map and feature specifications (`q-plan-features`), domain model and dictionary (`q-plan-domain-model`), technical foundation (`q-plan-tech-foundation`), and design system (`q-plan-design-system`).

When the accepted design contradicts or changes one of them, do not restate the new meaning as canonical here. Record the affected artifact ID and version and the proposed change in this document's decisions section, list that artifact under `stale_artifacts` in the returned delta, and let the orchestrator route reconciliation to the owning stage; the affected slice does not enter implementation until the owner's new version exists. In standalone use, report the same contradiction to the user as pending reconciliation.

## Procedure

1. Load current code, architecture, product context, the referenced technical foundation when available, the exact `design_system_ref` version when the change affects a user interface, decisions, and vocabulary.
2. Clarify intent, scenarios, scope, non-goals, constraints, and must-not-break behavior.
3. Resolve domain boundaries, ownership, interfaces, data, consistency, security, failures, operations, evolution, and rollout.
4. Compare viable alternatives against product requirements, NFRs, and adopted technology guidance; make trade-offs explicit.
5. Create ADRs only for durable decisions.
6. Define high-level stages and the next slice that should enter `q-code-grill-feature`, `q-code-grill-simple`, or `q-code-implementation-plan`.
7. Validate traceability, open questions, and consequences with the user. Route a newly required stack choice to `q-plan-tech-foundation` rather than deciding it here.

## Optional Mermaid collaboration

When `approved-feature-architecture-needs-a-structural-diagram` and `q-tool-mermaid` is installed, delegate only the approved nodes and relationships, then review the source for fidelity. The architecture document and ADRs remain authoritative. If the tool is absent, `continue-with-canonical-textual-design-and-record-the-visual-capability-gap`.

## Optional database schema collaboration

When `cross-cutting-change-has-material-physical-schema-or-migration-risk` and `q-tool-database-schema` is installed, delegate `physical-design` or `migration-design` with the confirmed database profile, approved domain and architecture sources, observed schema, workload, and rollout constraints. Resolve trade-offs and write accepted feature architecture here; keep the specialist result transient. If the tool is absent, `continue-with-owner-led-design-and-record-the-specialist-database-gap`.

## Durable output

Include status, sources, scope, current context, proposed architecture, data and contracts, security, operations, decisions and ADRs, alternatives, risks, assumptions, open questions, high-level rollout, and next skill.

The document may later be baselined or superseded. `q-code-implement` must not use it as a work diary.

## Stage result

Return a valid `stage_result`: the feature architecture document and each ADR in `authored_outputs` with type, path, `Working` lifecycle, and source IDs; every contradicted planning artifact under `stale_artifacts` exactly as the Precedence and return to planning section requires; risks in `risks_added_or_updated`; the next slice and its refinement depth as `next_recommended_action`. In standalone mode set `global_state_updated: false` and `reconciliation_required: true` and persist the result beside the architecture document as the contract's standalone-persistence rule requires; never write workflow state or the artifact index.
