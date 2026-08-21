# Document physical design and review

Use this branch for `physical-design` with a confirmed document engine or for `document-model-review` of an observed model. A document schema is a physical model even when the database permits flexible documents; do not treat absent validation as absent structure.

## Define document boundaries

1. Start from approved aggregates, ownership, invariants, lifecycle, consistency, access patterns, and update frequency.
2. Evaluate embedding versus references for atomicity, read locality, independent lifecycle, update frequency, duplication, relationship cardinality, document growth, and engine limits.
3. Name the authoritative copy of duplicated values and how stale copies are detected or repaired.
4. Identify unbounded arrays, hot documents, write contention, fan-out, orphan references, oversized documents, and cross-document invariants.

## Define shape and enforcement

Cover required and optional fields, type stability, discriminators or version fields, uniqueness, validation, sensitive-data boundaries, retention, deletion, historical truth, and compatibility with older readers and writers. Keep API validation distinct from constraints enforced by the database.

Design indexes only from representative equality, range, sort, array, text, or geospatial access patterns supported by the confirmed profile. Include index entry growth and write cost. Do not translate relational normalization, joins, or foreign-key rules mechanically into a document model.

For a greenfield physical design, return candidate collections and shapes as advisory. For a review, cite the exact observed path and distinguish current facts from inferred application behavior.

Complete the branch when aggregate boundaries, embedding or references, atomicity, growth, validation, duplication authority, lifecycle, and workload-driven indexes are covered or explicitly outside scope.
