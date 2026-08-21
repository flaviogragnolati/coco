# Consulting profile

Use for advisory, assessment, organizational, and strategic engagements where the object is a client decision rather than a product. Start from a concrete decision; a session that starts from a framework produces generic output.

## Decision context

```yaml
decision_context:
  decision_ref: DEC-...
  owner_ref: ROLE-...
  decision_statement: "What the client must actually decide, by when."
  time_horizon: "..."
  controllable_levers: []
  non_controllable_factors: []
```

Separate what the client controls from what it can only anticipate. A candidate that depends entirely on non-controllable factors is a scenario, not an intervention.

## Candidate kinds

```yaml
candidate.kind:
  - problem-frame
  - diagnostic-hypothesis
  - causal-hypothesis
  - strategic-option
  - intervention-option
  - workstream-option
  - governance-option
  - operating-model-option
  - scenario
  - measurement-option
  - stakeholder-action
  - evidence-request
```

Keep diagnosis separate from intervention: a cause and a remedy are different candidates with different evidence needs. Record a diagnostic or causal hypothesis with the observation it explains and the observation that would refute it.

## Assumption categories

Use the shared organizational set: `client-problem`, `causal-mechanism`, `capability`, `capacity`, `data-availability`, `stakeholder-acceptance`, `governance`, `incentives`, `operations`, `cost`, `timing`, `dependency`, `legal`, `privacy`, `security`.

## Criteria to choose from

Select three to seven:

- decision relevance;
- explanatory power;
- client controllability;
- expected value;
- time to impact;
- time-to-learning;
- evidence required;
- implementation complexity;
- organizational capability;
- stakeholder acceptance;
- reversibility;
- external dependency;
- second-order effects;
- resilience across scenarios.

## Scenarios and stress-testing

Treat foresight as exploration of plausible futures, not prediction of one future. For a strategic session:

1. Name the driving uncertainties and which are controllable.
2. Build two to four contrasting, internally coherent scenarios.
3. Test each candidate option against every scenario and record where it fails.
4. Separate robust options, contingent options, and bets.
5. Convert the result into named triggers, owners, and review points rather than a single recommended future.

Challenge assumptions explicitly: for the favored option, state what must be true about the client, the market, the organization, and the timeline, then rank those beliefs by evidence.

## Boundaries

- The session owns alternatives and their disposition, never the engagement itself. It is not diagnosis, validation, implementation, or follow-up.
- Proposal Design owns scope, methodology, deliverables, price, schedule, and commitments; hand it engagement and workstream options only.
- Consulting execution owns diagnosis, intervention design, deliverables, and acceptance; hand `q-consult-current-state` hypotheses to validate and `q-consult-intervention` options to evaluate, never findings or designs.
- Reporting consumes the exact approved snapshot; candidates never enter a report as facts.
- Client-confidential material follows the information-governance classification recorded in the session; abstract or stop rather than exporting it.
