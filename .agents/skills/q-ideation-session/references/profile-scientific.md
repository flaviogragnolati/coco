# Scientific profile

Use for research-direction ideation. Treat every output as a proposal, never a finding. Ideation cannot validate a hypothesis, establish novelty, or approve anything.

Keep these activities separate:

- **Ideation** creates questions, mechanisms, alternatives, and study concepts.
- **Evidence assessment** checks what reliable literature and data support; this session routes it out instead of performing it.
- **Hypothesis validation** requires observations, designs, analyses, and independent scrutiny.
- **Ethics, biosafety, dual-use, regulatory, and institutional review** require the authorized reviewers. A session is never approval.
- **Clinical advice** requires qualified clinicians and patient-specific context. Do not turn a research candidate into diagnosis or treatment guidance.

## Candidate kinds

```yaml
candidate.kind:
  - research-question
  - mechanism-hypothesis
  - causal-hypothesis
  - prediction
  - study-concept
  - measurement-option
  - analysis-option
```

For each testable candidate record `expected_signals` and the `disconfirming_signals` that would count against it. A candidate that predicts every outcome is not discriminating.

## Assumption categories

`causal`, `mechanistic`, `measurement`, `sampling`, `statistical`, `operational`, `feasibility`, `ethical`, `value`.

## Criteria to choose from

Information gain, ability to discriminate between mechanisms, relevance to the scoped question, originality relative to a documented search boundary, methodological rigor, vulnerability to bias, feasibility and resources, reversibility, cost and time, equity, and the value of a null or contradictory result.

Do not claim originality from an absent search. Without a documented evidence boundary, rate originality `not-assessable` and emit an evidence request.

## Scientific gates

Beyond the shared gates in [evaluation and gates](evaluation-and-gates.md), review each advancing candidate for:

- human subjects, identifiable or sensitive data, vulnerable groups, or clinical care;
- animals;
- pathogens, toxins, engineered biological systems, or environmental release;
- dual-use capability, hazardous optimization, or security-sensitive operational detail;
- controlled technologies, export restrictions, and research-security duties;
- Indigenous, community, cultural, or data-sovereignty obligations;
- unpublished, proprietary, or embargoed material.

Record each as `not-assessed`, `not-applicable`, `passed`, `review-required`, `redesign-required`, or `failed` with the owner who can decide it. Only an authorized body issues approval, and no score overrides a gate. When a request seeks patient-specific care, evasion of oversight, harmful optimization, or operationally enabling dual-use detail, stop the session and route it to the appropriate professional or institutional process.

## Methodological review

For a shortlisted study concept, ask a methods reviewer to check the question and unit of inference, the proposed comparison, discriminating predictions and plausible alternatives, sampling frame and controls, measurement validity, nuisance variables and analytic flexibility, information or sample-size requirements, feasibility and dependencies, and the interpretability of a null result. This is a gate toward protocol development, not permission to collect data.

## Handoff

Route a `research-question` or evidence need to the Quasar research owners described in [handoffs](handoffs.md); route formal hypothesis development, study design, power analysis, and analysis planning to the specialist skills or people who own them. This session hands over candidates, assumptions, and open questions — never a validated hypothesis or a protocol.
