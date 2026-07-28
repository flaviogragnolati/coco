# Code Review Report — Coco Bulk (whole codebase)

> **Scope type:** Codebase
> **Originally reviewed:** 2026-07-22 on `main` @ `e078a8e` · **Reviewer:** `/code-review` (max effort, 10 finder angles + adversarial verification)
> **Re-verified against the working tree:** 2026-07-28 on `main` @ `0869c96`
> **Structure:** open findings carry their full detail in §5. Everything resolved is condensed into **§10**, a single closing section — the per-finding narratives and the thirteen per-session remediation logs that used to live here were collapsed into one row each.

---

## 1. Executive Summary

The original review found **58 issues: 1 Critical · 8 High · 31 Medium · 18 Low**, plus 12 commendations and 3 documented refutations. **38 are now resolved** across nine remediation sessions (§10). Two new findings were added on the 2026-07-28 re-verification pass, giving **22 open**.

The architecture held up. Every structural finding the review raised — duplicated money arithmetic, three writers on `fulfillmentStatus`, a projector that replayed events instead of deriving from records, five copies of the terms-validity predicate, sixteen copies of `mapServiceError`, seven near-identical CRUD clients — is closed, and the fulfillment lifecycle series that followed rebuilt aggregate status on a derivation over live lineage (ADR 0002). Test count went from **37 to 618**; type-check is clean; Biome is down from 29 errors to 18, and **every first-party file the lint finding named is now clean** — what remains is vendored shadcn components, config formatting, and two `noStaticOnlyClass` hits on a pattern `docs/tracking-architecture.md` explicitly declares intentional (a missing rule override, not a code defect).

