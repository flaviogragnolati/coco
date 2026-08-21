# Evaluation and gates

Evaluation narrows a candidate set; it never converts a candidate into evidence or a decision. Keep compensatory criteria in the matrix and non-negotiable conditions outside it.

## Define criteria before any score is visible

For every criterion record: name and decision relevance, direction (`higher` or `lower`), observable anchors for minimum and maximum, weight and who set it, the evidence a rating requires, how uncertainty is expressed, and overlap with other criteria.

Select three to seven. Avoid:

- "impact" or "quality" without anchors;
- correlated criteria counted twice;
- missing information silently scored as zero;
- weights changed after seeing which candidate wins;
- a veto averaged away inside a score.

## Rate independently

1. Calibrate raters on two neutral examples that are not session candidates.
2. Collect scores independently, each with a reason or source.
3. Allow abstention and `not-assessable` instead of forced precision.
4. Collect low/base/high when uncertainty is material.
5. Reveal distributions and reasons before discussion.
6. Discuss disagreement, then retain both original and revised ratings.
7. Resolve factual errors separately from preference differences.

Do not report rater agreement as evidence that a candidate is correct; agreement can reflect shared information or shared bias.

## Weighted additive matrix

`scripts/evaluate_matrix.py` implements one fully disclosed model. For criterion *j*, raw score *x*, bounds *L* and *U*, and positive weight *w*:

- higher is better: `n = (x - L) / (U - L)`
- lower is better: `n = (U - x) / (U - L)`
- normalized weight: `p = w / Σw`
- displayed score: `100 × Σ(p × n)`

The model is compensatory: a strong criterion can offset a weak one. That is exactly why gates stay outside it.

Criteria configuration:

```json
{
  "schema_version": "1.0",
  "criteria": [
    {"name": "time_to_learning", "description": "Time until the riskiest assumption is tested", "weight": 3, "direction": "lower", "minimum": 1, "maximum": 5},
    {"name": "user_value", "description": "Value to the affected user or client", "weight": 2, "direction": "higher", "minimum": 1, "maximum": 5}
  ]
}
```

Scores CSV: required columns are `candidate_id`, every configured criterion, `qualitative_review`, and `uncertainties`. Optional `<criterion>_low` and `<criterion>_high` columns must appear as pairs with `low <= score <= high`. Any column named `gate_*` is preserved as a visible gate column and is never scored. Every other extra column is preserved as qualitative context.

The output carries raw and normalized scores, supplied and normalized weights, a base score, a deterministic presentation rank, the interval implied by input ranges, the score and rank range under one-at-a-time weight perturbation, gate columns, the formula, the tie rule, `decision: null`, and its limitations.

## Read sensitivity honestly

Treat a ranking as fragile when rank changes under small plausible weight changes, score intervals overlap materially, one criterion dominates, a reasonable alternative criterion definition reorders the set, missing evidence drives optimistic ratings, or qualitative review conflicts with the numeric order.

Do not repair fragility by choosing weights that stabilize a preferred result. Use it to expose value judgments, missing information, and candidates that need a direct comparison.

Sensitivity here is local and one-factor-at-a-time. It does not explore the full weight space, criterion dependence, scale uncertainty, or model-form uncertainty.

## Gates

Gates are non-compensatory. A candidate that fails a gate cannot advance regardless of its score. Apply the shared families in every profile:

| Gate family | Ask |
|---|---|
| Safety | Can this harm people, systems, or the environment? |
| Privacy and data | Does it require personal, sensitive, or restricted data the project may not use? |
| Legal and regulatory | Does it need an authorization, license, or regime the client does not hold? |
| Ethics and equity | Who is disadvantaged, excluded, or exposed if this succeeds? |
| Commercial authority | Would it commit scope, price, schedule, or a contractual obligation nobody here owns? |
| Confidentiality | Does it require exposing client, partner, or third-party material? |
| Minimum capability | Does the team or client lack a capability the option assumes? |
| Non-negotiable incompatibility | Does it contradict an accepted decision, architecture, or constraint? |

Add the profile-specific gates from the active profile reference. Record every gate as `not-assessed`, `not-applicable`, `passed`, `review-required`, `redesign-required`, or `failed`, with the owner who can decide it and a note. `review-required` blocks `advance` until its owner answers.

## Adversarial review

For each finalist, use a reviewer who did not originate it:

```text
Candidate:
Reviewer (not an originator):
Strongest version of the candidate:
Condition or observation that would refute it:
At least two alternative explanations:
Failure modes in measurement, execution, adoption, or operations:
Who is harmed, excluded, or overloaded:
Prior evidence that challenges it:
Mitigation:
Residual uncertainty:
Reversibility:
Disposition: retain / revise / pause / stop / external review
```

Review the strongest version before attacking it. Performative devil's advocacy without a response, an owner, and a status is not review.

## Decision log

Record while alternatives are still visible: date, owner, scope, candidate IDs and versions, criteria, anchors, weights, sensitivity settings, raw ratings, ranges, dissent, abstentions, evidence-check status, adversarial results, gate results, the chosen next action, rejected or deferred alternatives with reasons, and the revisit trigger. Append corrections; never rewrite the log after outcomes are known.
