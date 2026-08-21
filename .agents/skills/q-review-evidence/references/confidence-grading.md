# Confidence grading

Use these anchors to test whether a conclusion is proportional to its evidence. Recommend a confidence impact; never overwrite the caller's confidence field or convert this qualitative rubric into an unsupported numeric score.

## Inspect the factors

| Factor | Stronger signal | Weaker signal |
|---|---|---|
| Claim fit | Evidence directly measures or tests the exact claim in the relevant context. | Evidence is contextual, proxy-based, or extrapolated across population, version, environment, or time. |
| Method integrity | Sampling, measurement, comparison, and analysis are visible and fit the question. | Key methods are missing, selectively reported, or unable to answer the claim. |
| Independence | Material support comes from genuinely independent producers, datasets, or replications. | Several sources repeat one owner, dataset, press release, benchmark, or model output. |
| Currency and applicability | Dates, versions, conditions, and operating context match the decision. | Evidence is stale or mismatched to the decision context. |
| Consistency | Converging results survive credible contradictions and alternative explanations. | Contradictions are unresolved, excluded, or averaged away. |
| Precision and reproducibility | Uncertainty is visible; the result is stable enough to reproduce or audit. | Uncertainty, run variance, sample adequacy, or reproducibility is unknown or fragile. |
| Coverage | The authorized boundary tested the material alternatives and adverse evidence it promised to test. | Coverage is partial, access-blocked, convenience-selected, or silent about what was not inspected. |

Do not treat source class as a universal ranking. Authority is claim-specific: a vendor can be authoritative for its documented configuration yet non-independent for a comparative performance claim. Source count never substitutes for independence or claim fit.

## Anchor the recommendation

- **High confidence support:** direct and applicable evidence with visible methods, meaningful independence or reproducibility, material contradictions addressed, adequate precision, and honest coverage. One unresolved fatal validity threat prevents this anchor.
- **Medium confidence support:** relevant support exists, but indirectness, dependence, partial coverage, uncertainty, or a plausible alternative requires a qualified conclusion.
- **Low confidence support:** support is materially indirect, dependent, imprecise, contradicted, methodologically fragile, stale, or access-limited; retain only a tentative claim or decision hypothesis.
- **Insufficient evidence:** no inspectable claim-evidence relation can sustain the requested assessment. Absence of public evidence is not proof that the claim is false.

These anchors are inspired by evidence-grading factors, not a formal GRADE result. Apply formal GRADE only through the directly disclosed `scientific-evidence.md` branch when the target and question make it appropriate.

## Test proportionality

For each material conclusion:

1. State the strongest formulation the inspected evidence supports.
2. Compare it with the target's actual formulation.
3. Name the factor that creates any gap and whether it changes confidence, scope, causality, or decision use.
4. State what observable evidence could move the recommendation up or down.

Complete this check when every confidence recommendation cites its active factors, no count or universal hierarchy determines the result, and the caller retains the final decision.
