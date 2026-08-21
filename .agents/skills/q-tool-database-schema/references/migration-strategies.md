# Migration strategies

Design a compatibility and evidence plan, not an executable migration.

## Establish the migration contract

Require current and target schemas, affected readers and writers, engine and version, deployment topology, data volume and growth, downtime budget, compatibility window, validation requirements, backup or restore capability, and cleanup authority. Separate schema change, data movement, application rollout, and operational verification even when a framework packages them together.

## Build the sequence

Use the smallest safe sequence justified by the change. A typical expand-and-contract candidate is:

1. **Expand** with a backward-compatible shape.
2. **Deploy compatibility** so active versions can tolerate both shapes.
3. **Backfill or transform** in bounded, resumable batches when data changes.
4. **Validate** counts, invariants, checksums or reconciled samples plus application behavior.
5. **Switch** reads and writes with observable acceptance signals.
6. **Contract** only after the compatibility window and explicit destructive-change approval.

Do not prescribe expand-and-contract when a simpler atomic change is proven safe, or when the engine and deployment model cannot support the proposed sequence.

## Make recovery honest

Classify rollback as:

- `possible`: prior code and meaning can be restored from the stated state;
- `partial`: only some phases or data can be restored;
- `impossible`: destructive or lossy meaning cannot be reconstructed reliably.

For partial or impossible rollback, define the restore point, forward-fix path, reconciliation, compatibility behavior, and human approval. Never generate a DOWN operation merely to satisfy a template.

Record lock or blocking risk, transaction boundaries, online-operation claims, replica or lag effects, resource usage, retry and resume behavior, observability, abort thresholds, and cleanup. Bind engine-specific claims to a verified profile.

Complete the strategy when every phase has prerequisites, owner, success signal, failure response, compatibility state, data validation, and recovery disposition.
