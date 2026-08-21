# Forecast and sensitivity

Load this reference for forecast, sensitivity, or scenario analysis.

Separate observed, estimated, and forecast periods. Record series ID, frequency, unit, denominator, geography, seasonal adjustment or transformation, taxonomy breaks, retrieval cutoff, and vintage. Use a forecast only when its starting value resolves to a finding or an earlier calculation.

For each scenario provide a distinct annual rate path or driver equations, assumption refs, evidence refs, and invalidation conditions covering material demand, price, supply, regulation, competition, capacity, and timing drivers. At least two scenarios must differ in assumptions or rate paths. Scenario bounds are conditional ranges, not confidence or prediction intervals.

Run one-way sensitivity on assumptions that can change the decision. Report endpoint change, influential assumptions, and a switching value where one can be solved without false precision. Do not attach probabilities unless a separate probabilistic model, calibration, and diagnostics have been validated and recorded.

Block the result when scenarios are identical, a rate path uses an inconsistent unit or denominator, the base observation is not registered, or a probability appears without the required model. Complete the module when every published forecast value states its scenario, horizon, lineage, unit, denominator, invalidation conditions, and non-probabilistic qualifier.
