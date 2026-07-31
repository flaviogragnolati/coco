# Documentation Index

> Updated 2026-07-27. Reference documents describe the system **as built**;
> the architecture feature document records design history and decisions per
> phase; ADRs are the compact decision records everything else cites.

## Reference documents (as built — keep current with the code)

| Document | Owns | Update when |
| --- | --- | --- |
| [`schema-reference.md`](./schema-reference.md) | Domain model, status architecture, primary/alternate flows, app-layer invariants, modeling limits | the Prisma schema or a business rule changes |
| [`fulfillment-reference.md`](./fulfillment-reference.md) | The fulfillment lifecycle as implemented: command surfaces, guards, quantity semantics, delivery modes, compensation, diagnostics philosophy | a fulfillment command, guard, or ladder changes |
| [`tracking-architecture.md`](./tracking-architecture.md) | The outbox → listener → tracking → derivation pipeline; event contracts, producers, keys, timeline APIs, projection rules | an event type, producer, mapping, or derivation rule changes |
| [`../CONTEXT.md`](../CONTEXT.md) | The domain language (with Spanish UI labels) | a new term enters the domain or an existing one sharpens |
| [`../src/features/admin/glossary/`](../src/features/admin/glossary/) | The admin glossary: `CONTEXT.md`'s vocabulary as a screen, mapping each Spanish label to its Prisma model or enum value and its table and column. `CONTEXT.md` stays canonical; the glossary is its consultable view inside the app, held to the schema by `glossary.data.test.ts`. Change requests against an entry are recorded in `glossary_proposal`; applying one is a code edit, never an app write ([ADR 0007](./adr/0007-glossary-stays-code-owned.md)) | a model, an enum value, or a term is added — the drift test names what is missing |

## Architecture decision records (`adr/`)

| ADR | Decision | Primarily binds |
| --- | --- | --- |
| [0001](./adr/0001-mercadopago-checkout-pro-reconciliation.md) | Mercado Pago Checkout Pro + webhook reconciliation; redirect params are never payment truth | checkout/payment flow (schema-reference §flow 3–4) |
| [0002](./adr/0002-fulfillment-status-derived-from-lineage.md) | Events are facts; `fulfillmentStatus` and order closure derived from live lineage | tracking-architecture (projectors, derivation) |
| [0003](./adr/0003-supplier-order-commands-the-supplier-loop.md) | SupplierOrder is the command aggregate; lot statuses cascade, never edited directly | fulfillment-reference §3 |
| [0004](./adr/0004-physical-packages-with-legs.md) | Packages are physical, carry an inbound/outbound leg; conservation checked per leg | fulfillment-reference §4–§5 |
| [0005](./adr/0005-demand-conservation-and-rollover-reaggregation.md) | Demand conservation invariant; roll over ladder; re-aggregation by default | fulfillment-reference §2, §8–§9 |
| [0006](./adr/0006-operation-draft-and-reviewed-fingerprint.md) | Operations are reviewed as drafts; execute refuses if the demand moved (fingerprint) | fulfillment-reference §2 |
| [0007](./adr/0007-glossary-stays-code-owned.md) | Glossary entries stay in code; a proposal is a change request, applied by editing `glossary.data.ts` and `CONTEXT.md` | the admin glossary (`src/features/admin/glossary/`) |
| [0008](./adr/0008-offer-discount-is-an-attribute-of-client-terms.md) | The offer discount is two columns on `ProductClientTerms` applied in `calculateLineTotal`; no promotion entity | catalog/cart/checkout pricing (`commerce.helpers.ts`) |
| [0009](./adr/0009-legal-documents-are-database-owned.md) | Legal texts are versioned rows in `legal_document`, published from the admin and revalidated on demand — the opposite of ADR 0007 | terms and conditions (`/terminos`, checkout acceptance) |

## Design history (living documents — record decisions, not current state)

| Document | Content |
| --- | --- |
| [`architecture/features/fulfillment-lifecycle-actions.md`](./architecture/features/fulfillment-lifecycle-actions.md) | The fulfillment series design document: phases 0–5 + closure as-built records (§21), decisions (§15), rejected alternatives (§17), deferred items and their gates (§21.9 Group D). The series is **closed** (2026-07-27) |
| [`code-review-codebase-2026-07-22.md`](./code-review-codebase-2026-07-22.md) | Codebase review findings and the per-phase remediation log |
| [`plans/`](./plans/) | Feature/UI plans (checkout redesign, admin shell, Mercado Pago sandbox enablement, …) — point-in-time, not maintained as references |

## Verification

Two commands guard the documented behavior against the real database (both
wired with `--conditions=react-server`):

- `pnpm fulfillment:e2e` — the twelve-step lifecycle run through the real service layer
- `pnpm db:seed-verify` — stored-equals-derived statuses, counters, zero critical diagnostics, per-enum state coverage

## Conventions

- Reference documents state behavior in the present tense and cite the ADR
  that governs each rule; design history explains *why* and is corrected, not
  rewritten.
- When a reference document and the code disagree, the code wins and the
  document must be updated in the same change.
- The schema is the structural source of truth; `schema-reference.md` is the
  behavioral source of truth for the application layer.
