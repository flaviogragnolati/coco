# Performance review

Evaluate only supplied and sanitized evidence. This branch may recommend measurements or commands but must not connect, execute, benchmark, or mutate.

## Evidence levels

| Evidence | What it supports |
|---|---|
| Query shape plus schema | Candidate access paths and missing information, not a performance conclusion. |
| Estimated plan | Planner choices and estimates, with no claim about actual runtime. |
| Actual plan and timings | Observed execution for that run; account for cache, parameters, load, and side effects. |
| Repeated metrics and distributions | Confidence about representative behavior and variance. |
| Lock, wait, I/O, and resource telemetry | Contention or system-level hypotheses within the measured window. |

Separate observed facts, inferred causes, competing hypotheses, and recommended next measurements. Require parameter shapes, row distributions, cardinalities, data size, concurrency, read/write rate, latency target, environment, and cache state when they could change the result.

Inspect applicable evidence for scans, estimates versus actual rows, join strategy, predicate and sort support, returned versus filtered rows, index usage, lookup amplification, memory or spill, I/O, locks and waits, hot partitions or documents, write amplification, bloat or fragmentation, and plan variability. Use only terms supported by the confirmed engine profile.

An index candidate must cite the query pattern, expected benefit, write and storage cost, overlap with existing indexes, and verification still required. Do not use “index every foreign key,” “index every WHERE column,” or “most selective column first” as standalone rules.

Some actual-plan commands execute the underlying statement. Mark that risk in `verification_handoff`, prefer safe replicas or staging with production-like distributions, and route execution to `q-code-debug` under the project's authorization.

Complete the review when confidence matches evidence, alternatives remain falsifiable, and the next measurement or correction has one execution owner.
