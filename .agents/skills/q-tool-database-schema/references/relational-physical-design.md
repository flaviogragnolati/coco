# Relational physical design

Use this branch only with an approved semantic model and a confirmed relational engine profile.

## Map meaning to relations

1. Preserve domain identity separately from its physical key representation. Record candidate, primary, alternate, and externally visible keys without inventing business meaning for surrogate keys.
2. Map attributes with explicit nullability, units, precision, temporal meaning, sensitivity, retention, and default semantics. Select a physical type only from the confirmed engine profile.
3. Map relationships with cardinality, optionality, ownership, lifecycle, and delete or update behavior. Use database constraints where the engine and lifecycle can enforce the invariant; name any enforcement left to another layer.
4. Normalize from functional dependencies and integrity needs. Denormalize only for an evidenced access pattern, with duplication authority, synchronization behavior, write cost, and verification.

## Design indexes from workload

Evaluate each candidate index against representative filters, joins, equality and range predicates, ordering, grouping, uniqueness, selectivity or distribution, table size, write rate, and engine behavior.

- Do not index every foreign key mechanically. Evaluate parent updates and deletes, child lookups, joins, volume, and write cost.
- Do not order a composite index by selectivity alone. Match usable prefixes, equality before range where the engine behavior warrants it, ordering, coverage, and actual query shapes.
- Distinguish a constraint-owned index from an additional access-path index.
- Record the query or invariant that justifies each candidate and the evidence still required.

## Check operational fit

Cover multitenancy, partitioning only when scale and operations justify it, sensitive-data boundaries, retention and deletion, history, generated or derived data, backup and restore consequences, and observability. Return ownership, distribution, or consistency choices to `q-plan-architecture`.

Complete the design when every relation, constraint, and candidate index traces to approved meaning or workload evidence, and every engine-specific claim resolves to the confirmed profile.
