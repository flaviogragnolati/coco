# Quantitative sanity

Use this reference for quantities, rates, samples, benchmarks, models, KPIs, surveys, forecasts, and performance claims. Inspect reported calculations and methods; do not fabricate missing data or present a hand calculation as formal statistical validation.

## Establish the measurement contract

Record the metric definition, unit, numerator, denominator, population, period, geography or environment, version, baseline, missing-data treatment, and uncertainty measure. A comparison is not direct until these conditions are materially aligned.

## Run the checks

| Check | Concern signal |
|---|---|
| Sample and precision | Sample size or effective independent units are unclear; intervals are absent or too wide for the conclusion; decimals imply unsupported precision. |
| Denominator and base rate | Percentages omit denominators; rates mix exposure periods; averages conceal materially different groups. |
| Significance and importance | A threshold or p-value substitutes for effect size, uncertainty, operational relevance, or cost. Non-significance is treated as proof of no effect. |
| Multiplicity and metric shopping | Many outcomes, subgroups, windows, transformations, or models were tried without disclosure, correction, or confirmatory separation. |
| Extrapolation | A fit is projected beyond observed range, version, traffic shape, population, or time without a validated mechanism. |
| Aggregation | Simpson's paradox, ecological inference, or weighted/unweighted aggregation could reverse the conclusion. |
| Model fit | Assumptions, calibration, holdout design, sensitivity, collinearity, or missing-data mechanisms are absent or violated. |
| Overfitting and leakage | Test information, future data, duplicates, target-derived features, or repeated tuning contaminates evaluation. |
| Selective transformation | Continuous variables are dichotomized or transformations are chosen after results without reporting the search. |
| Reproducibility | Harness, seed, run count, variance, data version, code, and configuration are missing or unstable. |

## Apply engineering extensions

- **Benchmarks:** compare hardware, workload, software version, configuration, warm-up, concurrency, dataset, harness, run count, and run-to-run variance. A faster demo in a different environment is indirect evidence for production.
- **Vendor comparisons:** require visible methodology and distinguish a sponsored benchmark from independent reproduction. Missing public independent evidence is a limitation, not negative proof.
- **KPIs:** test whether optimization changes the measured proxy without improving the intended outcome. Name Goodhart, McNamara, or metric-shopping effects only when the measurement design shows the mechanism.
- **ML/AI:** inspect train/validation/test separation, evaluation-to-production distribution shift, benchmark contamination, leakage, tuning budget, baseline parity, and reproducible inference settings.
- **Surveys and user research:** inspect sampling frame, response rate, self-selection, weighting, question wording, subgroup size, uncertainty, and whether the target population matches respondents.
- **Incidents and RCA:** compare against normal variation, regression to the mean, exposure time, alternative causes, and evidence expected if the proposed cause were true.

Recalculate only transparent arithmetic from supplied values and label it as a sanity check. When raw inputs, covariance, run data, or method details are missing, state the exact missing input and use `insufficient_evidence` where the conclusion depends on it.

Complete this check when units and denominators reconcile, uncertainty and dependence are visible, the comparison conditions match or are qualified, and no quantitative result is described as stronger than its measurement contract permits.
