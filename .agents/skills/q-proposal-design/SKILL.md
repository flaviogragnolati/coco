---
name: q-proposal-design
description: "Create the canonical, versioned, and traceable Quasar commercial proposal source from a mature Discovery Brief. Use to define engagement model, solution, scope, exclusions, methodology, deliverables, schedule, investment, payments, responsibilities, assumptions, terms, acceptance, and applicable development handoff. Requires the q-core-contract companion."
---

# Commercial proposal design

Read the `q-core-contract` companion for shared governance and `references/02-proposal-source.schema.yaml`; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Ownership

Own the commercial meaning of:

- engagement model;
- proposed solution and alternatives;
- scope, exclusions, and change boundaries;
- methodology, governance, work plan, and deliverables;
- acceptance and quality criteria;
- team and responsibilities;
- schedule, dependencies, investment, payments, validity, and terms;
- assumptions, risks, decisions, and unresolved matters;
- preliminary development interface only when software applies.

Support software, consulting, assessment, training, managed service, mixed, and other explicit models. Do not force non-software work into a development contract.

## Canonical outputs

Create under `docs/proposal-workflow/working/proposal/`:

- `02-proposal-source.yaml`: authored and canonical for commercial meaning;
- a human-readable proposal view derived from the source;
- stable traceability from discovery IDs to proposal objects.

Treat web, DOCX, PDF, and decks as channels or derivatives. They cannot introduce new commitments.

An adopted ideation snapshot supplies candidate solution, engagement, and workstream options with their unresolved assumptions and dissent. Evaluate them here against discovery evidence; an advanced candidate is never scope, methodology, price, schedule, or a commitment until this stage decides it.

## Procedure

1. Verify discovery readiness and source versions.
2. Select and state the engagement model.
3. Define objectives, solution, scope, exclusions, methodology, governance, stages, deliverables, and acceptance.
4. Define schedule and investment without hiding dependencies or assumptions.
5. State client and Quasar responsibilities.
6. Identify legal or commercial review needs.
7. Define the software handoff only when applicable; otherwise mark development `not_applicable`.
8. Validate financial, schedule, scope, and traceability coherence.
9. Obtain internal approval before marking a client-ready release.

When `client-facing-prose-is-drafted-and-the-user-requests-a-clarity-or-ai-pattern-pass-before-the-gate` and `q-tool-humanizer` is installed, pass the exact prose sections, their language, and a meaning lock — every claim, number, name, price, date, citation, and commitment that must not change — for `detect` and, if requested, `rewrite` or `improve`; adopt a revision into this owned artifact only after checking the lock, and keep the pass out of any derived render. If it is absent, `keep-the-prose-as-authored-and-record-that-no-humanization-pass-ran`.

## Error routing

A semantic error in scope, price, schedule, commitment, engagement model, or source returns here and requires derivative regeneration. A visual or channel-only error remains with the channel skill.

## Client disposition

The orchestrator records acceptance with development, acceptance without development, negotiation/revision, rejection, or expiry. Acceptance is not inferred from internal approval.

Return a valid `stage_result`; standalone execution does not update global state or artifact index.
