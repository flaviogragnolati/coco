# MongoDB profile

Apply this profile only when the confirmed engine is MongoDB and the project version is compatible with the cited current Database Manual. Record the deployed version; mark version-dependent behavior `unverified` until reconciled.

## Physical rules

- Model collections and documents from application access patterns and atomicity needs. Flexible schema does not remove the need for an explicit, versioned shape.
- Embed data read and updated together when lifecycle, growth, and atomicity fit. Use references when entities change independently, relationships or arrays can grow without bound, or duplication ownership cannot be maintained safely.
- Evaluate the BSON document size limit, nesting, array growth, hot-document contention, and update amplification before embedding.
- Use schema validation when database-level enforcement fits the lifecycle and compatibility window. Keep application validation and database validation distinct.
- Design single-field, compound, multikey, text, wildcard, TTL, partial, sparse, hashed, or geospatial indexes only when the confirmed version and workload justify them. Account for array semantics, index entry growth, write cost, and overlapping indexes.

## Migration and performance safeguards

- Treat shape evolution as compatibility between old and new readers and writers. Include document versioning or tolerant reads only when the application design supports them.
- Distinguish explain query-planner output from execution statistics. Require supplied, sanitized evidence and representative parameters before concluding that an index or model change fixes performance.
- Route actual queries, profiler access, index creation, migrations, or database commands to `q-code-debug` or `q-code-implement`.

Primary sources, accessed 2026-08-13:

- [Data modeling](https://www.mongodb.com/docs/manual/data-modeling/)
- [Embedding versus references](https://www.mongodb.com/docs/manual/data-modeling/concepts/embedding-vs-references/)
- [Schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/)
- [BSON document size](https://www.mongodb.com/docs/manual/reference/limits/#mongodb-limit-BSON-Document-Size)
- [Indexes](https://www.mongodb.com/docs/manual/indexes/)
- [Explain results](https://www.mongodb.com/docs/manual/reference/explain-results/)
