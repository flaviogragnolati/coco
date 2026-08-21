# Bias taxonomy

Use this taxonomy to locate observable distortion risks. Report a bias only when the target contains a signal that could affect the claim; do not infer motive or misconduct.

## Selection and visibility

| Risk | Observable signals | Check or correction |
|---|---|---|
| Selection or convenience | Included cases, users, runs, periods, or sources differ systematically from the target population. | Expose inclusion logic and compare included with excluded units. |
| Self-selection or response | Participation depends on interest, success, dissatisfaction, incentives, or availability. | Report response path, non-response, and representativeness limits. |
| Survivorship or success-story bias | Only retained customers, successful deployments, shipped experiments, or positive case studies are visible. | Ask for failures, dropouts, denominator, and selection into publication. |
| Publication or file drawer | Positive or novel outcomes are more visible than null, negative, or repeated outcomes. | Inspect preregistration, unpublished attempts, registries, or stated coverage when available. |
| Attrition | Missing units differ by arm, cohort, outcome, or exposure. | Report attrition by group and test plausible missingness effects. |

## Producer and dependence

| Risk | Observable signals | Check or correction |
|---|---|---|
| Sponsorship or vendor framing | The claimant funds, selects, runs, or publishes the comparison without independent audit. | Separate method transparency from independence and disclose the conflict. |
| Hidden dependence | Several URLs reuse one dataset, press release, benchmark harness, owner, analyst, or model output. | Collapse them into one independence group before judging corroboration. |
| Reporting or cherry-picking | Favorable outcomes, time windows, subgroups, baselines, or metrics appear without a predeclared selection rule. | Request the full outcome set and the rule chosen before results were known. |

## Judgment and interpretation

| Risk | Observable signals | Check or correction |
|---|---|---|
| Confirmation or motivated reasoning | Contrary evidence gets stricter treatment, exceptions, or omission while preferred evidence is accepted cheaply. | Apply the same criteria and articulate the strongest disconfirming case. |
| Anchoring | An early estimate, target, forecast, or vendor baseline dominates later judgment without re-derivation. | Re-estimate from independent inputs or state anchor sensitivity. |
| Availability or recency | Vivid, memorable, or recent cases substitute for the relevant base rate or full period. | Restore the denominator, time horizon, and less-visible cases. |
| Hindsight or outcome bias | A result is treated as predictable or a process as sound only because its outcome is known. | Compare with information and decision rules available beforehand. |
| Regression to the mean | An extreme observation improves or worsens and the change is attributed to an intervention without a comparison. | Inspect repeated baselines, controls, and natural variability. |

## Measurement and analysis

- Check whether instrumentation, definitions, coding, observer expectations, or proxy selection systematically favor one outcome.
- Check whether a metric changed after observation, a continuous variable was dichotomized, or subgroups were selected post hoc.
- For surveys and user research, inspect convenience sampling, demand characteristics, wording, order effects, subgroup coverage, and non-response.
- For incidents and root-cause analysis, resist the single-cause story, post hoc reasoning, and explanations chosen because they fit the known outcome.
- For case studies and testimonials, report the success-selection mechanism, vendor dependence, missing failures, and lack of a counterfactual.

Complete this check when every reported bias has an exact signal and plausible impact, relevant counter-signals are acknowledged, and the correction tests the distortion rather than accusing the producer.
