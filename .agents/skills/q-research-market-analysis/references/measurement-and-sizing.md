# Measurement and sizing

Load this reference for sizing, TAM/SAM/SOM, normalization, reconciliation, or demand segmentation. The Research Brief's `measurement_contract` is the authority for what is being measured; calculations may expose a mismatch but never silently redefine it.

## Normalize before arithmetic

Compare product/service, transaction, value-chain level, geography, channel, period, measure type, unit, denominator, stock/flow, gross/net, taxes, currency/base year, price basis, and taxonomy version. Record every permitted conversion as its own calculation with finding and assumption lineage. A material incompatibility without a defensible conversion blocks the affected result.

Give every additive component a disjoint coverage key. Check specifically for manufacturer revenue plus distributor or end-customer spend, production plus imports plus sales without inventory reconciliation, parent plus subsidiary revenue, bundles plus included components, gross output plus value added, installed-base stock plus annual flow, and overlapping customer or geographic segments. Preserve an unknown or residual category rather than force a total.

## Independent methods

Use the normalized denominator for both methods:

```text
TAM_top = sum(disjoint in-scope component values)

TAM_bottom = sum(customer_count
                 × addressable_fraction
                 × annual_quantity_per_customer
                 × price_per_unit)

SAM_s = TAM × serviceable_fraction_s
SOM_s = SAM_s × obtainable_share_s
```

Calculate top-down and bottom-up independently. Report absolute difference and midpoint-relative difference:

```text
gap_percent = abs(top - bottom) / ((top + bottom) / 2) × 100
```

When the midpoint is zero, report zero only if both methods are zero; otherwise leave reconciliation unresolved. Do not average methods with different coverage, denominators, periods, price bases, or taxonomy mappings.

## Demand segmentation

Derive segments only from registered evidence and declared taxonomy rules. Keep segments mutually exclusive for additive sizing or state overlap explicitly. Describe who buys, uses, and pays without treating a published survey sample as the whole population. A segment label is an analytical classification, not a newly observed fact.

Complete the module when input lineage, disjointness, normalization, calculation IDs, reconciliation status, assumptions, sensitivity, and qualified published results are inspectable.
