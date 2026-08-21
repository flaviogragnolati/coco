# PostgreSQL profile

Apply this profile only when the confirmed engine is PostgreSQL and the applicable version is compatible with the cited PostgreSQL 18 documentation. For another version, verify changed behavior or mark the rule `unverified`.

## Physical rules

- PostgreSQL provides a native `uuid` type; do not map UUIDs to `CHAR(36)` by default. Select key type and generation from identity, ordering, distribution, and interoperability requirements.
- Distinguish `timestamp without time zone` from `timestamp with time zone`. Model an instant, civil date/time, and presentation zone explicitly rather than applying a universal timestamp rule.
- Primary keys and unique constraints create supporting unique indexes. A foreign key does not automatically create an index on its referencing columns; evaluate child lookups, joins, parent updates or deletes, table size, and write cost.
- Design multicolumn B-tree indexes from actual predicate prefixes, equality and range constraints, ordering, and query shapes. Selectivity alone does not determine column order.
- Treat partial, expression, covering, specialized, and partitioned indexes as engine-specific candidates requiring applicable workload evidence.

## Migration and performance safeguards

- Verify transaction boundaries and locking for each DDL operation; do not assume every online or concurrent operation can run inside the caller's normal migration transaction.
- PostgreSQL `EXPLAIN ANALYZE` executes the statement. Never run it under this skill. Recommend a safe command and execution environment to `q-code-debug`, especially for writes or production data.
- Keep estimated plans distinct from actual timing and row evidence. Parameter values, statistics, cache state, concurrency, and version can change the plan.

Primary sources, accessed 2026-08-13:

- [Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)
- [UUID type](https://www.postgresql.org/docs/18/datatype-uuid.html)
- [Date/time types](https://www.postgresql.org/docs/18/datatype-datetime.html)
- [Multicolumn indexes](https://www.postgresql.org/docs/18/indexes-multicolumn.html)
- [Using EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)
- [Building indexes concurrently](https://www.postgresql.org/docs/18/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY)
