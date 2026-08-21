# Product profile

Use for product, service, and go-to-market ideation. Keep the chain explicit and never collapse it into one flat list:

```text
outcome → opportunity → solution → assumption → test
```

Solution generation may be broad. Opportunity generation must be restrictive: an opportunity invented inside the team is a hypothesis, not a discovered need.

## Candidate kinds

```yaml
candidate.kind:
  - problem-frame
  - opportunity-hypothesis
  - solution-concept
  - service-concept
  - business-model-option
  - experiment-concept
  - metric-option
  - rollout-option
```

Every `opportunity-hypothesis` carries:

```yaml
opportunity_evidence:
  status: evidenced | assumed | contradicted | unknown
  source_refs: []
```

Use `evidenced` only with a source ref to customer evidence that already exists in an approved artifact. Absent that, use `assumed` and emit an evidence request. Never present an assumed opportunity as a confirmed user need, and never let this session replace `q-proposal-discovery` or the product owner's customer evidence.

## Assumption categories

```yaml
assumption.category:
  - customer-problem
  - desirability
  - usability
  - value
  - adoption
  - channel
  - viability
  - pricing
  - feasibility
  - operations
  - data
  - privacy
  - security
  - legal
```

Rank assumptions by the damage of being wrong times the cost of finding out. Convert the riskiest into a testable statement with a metric, a decision threshold, and the action each result triggers. An untested riskiest assumption is a reason to route a test, not a reason to advance a solution.

## Criteria to choose from

Select three to seven; do not enable all of them:

- outcome alignment;
- opportunity evidence;
- user value;
- business value;
- reach;
- frequency;
- time-to-learning;
- reversibility;
- viability;
- feasibility;
- adoption;
- operational load;
- differentiation;
- defensibility-compounding;
- risk;
- strategic compatibility.

Do not import scientific originality as "product innovation". Prefer differentiation, evidence of opportunity, and expected value, each with anchors. Keep the overlapping ones distinct: `reach` counts who is affected, `frequency` how often they meet the value, and `defensibility-compounding` whether an advantage accumulates through data, network, or habit instead of restating `differentiation`.

## Session shapes

| Intent | Run |
|---|---|
| `frame-problem` | Outcome statement, candidate problem frames, affected segments, and the evidence each frame would need. Produce no solutions. |
| `generate-options` | One selected opportunity, then divergent solution concepts, assumptions per concept, and candidate experiments. For an improvement sweep over an existing product, service, or area, load [opportunity discovery](opportunity-discovery.md) and run its sweep instead of starting from one selected opportunity. |
| `stress-test-options` | Premortem, adoption and operations failure modes, and the smallest test that would falsify the favored concept. |
| `reopen-after-evidence` | Adopt the exact returned artifact version, mark affected candidates and assumptions, and generate a `post-check` round without overwriting the original pool. |

## Boundaries

- Product Core owns product intent, actors, journeys, requirements, business rules, and scope. This session hands it a selected option, an outcome hypothesis, and assumptions — never requirements.
- Proposal Design owns commercial scope, price, schedule, and commitments.
- Architecture and technical foundation own technology selection.
- A metric option is a candidate measurement, not an accepted KPI.
