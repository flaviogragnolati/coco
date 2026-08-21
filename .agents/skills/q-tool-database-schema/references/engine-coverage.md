# Engine coverage

Classify every material conclusion before using an engine rule.

| Coverage | Meaning | Allowed conclusion |
|---|---|---|
| `verified-profile` | The engine and version match a bundled profile and the cited primary documentation. | Apply the profile within its stated version range. |
| `portable` | The conclusion follows from supplied semantics or evidence and does not depend on dialect behavior. | State it without engine-specific syntax or approval. |
| `unverified` | The conclusion depends on an absent, mismatched, or stale profile. | Return a coverage gap and route research or profile reconciliation. |

Bundled verified profiles:

- PostgreSQL 18 documentation for the relational profile;
- current MongoDB Database Manual for the document profile.

The profiles do not imply that PostgreSQL or MongoDB should be selected. `q-plan-tech-foundation` owns that decision. For MySQL, MariaDB, SQLite, SQL Server, Oracle, DynamoDB, Cassandra, graph, time-series, search, event-store, multimodel, or another engine, retain only portable findings unless current primary evidence is supplied and clearly scoped. Do not emit dialect SQL, transaction guarantees, online-operation claims, index-method claims, or a full engine-specific approval from generic criteria.

Treat an observed schema as evidence, not selection authority. Syntax may support a labeled inference such as `inferred-postgresql`; require confirmation before a material design or migration decision depends on it.

Complete coverage classification when every engine-dependent finding is either bound to a verified profile or visibly limited by an `unverified` gap.