**What changed in the money cluster.** Two of the three worst payment defects are fixed. `submitOrderAfterCompletedPayment` no longer receives the post-update `completedAt`, so MercadoPago payments now actually submit the order (#25 — the report's highest real-world priority). The preference no longer derives `unit_price` by float division: each line is sent at `quantity: 1, unit_price: lineTotal`, guarded by an integer-cents assertion that the preference total equals the recorded `UserTransaction.amount` and that every line carries the attempt's currency (#29). Both fixes were extracted into pure decision modules with unit tests.

**What that fix exposed, and how it closed (2026-07-28).** Un-blocking #25 made **#31 live**: a product added from a second tab during the payment window had no `UserOrderItem`, so the event loop threw inside the reconciliation transaction and rolled back the settlement of an already-captured payment, while #10 swallowed the error into a 202. Both are now closed — submission is driven by the order snapshot intersected with the live cart items, the cart is frozen during checkout (with `checkout.leave` as the way back), failure bookkeeping survives its own transaction, and the webhook logs and returns a retryable 500.

**The money verification layer now exists.** #30 (an integer-cents amount/currency/refund assessment gating every transition into `completed`), #27 (`calculateLineTotal` throws instead of silently charging the flat MOQ price, plus write-time `step`/`stepPrice` coherence), #28 (one live order per cart; a retry mints a transaction on the same order) and #26 (no mock gateway and no mock payment methods in production) all landed together, followed by #15 (one shared payment→submit transition). **#1 stands in narrower form:** its pricing half is done — `calculateLineTotal` and `normalizeCartQuantity` now carry a characterization matrix — but no test drives `confirmAndPay` or `reconcileMercadoPagoPayment` end to end.

**Next, in order:** **#13** (cart/cart-item partial uniques — the last unaddressed concurrency edge in the money path), then Batch C (**#32 + #16**), then Batch D (**#11 + #43**). **#1**'s integration half remains the highest-leverage single action in the cluster.

## 2. Scope & Methodology

**What was reviewed** — the whole application: `src/server/**`, `src/app/**`, `src/features/**`, `src/components/**`, `src/schemas/**`, `src/store/**`, `src/shared/**`, `src/trpc/**`, plus `prisma/schema.prisma`, `prisma/seed.ts`, `src/env.js`, `scripts/**` and the config files. 374 TS/TSX files at review time; **542 today**. Documentation treated as normative: `CONTEXT.md`, `docs/adr/0001`–`0006`, `docs/architecture/features/fulfillment-lifecycle-actions.md`, `docs/tracking-architecture.md`, `docs/schema-reference.md`.

**Explicitly out of scope** — `generated/`, `node_modules/`, `public/`.

**How (original pass)** — 10 independent finder angles run in parallel (5 correctness: line-scan, removed-behavior, cross-file tracing, language pitfalls, wrapper/proxy correctness; 3 cleanup: reuse, simplification, efficiency; plus altitude and conventions). Every candidate then went to an independent adversarial verifier instructed to refute it. Three candidates were refuted and are recorded in §8 so they are not re-investigated.

**How (2026-07-28 re-verification)** — every open finding was re-read against the current tree at its cited location, not assumed from the remediation logs. Three findings the logs never claimed (#25, #29, #53) were found resolved by later feature work and moved to §10; two new findings (#59, #60) were promoted out of the fulfillment-closure notes after independent verification. Locations were repointed where route-group moves changed paths.

**Tooling signals** (run 2026-07-28 on `main` @ `0869c96`):

| Command | Result | At review time (`e078a8e`) |
|---|---|---|
| `pnpm typecheck` (tsgo) | ✅ clean, exit 0 | ✅ clean |
| `pnpm test` (vitest) | ✅ **43 files, 618 tests**, all pass | 5 files, 37 tests |
| `pnpm check` (biome) | ❌ **18 errors, 4 warnings** — 16 in shadcn-generated files and configs, 2 in first-party source (see #19) | ❌ 29 errors, 4 warnings |
| `pnpm db:seed && pnpm db:seed-verify && pnpm fulfillment:e2e` | ✅ exit 0 (harness drives the fulfillment service layer against a real DB) | did not exist |
| `npx madge --circular --extensions ts,tsx --ts-config tsconfig.json ./src` | ✅ 0 cycles in `src/` | — |

> **On `madge`.** The original review's `npx madge --circular src/` signal was **vacuous**: madge defaults to `.js`, so it processed exactly two files (`env.js`, `env.helpers.js`) and never opened a `.ts` or `.tsx` file. Re-run correctly it reports 39 cycles, **all inside `generated/prisma/`** (out of scope) and none in hand-written `src/`. The conclusion holds; the evidence for it did not exist until it was re-run. **The `madge` script in `package.json` still needs `--extensions ts,tsx --ts-config tsconfig.json`, or it will keep reporting a clean bill of health for a directory it is not reading.**

**Limitations** — No performance finding was confirmed by `EXPLAIN`; query-shape findings are read against `prisma/schema.prisma` indexes. Accessibility was sampled, not audited exhaustively. Frequency scores for duplication findings are exact counts; for behavioural findings they reflect call-site spread. `vitest.config.ts` is `environment: "node"` with no DOM library and no database fixture, so **no React component, hook, or route handler is covered by any automated test** — the `scripts/fulfillment-e2e.ts` harness covers the fulfillment service layer only, not checkout or payments.

## 3. Risk-Ranked Findings — Open (Overview)

22 open findings, sorted by computed risk descending. **⚡** marks findings whose real urgency exceeds their computed band — per the rubric, single-site defects that still corrupt money or breach a boundary keep their honest score and carry the flag instead. **🆕** marks findings added on the 2026-07-28 pass.

| # | Finding | Area | Location | Sev | Freq | Risk | ⚡ | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 1 | No test coverage on cart pricing or the transactional payment paths | TEST-1 | `commerce.helpers.ts:196` · absence | S3 | F3 | 🟠 High (9) | | 🔴 Must-fix |
| 11 | Outbox has no background drain, no backoff, no requeue | OPS-4 | `domain-event-dispatcher.ts:175` | S3 | F2 | 🟡 Medium (6) | | 🔴 Must-fix |
| 13 | Concurrent cart writes duplicate items and carts | DATA-2 | `cart.service.ts:163` | S3 | F2 | 🟡 Medium (6) | | 🟠 Strong |
| 16 | Diagnostics substitute for write-time invariants | DATA-1 | `operations-cart.service.ts:192` | S3 | F2 | 🟡 Medium (6) | | 🟠 Strong |
| 60 🆕 | Supplier MOQ applied per cart item, never to pooled demand | DATA-4 | `operation-execution.service.ts:169` | S3 | F2 | 🟡 Medium (6) | | 🟡 Preferable |
| 32 | Admin edit rewrites quantity on paid orders | DATA-4 | `operations-cart.data.ts:503` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| 19 | Biome fails on checked-in files (18 errors, none first-party) | TEST-4 | `src/components/ui/input.tsx` · configs | S2 | F2 | 🟡 Medium (4) | | 🟠 Strong |
| 41 | `billingAddressSnapshot` populated with the shipping address | DATA-6 | `checkout.data.ts:391` | S3 | F1 | 🟢 Low (3) | | 🟠 Strong |
| 42 | Diagnostics attributed at lot, not lot-item, granularity | DATA-4 | `cart-traceability.assembler.ts:88` | S3 | F1 | 🟢 Low (3) | | 🟠 Strong |
| 43 | Outbox events with zero listeners marked `processed` | ERR-1 | `domain-event-dispatcher.ts:146` | S3 | F1 | 🟢 Low (3) | | 🟠 Strong |
| 59 🆕 | A `resolved` roll over re-enters the original-demand pool in full | DATA-4 | `operation-execution.service.ts:340` | S3 | F1 | 🟢 Low (3) | | 🟠 Strong |
| 46 | Order page masks every failure as 404 | ERR-2 | `my-orders/[orderId]/page.tsx:103` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 47 | User can rewrite `type` on the managed MP payment method | DATA-5 | `checkout.data.ts:337` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 48 | Second hand-rolled inbox beside the outbox | MAINT-4 | `payment.data.ts:320` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 49 | `PaymentGatewayPort` bypassed by the only real provider | MAINT-1 | `payment-gateway.ts:36` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 50 | `checkout-client` hand-splices React Query cache | LIB-QUERY-1 | `checkout-client.tsx:119` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 51 | `ConfigEditor` prop-mirroring effect discards admin edits | REACT-2 | `payments-admin-client.tsx:269` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 52 | `profile.router.ts` is the only router touching Prisma directly | CONV-1 | `profile.router.ts:25` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 54 | `payment.service.ts` bypasses the shared audit-log helper | DATA-6 | `admin/payment.service.ts:117` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 55 | `checkout.getState` is dead and duplicates `start` | MAINT-5 | `checkout.service.ts:421` | S1 | F1 | 🟢 Low (1) | | 🔵 Optional |
| 56 | `domainEventTypeSchema` + `DomainEventType` unreferenced | MAINT-5 | `domain-events.schemas.ts:367` | S1 | F1 | 🟢 Low (1) | | 🔵 Optional |
| 58 | `lodash` and `bluebird` declared but never imported | SEC-8 | `package.json:44,51` | S1 | F1 | 🟢 Low (1) | | 🔵 Optional |

**Two findings were re-scored on this pass**, both downward, both because remediation elsewhere narrowed them — the inputs changed, not the arithmetic:

- **#1** `S3 × F4 = 12 (Critical)` → **`S3 × F3 = 9 (High)`**. Three payment decision modules and `commerce.helpers`' snapshot/formatter surface are now tested; the pricing arithmetic and the transactional paths are not. The pattern recurs in several places rather than throughout.
- **#19** `S2 × F3 = 6` → **`S2 × F2 = 4`**. Every first-party file the finding named is now Biome-clean. What remains is vendored shadcn components and config formatting.

## 4. Findings by Recommendation Category

**⛔ Antipatterns** — none open.

**🔴 Critical / Must-fix** — 1, 11, 32.

**🟠 Strong** — 13, 16, 19, 41, 42, 43, 59.

**🟡 Preferable** — 46, 47, 48, 49, 50, 51, 52, 54, 60.

**🔵 Optional / Nit** — 55, 56, 58.

**🟢 Commendations** — see §7.

## 5. Detailed Findings (open only)

Findings resolved since the review are summarized in **§10** and their detail is deliberately not repeated here. Full blocks are given for the High and Medium bands; Low-band findings are condensed into §5.3, per the skill's proportionality principle.

### 5.1 High

---

### 1. No test coverage on cart pricing or the transactional payment paths

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟠 High (9) — S3 × F3 *(was Critical (12) — S3 × F4; see §3 for why it moved)*
- **Standard:** `TEST-1` Coverage of what matters
- **Location:** `src/shared/common/commerce.helpers.ts:196` (`calculateLineTotal`), `:125` (`normalizeCartQuantity`) · absence across the checkout and reconciliation services

**What** — The suite grew from 37 tests to 648. **Piece (1) of the fix landed on 2026-07-28**: `commerce.helpers.test.ts` now carries the MOQ/step characterization matrix over `calculateLineTotal` and `normalizeCartQuantity`, including the `stepPrice: null` case that #27 was about, and the payment work added four pure decision suites (`mercadopago-preference.decision.test.ts`, `mercadopago-reconciliation.decision.test.ts` — now including the amount assessment — `webhook-signature.decision.test.ts`, `order-submission.decision.test.ts`).

**What remains** — No test constructs a caller for `confirmAndPay` or `reconcileMercadoPagoPayment`: `scripts/fulfillment-e2e.ts` drives the fulfillment service layer against a real database but starts *after* payment, seeding completed transactions rather than creating them. Everything Phase 3's `confirmAndPay` restructure and the shared submit transition changed is covered by manual walkthroughs only.

**Why it matters** — `calculateLineTotal` is the pricing authority for three independent consumers: cart display, the `UserTransaction.amount` written to the database, and — via `buildPreferenceLines` — the amount charged at MercadoPago. The preference-side invariant added by #29's fix (`preferenceAmount === expectedAmount`) protects against *serialization* divergence but not against both sides computing the same wrong number; #27's throw and #30's inbound assessment now bracket that gap, but nothing yet asserts it end to end.

**Fix (remaining)** — Integration tests on `confirmAndPay` and `reconcileMercadoPagoPayment` through `createCaller`, asserting the invariant that binds the cluster: *the sum of preference line items equals `UserTransaction.amount` equals the sum of `UserOrderItem.priceSnapshot` line totals.* The fulfillment harness proves the pattern is viable against a real database; extending it upstream to checkout is the cheapest route.

**References** — [Vitest — testing guide](https://vitest.dev/guide/) · [tRPC — server-side calls](https://trpc.io/docs/server/server-side-calls) · `scripts/fulfillment-e2e.ts` (the existing harness)

---

### 5.2 Medium

---

### 11. The outbox has no background drain, no backoff, and no requeue

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `OPS-4` Deployment assumptions
- **Location:** `src/server/events/domain-event-dispatcher.ts:83` (`wake`), `:175` (`handleFailure`)

**What** — `wake()` is called from nine places, all inside request paths. There is no `instrumentation.ts`, no cron, no `setInterval`, and no admin retry route. `handleFailure` re-marks the row `pending` with `attempts: { increment: 1 }` and **no delay**; after `MAX_ATTEMPTS = 5` it flips to `failed`, which nothing ever reads or resets.

**Why it matters** — During a 10-second DB blip in a busy checkout period, each subsequent request's `wake()` burns another attempt with no backoff; five requests later the event is permanently `failed`. The `cart.item.submittedToOrder` event is then never handled: no `CartItemTrackingEvent` is written, the projector never runs, and `CartItem.fulfillmentStatus` freezes at its pre-event value — the customer's order timeline is silently and permanently incomplete. The fulfillment series multiplied the event types flowing through this machinery without changing its reliability envelope. Separately, if the process dies between `claim()` and completion the row sits in `processing` until some unrelated user action happens to call `wake()` after `STALE_LOCK_MS`.

**Fix** — Add exponential backoff via a `nextAttemptAt` column consulted by the claim query. Add a periodic drain that does not depend on user traffic (a Next.js `instrumentation.ts` interval is the smallest step; a real queue is the right long-term answer). Add an admin procedure to requeue `failed` events, and surface the `failed` count in the admin dashboard.

**References** — `docs/tracking-architecture.md` · [Microservices.io — Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)

---

### 13. Concurrent cart writes duplicate items and carts

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `DATA-2` Concurrency & races
- **Location:** `src/server/services/cart/cart.service.ts:163` (`upsertCartItem`), `:106` (`getOrCreateCurrentCart`)

**What** — Read-then-create with no unique constraint backing either. `CartItem` has five `@@index` entries and **zero `@@unique`**; `Cart` likewise. The enclosing `db.$transaction` calls pass no options, so they run at Prisma's default — Postgres Read Committed.

**Why it matters** — Two concurrent add-to-cart requests both find `null` and both create. `checkout.data.ts` selects *all* `{deleted:false, status:"inCart"}` items and maps every one into a `UserOrderItem`, so the customer is billed twice for the same product; `removeItem` uses `findFirst` and removes only one. The same shape on `getOrCreateCurrentCart` yields two open carts, and `findCurrentCartByUserId` orders by `updatedAt desc` and returns one — silently hiding items added to the other. The UI disables the button during the mutation, which reduces but does not eliminate reachability: the `protectedProcedure` is directly callable, cart mutations carry no idempotency key, and separate tabs bypass a per-component pending flag entirely.

The codebase now knows this technique well — `runSerializable` in `_base/serializable-transaction.ts` is the single entry point for the twelve `Serializable` fulfillment commands, with a bounded P2034 retry. **None of it reaches the cart.**

**Fix** — Add `@@unique([cartId, productClientTermsId])` scoped to active rows (a partial unique index via raw SQL in a migration, since Prisma cannot express partial uniqueness declaratively) and convert `upsertCartItem` to a real `upsert`. For carts, a unique partial index on `(userId)` where the cart is open.

**References** — [PostgreSQL — partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html) · [Prisma — `upsert`](https://www.prisma.io/docs/orm/reference/prisma-client-reference#upsert)

---

### 16. Diagnostics substitute for write-time invariants

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `DATA-1` Atomicity
- **Location:** `src/server/services/admin/operations-cart.service.ts:192`; `prisma/schema.prisma:819-820,838-839`

**What** — `docs/schema-reference.md` §3 states normatively that the quantity represented by `CartItemLotItem` "must never exceed the original request quantity". The admin cart editor still mutates `CartItem.quantity` with no look at existing allocations.

**Partially narrowed since the review.** The fulfillment series added real write-time conservation *within the supplier loop*: `planCutAbsorption` enforces `Σ removedQuantity === cut` and throws `CONFLICT` on an invalid override set, and `recomputeOperationCounters` rewrites the six live counters from records inside the same transaction so the balance diagnostics cannot drift. That machinery covers cuts, cancellations and compensation. It does **not** cover the `CartItem → CartItemLotItem` direction, which is the one the schema reference names.

**Why it matters** — This is the shape that produces #32: state the read-time diagnostics hunt for is state a write-time guard should have made impossible. `CartItemLotItem.cartItem` is still `onDelete: Cascade` (`schema.prisma:819`), as is `PackageAllocation` on both its parents (`:838-839`), so `hasHardDeleteBlockers` — a read-then-delete check at Read Committed — is the only thing between a concurrent `executeOperation` and cascade-deleting the lineage it just created.

**Fix** — Assert conservation inside the mutating transaction (`sum(CartItemLotItem.quantity) <= newQuantity`) and switch the lineage relations to `onDelete: Restrict`. Keep the diagnostics as a safety net for historical data, not as the primary control. Land with #32, which is the same edit path.

**References** — `docs/schema-reference.md` §3 · `CONTEXT.md` ("Roll over … _Avoid_: silent quantity delta")

---

### 60 🆕. The supplier MOQ is applied per cart item, never to pooled demand

- **Recommendation:** 🟡 Preferable — **this is a domain question before it is a defect**
- **Risk:** 🟡 Medium (6) — S3 × F2 *(conditional: if pooling is the intent, S3 is right; if per-item is the intent, this is a documentation finding only)*
- **Standard:** `DATA-4` Server-authoritative decisions
- **Location:** `src/server/services/operations/operation-execution.service.ts:169`; `operation-assignment.helpers.ts:65`
- **Provenance:** surfaced by the fulfillment closure's twelve-step end-to-end run, verified independently on this pass

**What** — `calculateAssignableQuantity` is called once per `DemandItem` inside the assignment loop, so each customer's line is measured against the supplier's minimum on its own:

```ts
// operation-execution.service.ts:169 — inside `for (const demand of ...)`
const assignedQuantity = calculateAssignableQuantity({
	quantity: demand.quantity,
	moq: supplierResolution.term.moq,
	step: supplierResolution.term.step,
	max: supplierResolution.term.max,
});
// helpers.ts:76 — the whole line rolls over when it alone is short
if (quantity.lt(moq)) return new Prisma.Decimal(0);
```

The behaviour is already documented in a comment at `operation-review.ts:122`, so it is known — it is the *intent* that is unrecorded.

**Why it matters** — A customer ordering below the supplier's minimum rolls over pre-allocation however many other customers ordered the same product in the same operation. The closure run made this concrete: four seeded carts ordering the same two products produced allocations for only two of them. Pooling demand to reach a supplier minimum is arguably what an aggregation batch *is for* — `CONTEXT.md` describes an Operation as the batch that aggregates demand — so the current behaviour may be silently defeating the aggregate's purpose for exactly the small buyers it exists to serve.

**Fix** — This needs a domain decision before code. If pooling is the intent: group `DemandItem`s by resolved supplier term before applying the MOQ, assign against the pooled quantity, then distribute the assignable amount back across the contributing items (FIFO by payment date would mirror the coverage policy already used for dispatch, and LIFO the cut-absorption policy — pick deliberately and say why). If per-item is the intent: record it in `CONTEXT.md` under **Operation**, because the current shape reads as an oversight to anyone who has not read `operation-review.ts:122`. A `simple-grill` is the right size for this.

**References** — `CONTEXT.md` (**Operation**, **Roll over**) · `docs/architecture/features/fulfillment-lifecycle-actions.md` §20.2

---

### 32. An admin quantity edit rewrites paid orders

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Desynchronizes a paid order from its payment with no audit trail.
- **Standard:** `DATA-4` Server-authoritative decisions
- **Location:** `src/server/services/admin/operations-cart.data.ts:503`; caller `operations-cart.service.ts:192`

**What** — Unchanged. An unfiltered `updateMany` over every `UserOrderItem` for a cart item, with no order-status guard:

```ts
// operations-cart.data.ts:503
await db.userOrderItem.updateMany({ where: { sourceCartItemId: cartItemId }, data: { quantity } });
// operations-cart.service.ts:190-196 — called whenever the quantity differs, nothing else checked
if (currentItem.quantity !== item.quantity) {
	await updateCartItemQuantity(database, item.id, item.quantity);
	await updateUserOrderItemQuantitiesByCartItemId(database, item.id, item.quantity);
```

This is still the only post-creation write to `UserOrderItem.quantity` in all of `src/server`.

**Why it matters** — A paid order with quantity 10 becomes quantity 40 when an admin edits the cart. `priceSnapshot` is written exactly once at order creation and never recomputed; `UserTransaction.amount` is written once and the admin path performs zero transaction writes. So the order claims 40 units against a payment for 10 — and `listOriginalDemand` reads `userOrderItem.quantity` *specifically on orders with a completed transaction*, so the supplier is asked for 40. The admin input is `requiredDecimalString("Cantidad", 4)` (format only) while the customer path calls `normalizeCartQuantity`, so the stored quantity need not even be a valid MOQ/step multiple. Note the asymmetry inside the same function: the *removal* branch is lineage-aware (it reads `item.hasLineage`); the quantity branch checks nothing.

The fulfillment series built exactly the machinery this needs — `planCutAbsorption`, `recomputeOperationCounters`, and `RollOver(stage: postAllocation)` — but wired it into the supplier loop, not into the admin cart editor.

**Fix** — Refuse to mutate quantities on cart items belonging to an order with a completed transaction; require an explicit compensating flow (refund/credit, or a roll over through the Phase 1 machinery) instead. If mid-flight edits must be supported, recompute `priceSnapshot` and record a transaction adjustment in the same transaction. Apply `normalizeCartQuantity` on the admin path too. Land with **#16**, which is the same transaction.

**References** — `docs/schema-reference.md:74` ("never recalculate old commercial records from current mutable tables")

---

### 19. Biome fails on checked-in files

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (4) — S2 × F2 *(was 6 — S2 × F3)*
- **Standard:** `TEST-4` Type & lint gates
- **Location:** `src/components/ui/input.tsx`, `field.tsx`, `src/lib/utils.ts`, `src/server/events/domain-event-publisher.ts:9`, `src/server/services/audit/audit-log.service.ts:26`, plus `tsconfig.json`, `biome.jsonc`, `components.json`, `postcss.config.js`, `skills-lock.json`, `.vscode/*`, `.agents/skills/*`

**What** — `pnpm check` reports **18 errors and 4 warnings** across 568 files, down from 29 across 393. The composition changed more than the count: **every first-party application file the original finding named is now clean** — `crud-delete-dialog.tsx`, `crud-page-shell.tsx`, `_lib/filter-helpers.ts`, `admin-crud.errors.ts`, the four `crud-home/*/page.tsx` files. What remains splits three ways: shadcn-generated files (`input.tsx`, `field.tsx`, `lib/utils.ts`), formatting on config and skill-manifest files, and **two `lint/complexity/noStaticOnlyClass` hits in first-party server code** — `DomainEventPublisher` and `AuditLogService`.

**Why it matters** — The repo's own gate is still red, so it still cannot be used in CI or as a pre-merge check, and every contributor still learns to ignore the output. The remaining errors were deliberately left twice (the Batch 6 session explicitly reverted the auto-fixes to keep an unrelated diff reviewable), which is defensible per-session and indefensible as a steady state: the reason to fix them is not the errors, it is that a red gate cannot become a required check.

The two `noStaticOnlyClass` hits are the sharpest illustration. `docs/tracking-architecture.md:203` **declares static-only classes intentional** for exactly these two, while `biome.jsonc`'s `recommended: true` enables the rule with no override. The linter and the architecture document disagree in writing, and the disagreement has been ignored rather than resolved — which is what a permanently-red gate produces.

**Fix** — Add a `noStaticOnlyClass: "off"` override (or per-file suppressions naming the doc) so the documented decision and the linter agree. Run `pnpm check:write` and commit the result as a single formatting-only commit. Add `.agents/**` and `skills-lock.json` to `biome.jsonc`'s ignore list, since those are vendored. Then wire `pnpm check && pnpm typecheck && pnpm test` into CI.

**References** — `biome.jsonc` · [Biome — configuration](https://biomejs.dev/reference/configuration/)

---

### 5.3 Low-band findings (condensed)

Each is real and verified against the current tree; none warrants a full narrative.

| # | Finding | Location | Cost & fix |
|---|---|---|---|
| 41 | `billingAddressSnapshot` is populated with the *shipping* snapshot; `createUserOrder`'s input type has no billing field at all, and no billing address is collected anywhere in checkout. Not out of scope — `AddressType.billing` exists and the seed creates a distinct `buyerBilling`. | `checkout.data.ts:391` | Orders permanently assert the wrong billing address; a chargeback is defended with fabricated evidence. Collect billing (defaulting to shipping) and snapshot it. `docs/schema-reference.md:66,842`. |
| 42 | `attributeItemDiagnostics` attributes at *lot* granularity while `calculateLotDiagnostics` emits at *lot-item* granularity. The test claiming to verify this uses a fixture where no two items share a lot, so it passes either way. | `cart-traceability.assembler.ts:88` | Customer A sees a critical diagnostic caused by customer B's line. Key by `lotItemId`; fix the fixture so it can fail. |
| 43 | **Half resolved.** An outbox event with zero matching listeners is still marked `processed`. The hand-maintained `supportedEventTypes` Set the finding named is **gone** — `domainEventListenerRegistry.getListenersFor` now asks each listener's own `supports()` predicate, so the parallel-list drift risk is closed. The silent-success outcome is not. | `domain-event-dispatcher.ts:146,157` | Add a distinct "unhandled" outcome rather than `processed`, so a mis-registered listener is visible instead of silently succeeding. |
| 59 🆕 | A roll over moved to the terminal `resolved` status (an explicit operator write-off, ADR 0005) stops matching `listOriginalDemand`'s `rollOvers: { none: { status: "open" } }` clause, so the cart item re-enters the original-demand pool at its **full original `UserOrderItem.quantity`** on the next operation — sourcing a second time demand that was deliberately written off. Surfaced by the closure's end-to-end run; verified independently. | `operation-execution.service.ts:340`; `roll-over.service.ts:125` | Supplier over-ordering with no diagnostic, because the `RollOver` row itself looks healthy. Add a third clause excluding items with a `resolved` roll over — but note the closure plan deliberately made these two exclusion clauses a load-bearing pair (both comments say so), so the third needs its own conservation argument. `simple-grill` sized. |
| 46 | Bare `catch { notFound(); }` around two API calls converts DB outages and Zod output-parse failures into 404s, unlogged (`createCaller` has no `onError`). | `(storefront)/my-orders/[orderId]/page.tsx:103` | Incidents are invisible; users are told their order does not exist. Catch and rethrow non-`NOT_FOUND` errors. |
| 47 | `updateCheckoutPaymentMethod` lets a user rewrite `type` on the provider-managed MercadoPago method, breaking the `find` half of `findOrCreateMercadoPagoPaymentMethod` (which requires both `type` and `provider` to equal `"mercadopago"`). | `checkout.data.ts:337` | A new `PaymentMethod` row is created on every `checkout.start()` thereafter — unbounded growth. Exclude provider-managed rows from user updates. |
| 48 | `PaymentProviderEvent` is a second hand-rolled inbox (`status`/`retryCount`/`lastError`) beside the outbox, duplicating the outbox's claim/retry/audit machinery (#10 fixed its failure-bookkeeping bug in place rather than by consolidating the two inboxes). | `payment.data.ts:320` | Record receipt, publish a domain event, and let the dispatcher's claim/retry/audit machinery drive reconciliation. |
| 49 | `PaymentGatewayPort` has one implementation (the mock) and one caller, and the only production provider routes around it — provider identity then leaks back into the generic result builder as a `provider === "mercadopago"` ternary. | `payment-gateway.ts:36` | The typed interface constrains nothing about the code that takes money. Model both outcomes (`captured` \| `redirectRequired`) so MP is an adapter behind the port. #26 was closed by swapping the implementation on `APP_ENV` instead, which does not need this shape — but this is still the shape that would make the port earn its keep. |
| 50 | `checkout-client` mirrors server state into `useState` seeded by a ref-guarded effect, then hand-splices it in four near-identical `setCheckout` blocks. | `(storefront)/checkout/_components/checkout-client.tsx:119,149,171,192,216` | ~86 lines of manual cache maintenance; any fifth mutation must add a fifth splice or serve stale data. Use `utils.checkout.getState.invalidate()` — which is why #55 is kept, not deleted. |
| 51 | `ConfigEditor` mirrors three props into state and re-seeds them in an effect, so `invalidatePayments()` after an adjacent mutation resets a form the admin is editing. | `payments-admin-client.tsx:269` | Initialize state directly and remount via `key={config.id}`; removes the effect, the nullable `settings`, and a defensive branch. |
| 52 | `profile.router.ts` is the only router in the repo that queries and mutates Prisma directly; no `profile.service.ts`/`profile.data.ts` exists. It writes `User` rows with no service boundary and no audit entry. | `profile.router.ts:25,41` | Audit logging or soft-delete filtering added at the service layer will silently not apply here. Extract a service/data pair. |
| 54 | `payment.service.ts` is the only admin service writing `db.auditLog.create` raw and outside the transaction; every sibling uses `writeAdminAuditLog` — and this same file uses it correctly two functions away (`:101`, `:173`), so the inconsistency is internal. | `admin/payment.service.ts:117,136` | Audit rows survive a rolled-back mutation. Use the shared helper inside the transaction. |
| 55 | **Deliberately kept.** `checkout.getState` is a near-copy of `start` (differing only in the `atCheckout` write and find-vs-create), exposed on the router with **no caller** anywhere in `src/` or `e2e/`. | `checkout.router.ts:20`; `checkout.service.ts:421` | It is the only query procedure on the checkout router and #50's fix needs something to invalidate. Resolve #50 first, then delete it or parameterize `start({ claimCart })`. |
| 56 | `domainEventTypeSchema` re-lists every event literal the discriminated union already carries; its only referent, `DomainEventType`, has **zero consumers** (re-verified). | `domain-events.schemas.ts:367`; `domain-events.types.ts:11` | A new event must be added in two places, and forgetting the second produces no error — a live risk now that the fulfillment series added a dozen event types. Delete both; `DomainEventInput["type"]` yields the same union. |
| 58 | `lodash` (0 imports) and `bluebird` (0 imports, no `@types`) are declared and never used. `dayjs` is **live** — `date.helpers.ts` imports it plus the `utc` and `timezone` plugins and 17 files consume that module; the original finding's claim that it was dead was wrong and is corrected here. | `package.json:44,51` | Dead weight in the dependency graph and lockfile. Remove `lodash` and `bluebird`; keep `dayjs`. |

## 6. Themes & Systemic Observations

**1. The money path has a verification layer now — assembled from checks, not features.** The original theme was that nothing *noticed* when the money was wrong. The outbound half closed with #29 (preference total asserted against the recorded amount) and #25 (the submit guard reading the value it was supposed to read); the inbound half closed on 2026-07-28 with #30 (amount/currency/refund assessed before any transition into `completed`), #27 (pricing refuses to guess, and incoherent terms are rejected at write time), #28 (uniqueness on the cart→order edge) and #26 (no mock capture in production). Every one of them is a *check*. What is still missing is the assertion that binds them: *"sum(preference items) == UserTransaction.amount == sum(priceSnapshot line totals)"* end to end, which is #1's remaining half — each check now guards its own edge, and nothing yet guards the composition.

**2. Fixing a dead guard promotes every latent defect behind it.** #25's block had never executed, which is why #31 scored as latent and the review said to land them together. It did not happen, so #31 became a live rollback of captured payments before it was closed on 2026-07-28. **This is the generalizable lesson**: when a fix un-blocks unreachable code, the review's "latent" annotations on that code become live findings in the same commit. The corollary showed up while fixing #31 itself — the review's stated remedy (filter the `cartItems` include) was insufficient, because an item *added* during the payment window passes that filter; only driving the transition from the order snapshot closes both directions.

**3. Guards that only select a label, never block.** `hasOperationalLinks` (#33, now closed) read like a safety check and was a formatting parameter. The quantity branch beside it (#32) still has no guard at all — and it sits four lines from a removal branch that *is* lineage-aware. `canProcessUnsigned` (#36, closed) was computed and then ignored in favour of a string match. The pattern is a thing shaped like a control that controls nothing; two of three instances are fixed, and #32 is the survivor.

**4. Read-time diagnostics stand in for write-time invariants — now only at the edges.** The fulfillment series moved the centre of this: `planCutAbsorption` enforces conservation in the planner, `recomputeOperationCounters` rewrites counters from records in the same transaction, and the diagnostics became a monitoring layer rather than the primary control. What was not moved is the `CartItem → CartItemLotItem` direction (#16) and the admin quantity edit that violates it (#32), plus the `onDelete: Cascade` on the lineage relations. The right pattern now exists in the codebase; it just has not reached the admin cart editor.

**5. Shared helpers exist and are bypassed — essentially closed.** #5, #6, #8, #20, #21, #22, #39, #40 all landed. #54 (`writeAdminAuditLog`) is the remainder, and it is a two-line fix in a file that already imports the helper. Two observations from doing it are worth keeping:
- **Drift does not reliably run copy → shared.** #22's drift ran the *other* way: the shared helper carried the wrong copy and the local copies were correct, so importing the shared version naively would have regressed three live admin forms. A codemod that assumes the shared symbol is canonical would have shipped that regression silently.
- **The compiler enumerates the call sites for free, but only per-symbol.** Every consolidation deleted a local symbol, so `tsgo` listed every miss — provided the deletion happened while the blast radius was still one symbol wide. That, rather than a lint rule, is what made a 77-file change mechanical.

**6. Concurrency is defended thoroughly in one subsystem and nowhere else.** `runSerializable` is now the single entry point for twelve `Serializable` fulfillment commands with a bounded P2034 retry — genuinely good. Cart and checkout still run at default Read Committed with read-then-write patterns; #28 closed its edge with a code-level live-order lookup plus an owner-applied partial unique index, but #13's cart/cart-item uniques remain, and neither path uses `runSerializable`. The gap widened rather than narrowed: the team demonstrably knows the technique and has now built the infrastructure for it, and the paths users actually hit concurrently still do not use it.

**7. Schema changes ship via `db:push`, and migrations are owed.** Every fulfillment phase applied its schema change with `pnpm db:generate` + `pnpm db:push` and deferred the migration file. `prisma/migrations/` holds exactly one folder. This is a deliberate, recorded decision for a pre-production app, and it is a real deployment risk to retire before the first production deploy — the findings whose fix *is* a constraint cannot land without a migration path either — #28 shipped its index as a standalone SQL file under `prisma/sql/` for the owner to apply, and #13 is expected to ride along in the same family.

## 7. Commendations

Sparse and specific — these are worth preserving.

- **🟢 Authorization plumbing is genuinely solid**, and the one gap in it (#7, within the admin tier) is now closed by a server-enforced rank hierarchy with a last-active-superadmin guard.
- **🟢 Ownership scoping is consistent.** Cart, checkout, orders and tracking data layers all carry `userId` in the Prisma `where`.
- **🟢 Webhook signature validation is done properly** — `x-signature`/`x-request-id` HMAC via the SDK's `WebhookSignatureValidator` with a 300s tolerance, rejecting with 401 and persisting a `rejected` event. The accept/reject decision is now a tested pure function rather than a Spanish substring match.
- **🟢 Money is `Decimal(18,2)` in Postgres throughout** — no `Float` columns anywhere. Float usage is confined to in-memory computation.
- **🟢 `runSerializable` is exactly the right shape** — one module owning isolation level and P2034 retry, twelve call sites, `grep "TransactionIsolationLevel.Serializable" src/` returns exactly one hit. This is the concurrency infrastructure #13 should be built on.
- **🟢 Aggregate status is derived, not carried.** `deriveFulfillmentStatus` is a pure function over a lineage snapshot with 17 fixture cases; the projector loads, derives, writes. The decision *not* to add a monotonic guard is reasoned in ADR 0002 rather than assumed.
- **🟢 The payment decision layer is now pure and tested.** `mercadopago-preference.decision.ts`, `mercadopago-reconciliation.decision.ts` and `webhook-signature.decision.ts` hold the branching logic with no I/O, each with its own suite. This is the pattern the rest of #1 should follow.
- **🟢 The preference now fails loudly on a money mismatch** — integer-cents accumulation, an equality assertion against the recorded amount, and a currency check, throwing `MercadoPagoPreferenceInvariantError` before any API call.
- **🟢 `shouldApplyStatus` correctly protects `completed`/`refunded`/`chargedBack` from backward transitions** — the status machine understands terminal states.
- **🟢 The charged amount is computed server-side.** `checkoutConfirmInputSchema` accepts no amount; the total is derived from the DB cart.
- **🟢 `PaymentProviderEvent` dedupes on `(provider, providerEventId)`** — webhook replay does not create duplicate rows.
- **🟢 MercadoPago return pages are inert by design**, matching ADR-0001, and say so in the UI.
- **🟢 Strict TypeScript, honoured.** `strict` and `noUncheckedIndexedAccess` are both on and `pnpm typecheck` passes clean across 542 files — no `ignoreBuildErrors`, no suppression comments at scale.
- **🟢 The fulfillment work documents its own drift.** Every phase enumerated what it did not verify and what its seed no longer matched, rather than declaring completion. §22's three defects were found *because* someone built the fixtures and ran the chain.

## 8. Refuted Candidates

Recorded so they are not re-investigated. Each was raised by a finder angle and killed by a verifier.

| Candidate | Verdict | Why |
|---|---|---|
| Zustand `persist` causes a hydration mismatch because it rehydrates synchronously at module scope with no `skipHydration` | **REFUTED** | The synchronous-hydration premise is correct, but `persist` pins `api.getInitialState` to the pre-hydration object *before* `hydrate()` runs. React's `useSyncExternalStore` uses that as `getServerSnapshot`, so the hydration render sees `hasHydrated: false` and matches the SSR HTML exactly. The `hasHydrated` gate is the correct working pattern here. |
| `BETTER_AUTH_SECRET` is optional outside production, so sessions are signed with Better Auth's published default secret and are forgeable | **REFUTED** | Three independent barriers: Better Auth auto-reads `env.BETTER_AUTH_SECRET` even when not passed to `betterAuth()`; it *throws* on the default secret when `NODE_ENV === "production"`; and `next start`/`next build` force `NODE_ENV=production`, under which `env.js` makes the secret a required `z.string()` and the build fails without it. Residual (not worth a finding): the schema doesn't *enforce* it in dev. |
| Cart mutability during `atCheckout` causes the webhook to throw and roll back a captured payment | **REFUTED as live at review time; now CONFIRMED live** | The mechanism was always real; the code was unreachable because #25 made the enclosing block dead. #25 is fixed, so this is live. Folded into **#31**, whose urgency note records the escalation. |
| The `error.reason` substring in the webhook signature branch is an injection vector | **REFUTED as live** | `SignatureFailureReason` is a **closed enum of six ASCII PascalCase values** in the installed SDK, and `error.reason` is typed to it, not to `string`. No value contains "procesada". It was one `pnpm update` away from live, which is why #36's fix was structural rather than a reworded string — and the substring branch is now gone entirely. |

## 9. Suggested Remediation Order

**Batches A and B — ✅ done (2026-07-28).** `#31 + #10`, then `#30 + #27` (with #1's MOQ/step characterization slice), `#28` and `#26`, followed by `#15` pulled forward out of Batch D because it is the natural landing place for #31's deeper half. See §10.1 and `docs/plans/implementation-plan-payments-checkout-remediation.md`. **#13** (which the review suggested riding along with #28's migration) was **not** picked up — the SQL file family is there to extend.

**Batch C — demand integrity in the admin cart editor.**
**#32** (refuse quantity edits on paid orders) and **#16** (write-time conservation guard + `onDelete: Restrict` on the lineage relations). These are the same transaction and the same mental model, and the fulfillment series already built the compensating machinery they should delegate to. **#59** (the `resolved` roll over re-entering aggregation) belongs here too but wants its own conservation argument first.

**Batch D — reliability.**
**#11** (outbox backoff + a drain that does not depend on user traffic + a requeue procedure) and **#43** (an "unhandled" outcome instead of `processed`). Its third member, **#15**, already landed with Batches A/B.

**Batch E — the domain question.**
**#60** (pooled vs per-item supplier MOQ). Not code until someone answers it. A `simple-grill` produces the answer and the CONTEXT.md entry in one pass.

**Batch F — hygiene, opportunistic.**
**#19** (`pnpm check:write`, ignore the vendored paths, then wire CI) unblocks using the gate at all, so it is worth more than its risk score. **#13** rides along with #28's migration. **#54, #52, #46, #47, #51** are each an afternoon. **#50** should land before **#55** is deleted. **#56** and **#58** are deletions.

---

## 10. Resolved — Consolidated Log

**38 of 58 original findings are resolved.** Everything below was closed across nine sessions between 2026-07-22 and 2026-07-28. The per-finding narratives and the thirteen individual session logs that used to occupy §5 and §10–§22 of this document have been collapsed into the tables below: **what was resolved, and what was decided**. The full per-phase engineering record for the fulfillment series (Phases 0–5 and the closure) lives in **`docs/architecture/features/fulfillment-lifecycle-actions.md` §21**, which was always its primary source; ADRs **0002–0006** carry the decisions that outlived their phase.

### 10.1 What was resolved

| # | Finding | What was resolved, and what was decided |
|---|---|---|
| 2 | Validity-window helper shifts dates by TZ offset | One TZ-pinned helper pair in `date.helpers.ts` (`BUSINESS_TZ = America/Argentina/Buenos_Aires`) replaced 4 copies and 20 naive `new Date(input.x)` parses. **Decision:** no backfill — each prior edit compounded the shift, so no automated correction is safe; drifted rows are fixed manually. Stored instants shift by the deploy's TZ delta, and that *is* the fix. |
| 3 | `fulfillmentStatus` written from the data layer | `softDeleteCartItem` became `setCartItemLifecycle`, writing only `deleted`/`status`. **Decision:** the cancellation `fulfillmentStatus` write is now **asynchronous** (outbox → projector) rather than synchronous, which makes the projector's evidence check meaningful instead of circular. |
| 4 | "Has operational lineage" computed 4 ways, 2 definitions | One `hasFulfillmentLineage` beside its `_count` select; the two output count fields collapsed to `hasLineage: boolean`. **Decision:** `trackingEvents` deliberately **excluded** — they are history, not lineage. Consequence: an item whose only link is a tracking row now classifies as `dropped`/`removed` rather than `cancelled`, and becomes hard-deletable. `CONTEXT.md` was updated to make the term unambiguous. |
| 5 | Cart-total aggregation written 3× | One `buildCartSnapshot` in `commerce.helpers.ts` used by the store and both services (87 net lines removed). **Decision:** arithmetic and rounding byte-preserved; the store keeps its own name sort, since callers own display ordering. |
| 6 | Terms validity predicate implemented 5× | `services/_base/terms-validity.ts` owns both dialects — in-memory predicates and the Prisma `where` builder — for all 5 sites. `cart.service.ts` threads a single `now` per request. `operation-assignment.helpers.test.ts` passed **unedited**, which is the evidence the extraction was behaviour-preserving. |
| 7 | Admin can self-promote / lock out all superadmins | `user.authz.ts` enforces a rank hierarchy server-side across create/update/softDelete/hardDelete, including a last-active-superadmin guard covering the `update({ active: false })` lockout path. **Decisions:** role writes that previously succeeded now throw `CONFLICT`, and a single-superadmin environment can no longer demote or delete that superadmin — recovery is to create a second one first. **UI gating was skipped**: `authClient.useSession()` does not expose a typed `role` (Better Auth `additionalFields` do not reach the client's `$Infer`ed session type), so an admin still *sees* "Superadministrador" in the dropdown and the server rejects the write. Affordance-only gap. |
| 8 | `mapServiceError` copy-pasted into 16 routers | One definition in `api/_shared/map-service-error.ts` with an exhaustive switch. **Decision:** `RELATION_BLOCKED` now maps to `PRECONDITION_FAILED` instead of collapsing to `CONFLICT` — verified no client branches on the error code. |
| 9 | 7 CRUD clients (~2,668 lines) structurally identical | `useCrudPageState`, `useCrudEntityPage` and `<CrudEntityPage>` now drive all seven standalone clients and all three `product-terms` panels; per-entity wording is a typed `CrudEntityCopy`. **3,677 → 2,000 lines**; Biome errors in the touched directories 9 → 0. **Decisions:** the form-dialog prop rename was **skipped** (render props already decouple the shell, so it bought nothing across seven more files); `useCrudEntityPage` takes **already-called** query/mutation results, because the natural `{ router: api.admin.brand }` design silently collapses every entity generic to `{}` and the closure variant trips `useHookAtTopLevel`. Hooks are called by the client; the shared hook only receives their results. Also fixed on the way: `address` hard delete now requires typed confirmation, and several delete-confirmation strings now name the record. **Refutation recorded:** the terms-panel copy difference ("lot items" vs "cart items") is **not** drift — each string tracks its own service's relation guard. Do not re-report. |
| 10 | Webhook swallows reconciliation errors and rolls back its own failure state | The `failed` provider-event write moved **out** of the transaction it was rolling back: `reconcileMercadoPagoPayment` wraps the `Payment.get` + `db.$transaction` in try/catch and writes `status: "failed"` + `lastError` on the plain `db` client before rethrowing (mirroring `DomainEventDispatcher.handleFailure`). The webhook route imports `appLogger`, logs `mercadopagoWebhookReconciliationFailed`, and returns **500** instead of 202. **Decision:** the 5xx makes Mercado Pago retry, and that is intended — the event row records each failure and admin `reprocessEvent` is the manual drain. The one deliberate asymmetry: an **amount discrepancy** (#30) returns **200** with a `failed` event, because re-fetching would yield the same mismatch forever. |
| 12 | `fulfillmentStatus` regresses on outbox retry; `exceptionResolved` stuck | Subsumed by #14's derivation rather than fixed directly. **Decision:** **no monotonic guard**, contrary to the review's stated fix — derivation makes a retry idempotent by construction, and a legitimate regression (a roll over cutting allocated demand) must be able to move the status *down*. The `where` keeps only `fulfillmentStatus: { not: derived }`, which avoids a pointless write, not a regression. Derivation is total, so a stale `exception` clears the moment no `delayed`/`failed` record remains and no `exceptionResolved` target was needed. ADR 0002. |
| 14 | Aggregate status is last-event-wins | `CartItem.fulfillmentStatus` stopped being *carried* by the arriving event and is now *recomputed* from live lineage: a single-round-trip snapshot loader plus a pure `deriveFulfillmentStatus`, with the whole per-event evidence machinery deleted. **Decision:** the customer timeline's history-derived stage walk is **deliberately not unified** with the column — the journey is computed from history and the column from live lineage, they are allowed to diverge, and `docs/tracking-architecture.md` says why. `trackingStatusProjectionSkipped` kept its name and changed meaning: it now fires when an arriving event implies a stage *ahead of* the derived status. |
| 15 | The payment→submit transition is duplicated per gateway | One `submitOrderForCompletedPayment` in `services/payments/order-submission.service.ts`, consumed by both the checkout mock branch and MP reconciliation, over a pure `order-submission.decision.ts` (`buildSubmittedToOrderEventKey`, `buildSubmittedToOrderEvents`) under test. Both local key-builder copies deleted; `submitCartItems` deleted with its last caller. **Decision:** the transition is driven by the **order snapshot ∩ live cart items**, not by the cart sweep — see #31. `quantity` still comes from the cart-item row, preserving the published payload bytes, and the key format is locked by a literal test (`checkout:order:7:transaction:11:cartItem:3:submittedToOrder`). |
| 17 | `syncLocal` unbounded input, serial queries in a txn | `.max(200)` on both array inputs; two batched `findMany` reads hoisted out of the loop into one `Promise.all`. **Correction:** it was **four** serial queries per item, not three — `findActiveCartItemByTerms` was issued twice. **Decision:** a >200-item local cart now fails the login merge with a toast and is **not** retried (`bootstrapCompleted` is set before the mutation fires) — accepted, since the bound is itself the abuse fix. |
| 18 | Unbounded admin list queries, phantom `pageSize` | All four entities paginate in SQL over narrow summary selects that no longer join `Cart`/`User`/`Product`/`Destination`; `getStats` became exact `count`/`groupBy`/`aggregate`; `operationsCart.list` gained a `{ items, page, pageSize, total, pageCount }` envelope. **Decision:** the two computed-filter paths and `getStats.withDiagnostics` are capped at `DIAGNOSTIC_SCAN_LIMIT` (1000) and the cap is **surfaced, never silent** — `truncated` renders a note by the pager and on the stat card. **Correction:** `operationsCart.list` had a second, unlisted consumer (`cart-traceability-search-card.tsx`), migrated in the same pass. |
| 20 | `selectProductImage` defined 5× with two behaviours | One context-parameterized `selectProductImage(product, "cart" \| "catalog")`. **Decision:** **no default for `context`** — a default would reinstate the ambiguity the finding names; and precedence is preserved per context, because two cart-side call sites feed the persisted `productSnapshot` JSON and flipping them would have diverged stored data silently. **Corrections:** there were **six** copies, not five (`prisma/seed.ts:159` is the sixth, still open); and `termsToClientTerms` was duplicated **four** times, not two — `mapTerms` and `mapPreviewTerms` are byte-identical bodies under different names. |
| 21 | `decimalStringSchema` redeclared in 5 schema files | `decimalOutputSchema` hoisted into the neutral `schemas/_schema-helpers.ts` — the contract is Prisma serialization, not a CRUD concept. **Correction:** **seven** declarations existed; only five were duplicates. `tracking.schemas.ts` (bare `z.string()`) and `domain-events.schemas.ts` (regex-validated) share only the name and were deliberately left. |
| 22 | Local `requiredText`/`optionalUrl` copies — already drifted | All local copies deleted in favour of `_crud-schema-helpers.ts`. **The drift ran the opposite way from the finding's implication:** the *shared* helper was the outlier (unaccented, 1 site against 4), so importing it naively would have regressed copy on three live admin forms. The shared messages were moved to the accented convention **first**, then the copies deleted — which made the dedup behaviour-preserving. One contract change: `brand`/`product` `description` widened `.optional()` → `.nullish()`, normalized in the component through the pre-existing `toInlineBrandValues` helper. **Correction:** `optionalUrl` was in three files, not five. |
| 23 | Forbidden domain names in the admin UI | The two badges now read `Asignacion de demanda #…` and `Asignacion empaquetada #…`. **Decisions:** **unaccented deliberately** — every sibling badge in the same array is, and #22's accent decision applies to validation messages, not here. The deeper half — renaming the Prisma models `CartItemLotItem` → `DemandAllocation` and `PackageAllocation` → `PackagedAllocation`, 73 and 59 call sites plus a migration — **remains open** and deserves its own PR. |
| 24 | `/my-operations` overloads the reserved term "Operation" | Both pages moved to `/my-orders`; headings read "Mis pedidos". **Decision:** **no redirect was added**, explicitly — `/my-operations` 404s for any bookmark or previously emailed link; `next.config.js` is where a `permanent: true` redirect goes if that call changes. **Correction:** nine external referrers plus two self-links, not eight — and four hold the path in a ternary-assigned `const`, so an `href="/my-operations"` grep misses them. |
| 25 | **MP payments never submit the order (dead guard)** | **Closed 2026-07-24 by `74437ed`, outside any planned remediation session.** The submit decision moved into a pure `shouldSubmitOrderAfterMercadoPagoReconciliation({ completedAt, status })` that reads the **pre-update** `attempt.completedAt`, with `submitOrderAfterCompletedPayment` receiving the pre-update attempt. Covered by `mercadopago-reconciliation.decision.test.ts`. **Consequence, and the reason it is called out here:** the review said to land this with #31 and #10, and it landed alone — so #31's throw is now live. See §5.2 #31. |
| 26 | The mock payment gateway approves real orders in production | `paymentGateway` is now environment-selected: `env.APP_ENV === "production"` constructs an `UnavailableGateway` whose `capturePayment` returns `failed` / `gateway_unavailable` (no throw — it flows through the existing failed-order branch). `createPaymentMethod`/`updatePaymentMethod` throw `PRECONDITION_FAILED` in production, the checkout method list is filtered to `provider === "mercadopago"`, and the user-facing input schema lost the `mercadopago` type (`checkoutPaymentMethodCreatableTypeSchema`) so a self-made method can no longer enter the MP branch. **Consequences:** the typecheck caught the client form, whose `mercadopago` option was removed; the Mercado Pago method no longer offers an "Editar" action, since it is provider-managed. **Affordance-only gap kept:** the "add payment method" dialog is still rendered in production and the server rejects the write (same shape as #7). **Depends on §10.2-4a** — if `APP_ENV` reads `development` on a real deploy, this guard is inert. |
| 27 | Null `stepPrice` silently charges the flat MOQ price | `calculateLineTotal` throws `PricingConfigurationError` when the terms define a positive `step`, no `stepPrice`, and the quantity exceeds the MOQ — the configuration that used to return the flat MOQ price for ten times the goods. `validateStepCoherence` (chained on both the create and update admin schemas, never on the base object — `.superRefine` returns a `ZodEffects` that cannot be `.extend`ed) stops new incoherent rows. `commerce.helpers.test.ts` gained the MOQ/step characterization matrix, including the review's exact 10× scenario. **Decision:** no backfill; the precheck query ran clean on the dev database and is a **hard deploy gate** for any other database — this is a shared client+server module, so a bad live row now throws during cart interactions in the browser. |
| 28 | One cart can create multiple payable orders | `confirmAndPay` looks up the live order for the cart (`findLiveOrderByCartId`, `status NOT IN (cancelled, failed)`) before creating anything and returns a discriminated `prepared` union. A live attempt that is completed, in process, still-payable pending, refunded or charged back is **returned as-is** (browser-back re-confirm is idempotent); only a **spent** attempt — failed, cancelled, or expired-pending — mints a new `UserTransaction` on the **same** order, per `docs/plans/mercadopago-checkout-admin.md:199-201`. A `PRECONDITION_FAILED` cart-status assertion guards the create path only, never the reuse path. **Decision:** order snapshots are immutable on reuse — changing address or items requires `checkout.leave`. `prisma/sql/2026-07-user-order-live-cart-unique.sql` holds the partial unique index as a DB-level backstop, **owner-applied** (§10.2-1; `db:push` cannot express partial uniqueness); a `P2002` from the create path maps to `PRECONDITION_FAILED`. The index is inert until applied — the code is the primary control. |
| 29 | MP charged amount diverges from recorded amount | **Closed 2026-07-24 by `74437ed`.** Preference lines are now one-per-item at `quantity: 1, unit_price: lineTotal` — no float division, no independent quantity rounding — and `buildMercadoPagoPreferenceCreateData` throws `MercadoPagoPreferenceInvariantError` unless the integer-cents preference total equals the recorded `UserTransaction.amount` and every line carries the attempt's currency. Surfaces as `PRECONDITION_FAILED` before any API call. Covered by `mercadopago-preference.decision.test.ts`. **Note:** this asserts serialization fidelity only — it cannot catch both sides computing the same wrong number, which is #27. |
| 30 | Reconciliation never verifies the amount actually paid | `assessMercadoPagoPaymentAmounts` (pure, in `mercadopago-reconciliation.decision.ts`, compared in integer cents like the outbound preference invariant) gates **every transition into `completed`** — including the recovery from `failed`/`cancelled`, which is why it keys off the *would-apply* status rather than `payment.status === "approved"`. A non-match keeps the current status, skips submission, records `failureCode`/`failureMessage`, and writes the provider event as `failed` **without throwing** (HTTP 200 — retrying would re-read the same mismatch). A corrected re-fetch heals the flags, and only codes this module owns are cleared. The admin attempt detail now renders the failure fields. **Decision (A5):** a partial refund is handled as a **blocking discrepancy**, not a new `partiallyRefunded` transaction status — the safety property is "never settle as clean `completed`". On an already-completed attempt it flags without regressing `completedAt`. The dedicated enum is deferred: it ripples through `user-order-closure.ts`, `order-display.ts` and the admin mappers, and the assessment already classifies the case distinctly, so only the write side would change. |
| 31 | The cart stays writable during checkout — the latent throw is now live | Reconciliation no longer loads the live `cart.cartItems` relation at all: submission is driven by `UserOrder.items ∩ live cart items`, so an item **added** mid-payment is neither submitted nor published nor able to throw, and one **removed** mid-payment no longer earns a phantom event. **This deliberately overrides the review's stated fix:** filtering the include to `{deleted:false, status:"inCart"}` does *not* stop the rollback — an item added during the payment window satisfies exactly that filter and still has no `UserOrderItem`. The defensive `INTERNAL_SERVER_ERROR` is kept, now unreachable by construction. The cart is also frozen: `assertCartMutable` rejects `setItemQuantity`/`removeItem`/`clear`/`syncLocal` on an `atCheckout` cart with `PRECONDITION_FAILED`. **Decision, load-bearing:** the freeze shipped **with** its escape hatch `checkout.leave` in the same change — nothing else ever exits `atCheckout` except a completed payment, so the freeze alone would permanently lock any cart that ever visited `/checkout`. `leave` cancels the pending attempt and its order (blocked while a payment is `inProcess`) and returns the cart to `pending`; a late payment on the cancelled preference still recovers, because `shouldApplyMercadoPagoPaymentStatus("cancelled", "completed")` is `true` and submission is snapshot-driven (ADR-0001). |
| 33 | Cancelling allocated demand creates no roll over | Every Phase 1 path that removes quantity from a live allocation now creates `RollOver(stage: postAllocation, status: open)` for exactly that quantity in the same transaction — confirm-below-requested (absorbed by `planCutAbsorption`, LIFO by payment date or an operator override), confirm-at-zero, `cancel`, and `cancelLine`. **Decision:** conservation is enforced in the planner (`Σ removedQuantity === cut`, invalid override sets throw `CONFLICT`) and observable through `recomputeOperationCounters`, which rewrites the six live counters from records in the same transaction. Three diagnostic rules were corrected because Phase 1 produced the first runtime `cancelled` lots and would have reported findings on a correct system. ADR 0003. |
| 34 | Rolled-over demand excluded from all future operations | Both exclusion clauses of `listOriginalDemand` were narrowed, in two phases: the roll over clause to `{ none: { status: "open" } }` (Phase 0) and the allocation clause to "no allocation on a live lot item of a live lot" (Phase 2). `includeRollOver` now defaults **on** in both the Zod schema and the Prisma column, so leaving paid demand unsourced requires an explicit opt-out. **Decision, load-bearing:** the two clauses are a pair — the allocation clause alone would double-count a supplier-cancelled item, the roll over clause alone would strand a compensated one. Both sites carry a comment saying so; **do not weaken either without the other.** (The `resolved`-status gap this leaves is now finding #59.) |
| 35 | Cart survives logout, merges into the next user's cart | Four layered defences: `decideCartBootstrap` refuses to merge a cart attributed to another user (`discard` evaluated first, since in the leak case both merge conditions also hold); the logged-out effect branch wipes an attributed cart on any RSC re-render — **the load-bearing one**, as it is the only defence covering session expiry, a cleared cookie, or sign-out in another tab; `user-menu.tsx` resets after a *successful* sign-out; and the cross-tab rehydrate path checks identity. **Decision:** persist `version` bumped `1 → 2` with no `migrate`, so zustand **discarded every existing local cart once** — accepted as a one-shot eviction for a pre-production app. `clear()` kept its post-checkout semantics; `resetForNewSession()` is a distinct action. |
| 36 | `APP_ENV` fails open; security branch on a Spanish substring | `APP_ENV` derives from `NODE_ENV` via `env.helpers.js`, and an inconsistent production build **throws at `next.config.js` load time** — a build-breaking change by design, and the fail-open fix. The webhook decision reads a boolean through `resolveWebhookSignatureOutcome`; `rejectedReason` is audit-only and no `.includes("procesada")` remains. A missing webhook secret now gets its own audit message instead of a synthetic `SignatureMismatch` — the accept/reject *outcome* for that case is unchanged, since changing it would break local webhook testing. **Corrections:** the `error.reason` injection vector was **latent, not live** (see §8), and the `allowUnsignedWebhooksInDevelopment` toggle is gated by `superadminProcedure`, not `adminProcedure`, so the escalation story was narrower than the review stated. |
| 37 | N+1 in cart traceability diagnostics | One `findMany` per entity type plus one `distinct` query for shipment tracking-event presence, and the per-item timeline fetches replaced by a pure `groupTimelineByCartItem` bucketing the cart timeline (a strict superset) in memory. The `collectLineageEntityIds` doc comment's promise of batched reads is now true. |
| 38 | Filter dropdowns download whole dimension tables | Three `admin.{user,product,productClientTerms}.options` endpoints taking `search` + `take: 50` + `selectedValue`; `Combobox` gained an opt-in server-search mode and a 250 ms debounce. **Correction:** `ProductCombobox` was **not** "built for exactly this shape" — it takes the whole array and filters client-side, solving the DOM-node count but not the download. **Deviation:** `admin.productClientTerms.list` was **kept**, because the cart edit form needs the full records the lightweight `options` endpoint omits; the *filter* uses the combobox, the *form* keeps the list. |
| 39 | `home-formatters.ts` is a fork of `commerce.helpers.ts` | Shrunk 52 → 19 lines, from a fork to two offer adapters over shared primitives. **The review's stated fix ("delete the fork, import `commerce.helpers`") was insufficient** — `HomeOffer` lacks `step`/`stepPrice`/`max` so it is not assignable to `CatalogClientTerms`, and the two price getters return raw vs formatted strings. The file shrinks; it cannot disappear. One latent behaviour change recorded in a test: the fork's `toNumber` coerced `""` to `0` where the shared one returns `null`. |
| 40 | Duplicated tooltips + copies of a date formatter | Three shared formatters replaced **30 inline `Intl.DateTimeFormat("es-AR", …)` sites across 28 files** (the review said 25), and the private tooltips were deleted. **Decision:** display times are pinned to `BUSINESS_TZ`, changing rendered output for every viewer outside Argentina — its own commit, so it can be reverted without unwinding the formatter consolidation. This closes the read/write asymmetry #2's fix opened. **Correction:** the private tooltips were **not** character-identical — the shared versions are strictly wider. |
| 44 | Sequential creates inside a Serializable transaction | A pure `groupAssignments` pass generates every code, then four bulk `createManyAndReturn` writes in FK order join returned ids by `code`/`lotItemId`; roll overs bulk-insert via filter-then-zip guarded by a length assertion. **~600 statements → ~12** for a 200-item operation. **Decision:** isolation level unchanged — the Serializable window is shorter, not weaker. The roll-over join is index-zip because `RollOver` has no unique code; the assertion turns any future out-of-order return into a loud failure inside the transaction. |
| 45 | `RollOver` has no index covering `status` | `@@index([status, createdAt, id])` declared and `db:generate` run. **Decision:** **no migration was created or applied** — the owner applies it manually. The query is correct either way; the index is inert until then. |
| 53 | `tracking-architecture.md` omits the reconciliation producer | Closed by the tracking-architecture rewrite. "Current Producers" now documents the MercadoPago reconciliation path explicitly, states that it publishes the **same** `cart.item.submittedToOrder` facts with the **same key shape** as checkout, and carries the Supplier Loop and Operation Compensation producers added by the fulfillment series. |
| 57 | Dead `includedSourceRollOverIds.add` | Closed **incidentally** inside #44's rewrite of `materializeRollOvers`, which computes the rebatched id set once from all inputs. |

### 10.2 Cross-cutting decisions carried forward

Five decisions that outlived their session and constrain future work:

1. **Schema changes ship via `db:push`; migration files are owed.** Every fulfillment phase applied `prisma/schema.prisma` changes with `pnpm db:generate` + `pnpm db:push` and deferred the migration file by decision. `prisma/migrations/` holds one folder. Migration baselining is owner-managed out of band. Any fix whose remedy *is* a constraint inherits this — #28's partial unique index ships as `prisma/sql/2026-07-user-order-live-cart-unique.sql`, applied by the owner, with #13 expected to extend that family.
2. **`prisma/seed.ts` drift is enumerated, not fixed, per phase.** The closure realigned and expanded it; the remaining known divergences are listed in architecture §21.
3. **No automated test covers a React component, hook, or route handler.** `vitest.config.ts` is `environment: "node"` with no DOM library and no DB fixture. `scripts/fulfillment-e2e.ts` drives the fulfillment *service layer* against a real database and is a script, not a vitest suite — converting it needs a per-test transactional fixture, which is separate work. Every session's "not verified" list was a manual-check list for this reason.
4. **Two runtime behaviours were never confirmed on a real deploy.** (a) `APP_ENV` deriving to `production` under `pnpm preview` with nothing set — this is what proves #36's fail-open is closed at *runtime* rather than only at build time, and #26's future guard depends on it. If the panel reads `development`, the pipeline is setting `SKIP_ENV_VALIDATION`, under which the assertion is inert. (b) The guest → login cart merge after #35's four defences — the regression that session most risked, covered only by a unit assertion on the decision function, never by the hook that calls it.
5. **Biome's remaining errors were left deliberately, twice.** Auto-fixing them touches vendored shadcn components and config files unrelated to any session's diff. The count is unchanged by design, not by neglect — which is exactly why #19 stays open as a standalone task.

### 10.3 Open remnants from resolved findings

Small pieces left behind by an otherwise-closed finding. None is large enough to be its own numbered finding.

- **`prisma/seed.ts:159` still carries a sixth `selectProductImage`** (#20). The seed does not import from `~/` today; wiring it up means validating the `tsx` alias-resolution path for a standalone script.
- **`checkout.schemas.ts` and `profile.schemas.ts` hold two further `requiredText` copies**, plus `emptyStringToNull` helpers the shared module does not cover (#22).
- **The Prisma model rename** behind #23's deeper half — `CartItemLotItem` → `DemandAllocation`, `PackageAllocation` → `PackagedAllocation`, 73 and 59 call sites plus a migration.
- **The `madge` script in `package.json` reads no TypeScript** — add `--extensions ts,tsx --ts-config tsconfig.json` to both scripts, or it keeps reporting a clean result for a directory it never opens.
- **`DEV_USER_ROLE`** is declared in `env.js`, read nowhere in `src/`, and looks like an auth backdoor without being one. It was added to `.env.example`, which makes the dead config more visible, not less.
- **`operationsCartListSelect` is still the detail select** (#18). Page-bounded now, so its depth costs 25 rows rather than 5,000; narrowing it was deferred.
- **The tracking-page user dropdown** still uses `user.list` with `includeDeleted: true` — the obvious next consumer of #38's `options` endpoint.
- **The 1000-row diagnostics scan cap** (#18) is a stopgap; a computed `diagnosticCount` column or a view would remove it.
