---
name: q-proposal-discovery
description: "Transform client notes, transcripts, emails, and documents into a traceable Discovery Brief with problem, context, preliminary scope, constraints, engagement possibilities, assumptions, risks, pending matters, follow-up questions, and proposal readiness. Use as stage 1 of the proposal workflow. Requires the q-core-contract companion. Part of the Quasar AI delivery skills."
---

# Proposal discovery

Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Inputs and evidence

Accept raw meeting evidence and existing project records. Preserve source references, dates, participants, and document versions. Separate:

- confirmed client statements;
- supported inferences;
- working assumptions;
- unresolved questions;
- contradictions.

Never fabricate a decision, budget, deadline, acceptance criterion, or technical confirmation.

## Canonical output

Create a versioned Discovery Brief as an authored, canonical `Working` artifact for discovered client context. Include stable IDs for:

- client problem and desired outcomes;
- stakeholders, users, and decision makers;
- current situation and pain points;
- preliminary scope, exclusions, and constraints;
- candidate engagement model;
- known deliverables and success signals;
- budget or schedule information only when evidenced;
- assumptions, decisions, risks, contradictions, and open questions;
- source traceability;
- proposal readiness and rationale.

Create a concise follow-up question set only for gaps that materially affect proposal commitments.

## Procedure

1. Normalize evidence without erasing disagreement.
2. Identify the client's real decision and the value sought.
3. Classify possible delivery as software, consulting, assessment, training, managed service, mixed, or unresolved.
4. Map preliminary scope and constraints.
5. Record uncertainty with owner and impact.
6. Evaluate readiness.
7. Validate traceability and internal consistency.

## Readiness gate

Return `completed` when a responsible commercial proposal can be drafted with explicit assumptions. Return `blocked` when missing information would make solution, scope, price, schedule, or responsibilities misleading.

Return a valid `stage_result`; standalone execution requires orchestration reconciliation.
