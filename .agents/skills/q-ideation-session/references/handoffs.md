# Handoffs

This session generates options and questions. Other owners produce evidence, decisions, and commitments. The `q-core-contract` companion owns the adoption dispositions, snapshot eligibility, and lifecycle transition; this reference covers what to emit and where to send it.

## Evidence requests

Never browse, cite, or change the candidate pool from unauthorized research. Convert each material unknown into one request:

```yaml
evidence_requests:
  - request_id: ERQ-001
    candidate_refs: [CAND-003]
    uncertainty: "The segment's willingness to pay is unknown."
    decision_impact: "Invalidates the business-model option if low."
    recommended_route: q-research-scope
    status: open
```

| Uncertainty | Route |
|---|---|
| Market, competitor, regulatory, adoption, or feasibility evidence outside the project | `q-research-scope` (through `q-research-workflow` when the caller can delegate) |
| Technology behavior, compatibility, API, specification, or version question | `q-code-research` |
| Practical feasibility that only a throwaway build can settle | `q-code-prototype` |
| Client facts, budget, deadline, stakeholders, or confirmed context | `q-proposal-discovery` |
| Existing project truth already recorded somewhere | `q-ask-project` |
| Current-state, process, role, or control evidence inside the client organization during an engagement | `q-consult-current-state`; before an engagement is accepted, `q-proposal-discovery` |
| Customer interviews, data pulls, regulatory review, or stakeholder consultation | The named human owner, recorded as a required user action |

One request names one uncertainty and one route. A request without a decision impact is noise; drop it or merge it.

## Reopening after evidence

Run `intent: reopen-after-evidence` only with the returned artifact ID and exact version. Then:

1. Record the returned artifact in `evidence_links` with its relation to the request.
2. Update the affected candidates' `evidence_status` and the affected assumptions' status — never their original statements.
3. Generate a new round recorded as `post-check`, keeping the original pool intact.
4. Produce a new snapshot version. The adopting orchestrator marks the previously adopted version `Superseded`; when nothing adopted the earlier version, there is nothing to supersede.

## Snapshot handoff

Package for the receiving owner: the snapshot artifact ID and version, the frozen register version, the selected candidate refs, the intended use, unresolved assumptions and gates, retained dissent, and the session limitations. Recommend one owner per advancing candidate; recommend nothing for `retain`, `defer`, or `stop`.

| Receiving owner | May adopt | Must not receive as settled |
|---|---|---|
| `q-proposal-discovery` | Problem frames, questions, assumptions, interpretation risks | Client facts, budget, deadline, confirmed scope |
| `q-proposal-design` | Solution, engagement, and workstream options | Scope, price, schedule, commitments |
| `q-consult-engagement-plan` | Stakeholder actions and cadence options | Confirmed stakeholders, commitments, the deliverable register |
| `q-consult-current-state` | Diagnostic and causal hypotheses to validate, evidence requests about the client's own processes | A validated diagnosis, a client fact, an assessed finding |
| `q-consult-intervention` | Intervention, governance, operating-model, and measurement options with their assumptions | An accepted target state, a deliverable, a commitment |
| `q-research-scope` | Evidence requests and candidate questions | Authorized questions, budget, search strategies |
| `q-plan-product-core` | A selected option, outcome hypothesis, assumptions | Requirements, business rules, actors, canonical scope |
| `q-plan-tech-foundation` | Technology alternatives and trade-offs | Stack selection |
| `q-plan-architecture` | Architecture alternatives | ADRs or accepted architecture |
| `q-code-prototype` | Feasibility hypotheses | Production code or technical confirmation |
| `q-report-source` | The exact approved snapshot, dispositions, recommendations | Candidates presented as facts |

The receiving skill applies its own procedure, evidence rules, and approvals. A recommended route is a suggestion, not authorization to start that work.

## What this session never produces

A requirement, a business rule, an ADR, an authorized research question, a client fact, a stack selection, a price, a schedule, a commitment, a validated hypothesis, an approval, or a change to `00-workflow-state.yaml` or `00-artifact-index.yaml`.
