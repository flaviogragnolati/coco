---
name: q-code-grill-design
description: "Run deep architectural alignment for a large or cross-cutting change that affects multiple modules, domain boundaries, major trade-offs, or ADRs. Use to create a durable feature architecture document before feature-level execution planning. Part of the Quasar AI delivery skills."
---

# Design grill

This is the deepest refinement level: `q-code-grill-design > q-code-grill-feature > q-code-grill-simple`. Read `GLOSSARY.md`; use `DESIGN-IT-TWICE.md` or `DEEPENING.md` only when the relevant decision needs them.

## Boundary

Use this skill when work changes boundaries, domain concepts, major interfaces, operational architecture, security model, or rollout strategy across modules. De-escalate when the work is bounded.

Create a durable `Working` architecture document under `docs/architecture/features/` plus necessary ADRs. Do not create a low-level implementation plan or execution log.

## Procedure

1. Load current code, architecture, product context, the referenced technical foundation when available, decisions, and vocabulary.
2. Clarify intent, scenarios, scope, non-goals, constraints, and must-not-break behavior.
3. Resolve domain boundaries, ownership, interfaces, data, consistency, security, failures, operations, evolution, and rollout.
4. Compare viable alternatives against product requirements, NFRs, and adopted technology guidance; make trade-offs explicit.
5. Create ADRs only for durable decisions.
6. Define high-level stages and the next slice that should enter `q-code-grill-feature`, `q-code-grill-simple`, or `q-code-implementation-plan`.
7. Validate traceability, open questions, and consequences with the user. Route a newly required stack choice to `q-plan-tech-foundation` rather than deciding it here.

## Durable output

Include status, sources, scope, current context, proposed architecture, data and contracts, security, operations, decisions and ADRs, alternatives, risks, assumptions, open questions, high-level rollout, and next skill.

The document may later be baselined or superseded. `q-code-implement` must not use it as a work diary.
