# Relational schema review

Review the observed schema against its declared semantics, workload, engine profile, and repository conventions. Do not reconstruct intended behavior from column names alone.

## Coverage

Inspect every in-scope table, relation, key, constraint, type, default, index, partition, generated value, and migration state. For ORM schemas, distinguish application declarations from constraints actually enforced by the database.

Evaluate:

- identity, candidate keys, uniqueness, nullability, checks, referential actions, and invariant coverage;
- type fidelity for money, measurements, identifiers, temporal values, structured data, and bounded or unbounded text;
- normalization or deliberate duplication and the authority that keeps duplicates consistent;
- indexes against supplied query shapes, distributions, volume, write rate, and engine behavior;
- tenant isolation, sensitive data, retention, deletion, history, auditability, and restore implications;
- drift between domain meaning, migration history, ORM declarations, and observed database structure.

Keep query-fetching style, API pagination, caching, replicas, and ORM N+1 behavior outside this review unless they directly explain a supplied schema or index finding. Route those concerns to architecture, implementation, debugging, or code review.

Complete the review when every object in scope is covered or named as unavailable, and every finding cites an exact observed location plus the governing semantic, workload, or profile evidence.
