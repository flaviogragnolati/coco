# Competitor and concentration

Load this reference for competitor landscapes, market shares, CRn, or HHI.

Fix product scope, geography, customer substitution frame, share metric, denominator, period, and `as_of` before choosing competitors. Use one comparable edition or offer scope per matrix. Preserve `unknown` when no registered evidence establishes a feature; absence of public evidence is not `no`.

Require one row for every competitor-feature pair and finding refs for `yes`, `no`, or `partial`. Keep channel, import, multi-sided, innovation, and dynamic-competition differences visible when relevant.

For share calculations, normalize non-negative shares to fractions or percentages with an explicit convention. Record residual or unknown share rather than silently scaling incomplete coverage. Calculate:

```text
CRn = sum(n largest shares)
HHI = sum(percentage_share²)
```

Report coverage and the input shares with each result. HHI and CRn are descriptive screens, not market-definition findings, antitrust conclusions, or legal advice. A TAM category is not automatically a legally relevant market.

Complete the module when matrix coverage, evidence refs, scope consistency, share denominator, residual coverage, calculation command, and descriptive limitations are recorded.
