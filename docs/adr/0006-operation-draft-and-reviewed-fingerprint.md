# An operation is reviewed as a draft, and executing refuses if the demand moved

**Status:** accepted — 2026-07-27

An operation no longer executes on creation. `OperationStatus` gains `draft`: the row is created with its parameters, an admin reviews the demand it would batch, marks omissions, and executes as a separate command. The draft persists parameters, omissions and a **fingerprint of the effective demand set** the admin last saw; it does not persist the demand rows themselves, which are recomputed on every open so the review always shows live data. `execute` recomputes the demand, applies the omissions, and **refuses with `CONFLICT` if the fingerprint no longer matches**, handing back the diff so the admin can re-review.

## Considered options

- **Ephemeral preview** (a `preview` query, operation row created only at execution) — no schema change and no draft lifecycle, but the review leaves no durable record and cannot be handed to another admin or resumed later.
- **Advisory preview**, the house style established by the cut-absorption dialog and `fractionationCandidates`: the server replans from its own candidates and the client's view is orientative. Correct there, where preview and command are seconds apart. Rejected here because a draft can sit for days, and a review that silently batches demand nobody looked at is not a review.
- **Materializing the stored snapshot verbatim** — maximum fidelity to what was reviewed, but it bypasses live validation and would happily allocate a deleted cart item or demand another operation already took, violating ADR 0005.

## Consequences

- Drafts **reserve nothing**. They materialize no rows, so they do not appear in `listOriginalDemand`'s exclusion clauses and two drafts can look at the same demand. This is safe by construction rather than by lock: whichever executes first takes the demand, and the second one's fingerprint stops matching, so it is refused rather than double-allocating.
- The fingerprint covers the **effective** set — demand minus omissions — so demand arriving for an already-omitted user does not block execution. It is not a change to what will run.
- Omissions are stored as source keys **and** user ids. A user-level omission is a standing decision that survives recomputation, not a bulk toggle expanded at click time.
- An omission writes nothing onto the demand. Conservation (ADR 0005) holds without a compensating record: omitted original demand stays unallocated and an omitted roll over stays open. The audit trail lives on the operation, not on the cart item.
- Adding a status value to a live enum is owner-applied and out of band (architecture §21.9 A3), and forces `scripts/seed-verify.ts`'s `OperationStatus` coverage list and a seeded draft fixture. It forces **no** diagnostics exemption: a draft carries zero quantities and no lots, so the quantity rules balance trivially for the same reason they already do for `running`.
