---
name: q-research-workflow
description: "Orchestrate optional Quasar engagement research from an approved general or market brief and budget through cited investigation, conditional market analysis, synthesis, and an exact approved baseline. Use for market, competitor, regulatory, technology, feasibility, or risk uncertainty that informs a client or project decision without automatically opening a proposal. Requires the q-core-contract companion."
---

# Engagement research workflow

Coordinate a bounded research run and preserve uncertainty. Delegate scope, investigation, and synthesis to their owners; do not perform their domain work here.

Read the `q-core-contract` companion for shared governance, its `references/routing.md` for workflow routes, and `references/research-baseline.schema.yaml` before creating a baseline. If the companion is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Entry and orchestration

Choose the execution branch before any state write:

- **Direct root:** act as the research root orchestrator and sole writer of workflow state and the artifact index; this run's artifacts, `00-workflow-state.yaml`, and `00-artifact-index.yaml` live under `docs/research-workflow/`.
- **Delegated:** inherit `root_orchestrator`, `global_state_writer`, and `return_to`, and write under the caller's artifact root in `research/`. Return one composite delta with `global_state_updated: false`; do not replace the caller's active state.

Research is optional consulting or engagement work. It reduces external uncertainty for an identified decision; it does not claim scientific validity, replace client evidence, create commercial commitments, or force a proposal route.

## Stages

1. Route question and boundary work to `q-research-scope`.
2. Route approved search strategies to `q-research-investigate`.
3. Route exact brief and findings versions to `q-research-market-analysis` only when `research_profile: market` has at least one `analysis_module`, or when that stage is the explicit target with valid refs and a measurement contract. Otherwise preserve the general route without it.
4. Route exact brief, findings, and any market-analysis versions to `q-research-synthesize`.

Validate every `stage_result` and reconcile its artifact IDs, versions, blockers, risks, and stale references. Keep stage procedure with its owner.

## Gates

- **Scope:** require an authorized Research Brief with question IDs, decision references, limits, search strategies, privacy boundary, time or cost budget, and approval evidence before investigation.
- **Evidence:** require every supported claim to resolve to source evidence with a locator. Preserve source-verification, finding, and coverage states separately.
- **Market analysis:** require registered findings only, normalized measurement, resolvable calculation lineage, approved material assumptions/scenarios/results, explicit reconciliation, and promotion into `published_results`. Reject primary fieldwork, network reads, raw survey-response processing, or JSON/CSV-only report values.
- **Synthesis:** require answers or explicit gaps for every question, visible contradictions, stable finding references, and a counter-evidence check. Reject a synthesis that rebuilds the findings register.
- **Baseline:** obtain approval for the exact brief, findings, optional analysis, and synthesis artifact IDs and versions plus `as_of`. Create a `Baselined` Research Baseline only after that approval; do not declare `report-ready`.

Before baselining, verify that supported claims have evidence and locators, adverse evidence and circular dependencies remain visible, approved scope and privacy limits were respected, every question has an answer or gap, Market Analysis inputs and published results resolve when present, and synthesis points to findings/results instead of copying them.

Any changed brief, finding, assumption, calculation, scenario, or published result makes dependent synthesis, baseline, and report sources stale. Route correction to the owning stage and never rewrite an accepted snapshot in place.

## Progress dashboard

At each stage boundary report only the metrics needed to decide the next action: question coverage, supported or contradicted findings, unresolved gaps, budget or access status, and current artifacts. Always include a `Flagged:` line, using `none` when nothing needs attention, followed by one next action.

## Exit routing

For a delegated run, return the exact baseline and request one caller disposition:

- `adopt-as-proposal-input` — the proposal root may ask `q-proposal-discovery` to register that baseline version as `external-research`;
- `adopt-as-engagement-input` — the consulting root may ask `q-consult-current-state` or `q-consult-intervention` to register that baseline version as `external-research` evidence;
- `adopt-as-planning-input` — the delivery root may ask `q-plan-product-core` or `q-plan-tech-foundation` to register that baseline version as `external-research`;
- `retain-as-independent` — preserve the research artifacts without using them in the active proposal;
- `defer-decision` — keep the disposition open and block only the commitment that depends on it.

For a direct root run, present `discovery-proposal`, `reporting`, and `close` as optional next routes. Start none of them without an explicit user choice.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Doing stage work in the orchestrator | The coordinator searches sources or authors cross-finding conclusions to save a delegation. | Route the work to its registered stage and validate the returned delta. |
| 2 | Advancing without an approved boundary | Investigation begins from a plausible question before questions, limits, and budget are confirmed. | Stop at the scope gate until the Research Brief is authorized. |
| 3 | Treating a partial run as complete coverage | A budget or access limit is hidden behind a confident baseline. | Preserve the coverage state and approve only the exact, qualified snapshot. |
| 4 | Auto-opening the next workflow | A completed baseline silently starts Proposal or Reporting. | Present optional routes and wait for the user's explicit choice. |

## Completion

Finish when the exact approved baseline is registered by the root writer, or when a truthful partial or blocked result identifies its gaps and recovery action. Report artifact versions, approvals, coverage, `Flagged:`, orchestration ownership, optional routes, and one next action.
