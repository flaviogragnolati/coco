# Implementation Plan: QA Open Tickets Remediation (ciclo de vida, pasada 04/09/2026)

> **Lifecycle:** Working · **Owner skill:** q-code-grill-feature · **Created:** 2026-09-18 · **Implemented (except Mercado Pago part):** 2026-09-18, see §17
> **Source:** `/admin/qa-tickets` (table `qa_ticket`), assigned tickets with status `failed`, `needsClarification` or `blocked` — 27 of 68. Ticket text originates in `scripts/qa-tickets.data.ts` (transcribed from `docs/qa/qa-ciclo-de-vida.md`).

## 1. Objective & outcome

- **Done means:** every defect confirmed from the open QA tickets is fixed and covered by a test; every ticket that failed only because its text is outdated, unclear or environment-bound is rewritten, retired or re-routed; the QA pass can be re-run on the affected codes with a realistic chance of `passed`.
- **Why:** the 04/09 pass left 27 open tickets mixing real bugs with outdated expectations (ADR 0010 removed the mock gateway), vague steps and missing environment setup. Without separating them the QA tracker cannot converge.
- **For:** AI coding agent / developer.

## 2. Alignment reached

### Classification of the 27 open tickets

| Class | Tickets | Handling |
| --- | --- | --- |
| **Bug (confirmed in code / data)** | #30, #33, #16, #48, #61, #45, #54, #69, #3 (residual) | Phases 1–3 (B1–B9) |
| **Outdated ticket** — code is correct | #15, #18, #42, #54 (stage part), #61 ("Recuperar" enabled-then-rejected part), #2 and #3 (fixed by 48f756d / dde6a65 after the note) | Phase 4 rewrite/retire + re-test |
| **Environment / access blocker** | #21, #23, #24, #26, #37 (no `MERCADOPAGO_ACCESS_TOKEN`), #25 (+ needs curl recipe), #38 (tester has no superadmin), #12 and #67 (missing fixtures) | Phase 4 fixtures + required user actions |
| **Steps not understood** | #20, #22, #31, #32, #36 | Phase 4 rewrite |

### Defects

| ID | Tickets | Defect | Evidence |
| --- | --- | --- | --- |
| B1 | #30 | Customer journey never shows its empty state; six pending stages render before payment is credited. `buildCustomerOrderJourneyView` tests `!item.timeline`, but `getUserOrderItemTimelines` returns a timeline for every cart item, even with zero records. | `src/features/tracking/customer-order-journey.ts:164`, `src/server/services/tracking/tracking-event.service.ts:437-480,762` |
| B2 | #33, #61, #48 | Customer notices "Reprogramado…" / "Incidencia de fulfillment" omit the admin-entered reason. The reason is stored in the tracking event `metadata.reason` but the notice DTO has no field for it. The admin exception dialogs promise it is shown. | `tracking-event.service.ts:454-461`, `src/schemas/tracking.schemas.ts:60`, `src/features/tracking/customer-order-journey-view.tsx:46`, `src/features/admin/crud/shipment/shipment-exception-dialog.tsx:90` |
| B3 | #16 | Checkout terms are the literal `"lorem ipsum"`. | `src/server/services/checkout/checkout.service.ts:80,195-202` |
| B4 | #48 | Confirming a supplier-order line at 0 leaves "Confirmar" disabled when "Ajustar reparto" was used first: stale `overrides` stay in the form and the toggle back to LIFO is hidden at 0. | `src/features/admin/crud/supplier-order/supplier-order-confirm-dialog.tsx:248,350-367` |
| B5 | #69 | `resetDemoTransactionalData` deletes every allocation of seeded cart items but lots/lot items/packages only by `*-SEED-*` prefix; hand-made lineage survives with zero allocations and `db:seed-verify` fails. | `prisma/seed.ts:319-520` |
| B6 | #61 | No command recovers a delayed shipment. `shipmentTransitions.delayed` allows `inTransit`, the package recover is gated on "Primero hay que recuperar el envio", but `ShipmentCommandKey` has no `recover`. | `src/shared/common/fulfillment-transitions.ts:142,485,737-757`, `src/server/services/admin/shipment.service.ts` |
| B7 | #45 | Rerun of a completed operation lets the operator switch off "Incluir rollovers"; the server honours it and strands demand the compensation just released. | `src/features/admin/crud/operation/operation-rerun-dialog.tsx:172`, `src/schemas/admin/operation.schemas.ts:117,195`, `src/server/services/admin/operation.service.ts` `rerun()` |
| B8 | #54 | After fractionating a received inbound package, it still shows "Sin fraccionar" and offers quantity that belongs to **another** inbound package covering the same demand allocation. Verified on data: package #160 shows 55 = (218: 30 in #159) + (221: 25 in #159). Outbound allocations do not record their source inbound package, so the per-package budget cannot be attributed. | `src/server/services/admin/package.data.ts:103-146`, `package.service.ts:655-740` |
| B9 | #3 | When guest→login merge is refused (payment in flight / declared receipt), the bootstrap is still marked `done`; the guest items stay only in local storage while checkout can start on the frozen server cart. | `src/features/cart/use-cart-sync.ts:47-58`, `src/features/cart/checkout-start-gate.decision.ts:21` |

### Decisions

| Topic | Decision | Source |
| --- | --- | --- |
| B7 rerun of a completed operation | Force `includeRollOver = true` server-side for the `completed` path; the dialog shows the switch on and disabled with an explanation. `failed`/`cancelled` paths keep the editable default. | user (2026-09-18); `docs/fulfillment-reference.md:246` rationale |
| B6 delayed shipment exit | Add `shipment.recover`: `delayed → inTransit`, packages `delayed → inTransit`, publishes the exception-resolved event. Target derived from the record, not chosen by the operator. | user (2026-09-18); `docs/architecture/features/fulfillment-lifecycle-actions.md:142` |
| B3 terms | Interim: real legal text as a versioned constant (`checkout-v2`). ADR 0009 (`legal_document` table) stays deferred. | user (2026-09-18) |
| B8 attribution | Record the source inbound package on each outbound `PackageAllocation` (`sourcePackageId`, nullable; legacy rows = null fall back to today's capped budget). | user (2026-09-18) |
| Scope | Bugs B1–B9, QA ticket rewrite, ADR 0010 cleanup, QA fixtures. | user (2026-09-18) |

### Rejected options

- Keeping `includeRollOver` editable on rerun and only fixing the doc (rejected for B7).
- Resolving delayed shipments only via receive/deliver (rejected for B6).
- Implementing ADR 0009 now (deferred for B3).
- For B8, a UI-only note without schema change (rejected by user); FIFO attribution of outbound quantity across inbound packages without a schema change: rejected because fractionation is issued from a specific source package, so FIFO would attribute wrongly (package B's fractionation would be charged to A).

### Terminology

No durable term changes. Clarification to carry into ticket text: *fulfillment incident* = "incidencia en preparación/transporte/entrega"; *providerPaymentId* is labelled **"Pago"** in `/admin/payments`.

## 3. Scope

- **In scope:** B1–B9; rewrite of QA ticket text in `scripts/qa-tickets.data.ts` and `docs/qa/qa-ciclo-de-vida.md`; retire #15; ADR 0010 leftovers (mock payment-method seed rows, stale checkout plan text); QA fixtures for #12 and #67; `/admin/payments` hint for the disabled "Reconciliar ahora" (#36).
- **Non-goals:** Mercado Pago sandbox credentials (environment action), superadmin provisioning, `legal_document` table, refunds/cancellation of pending payments on cancelled orders (#67 — intended per ADR 0005), changes to journey stage mapping (#42, #54 stage part are correct).
- **Deferred:** ADR 0009 implementation; a UI to fire signed test webhooks (#25).
- **Must not break:** journey max-stage monotonicity (no regressions); `fractionate` conservation per leg (ADR 0004); rerun compensation atomicity (ADR 0005/0006); `qa:seed` never touches `status`/`notes`/`assigneeId`/`evidence`; `PaymentMethod` model and remembered Mercado Pago / external methods used by checkout.

## 4. Current system context

- Customer journey: `tracking-event.service.ts` builds `UserOrderItemTimeline` per cart item (six stages, notices); `customer-order-journey.ts` rolls items up (`empty` / unified / `perItem`); `customer-order-journey-view.tsx` renders it; page `src/app/(storefront)/my-orders/[orderId]/page.tsx:105-120`.
- Tracking events carry `metadata.reason` for rollover and `fulfillmentException` events (`tracking-event-mapper.ts:103-207`); `timelineTrackingEventSelect` already selects `metadata`.
- Package recovery pattern to mirror: `package.service.ts` `recover()` (1456-1516) → `sideEffects.onPackageRecovered`; shipment disruption: `shipment.service.ts` `markDisrupted()` (926-981) → `sideEffects.onShipmentDisrupted`. Effects live in `src/server/services/admin/operations-effects/`.
- QA tickets: `scripts/qa-tickets.data.ts` (`qaTicketSeedEntries`, `retiredQaTicketCodes`) applied by `pnpm qa:seed` (text only; retire is monotonic).
- Commands: `pnpm test`, `pnpm typecheck`, `pnpm check`, `pnpm db:seed`, `pnpm db:seed-verify`, `pnpm fulfillment:e2e`, `pnpm qa:seed`, Prisma migrations via the project's Prisma CLI scripts.

## 5. Approach

Fix in order of customer impact, each defect as a vertical slice with a failing test first. Pure decision logic stays in the existing `*.decision.ts` / shared helpers so it is unit-testable. Ticket text is changed only after the corresponding fix lands, so re-seeding QA never advertises behaviour that does not exist yet.

## 6. Assumptions

- A1: The reason in `metadata.reason` is safe to show to customers (admin dialogs already say so). Internal-only notes (`package.recover` `notes`) are **not** shown.
- A2: B3 ships with an original placeholder text (structure modelled on typical marketplace terms, Argentine consumer law references); the business replaces it before production.
- A3: B4 root cause is the stale-overrides path; Task 2.1 starts with a reproducing test. If it does not reproduce, investigate the `useFieldArray` `[]` initialisation (react-hook-form 7.77) before changing code.
- A4: Legacy outbound allocations (source unknown) keep today's behaviour.

## 7. File map

| File | Change |
| --- | --- |
| `src/features/tracking/customer-order-journey.ts` | B1: empty when no stage reached |
| `src/features/tracking/customer-order-journey.test.ts` (existing or new) | B1, B2 tests |
| `src/schemas/tracking.schemas.ts` | B2: `reason` on notice schema |
| `src/server/services/tracking/tracking-event.service.ts` | B2: map `metadata.reason` into notices |
| `src/features/tracking/customer-order-journey-view.tsx` | B2: render reason |
| `src/shared/common/checkout-terms.ts` (new) | B3: versioned terms constant |
| `src/server/services/checkout/checkout.service.ts` | B3: use it |
| `src/features/admin/crud/supplier-order/supplier-order-confirm-dialog.tsx` | B4 |
| `src/features/admin/crud/supplier-order/supplier-order-confirm.decision.ts` (new) | B4: extracted `isConfirmBlocked` |
| `src/shared/common/fulfillment-transitions.ts` | B6: `recover` shipment command + state |
| `src/schemas/admin/shipment.schemas.ts` | B6: `shipmentRecoverInputSchema` |
| `src/server/services/admin/shipment.service.ts` | B6: `recover()` |
| `src/server/services/admin/operations-effects/shipment-effects.ts`, `operations-effects.types.ts`, `operations-side-effects.service.ts` | B6: `onShipmentRecovered` |
| `src/server/api/routers/admin/shipment.router.ts` | B6: `recover` procedure |
| `src/features/admin/crud/shipment/shipment-recover-dialog.tsx` (new), `shipment-detail-dialog.tsx`, `shipment-table.tsx` | B6 UI |
| `src/schemas/admin/operation.schemas.ts`, `src/server/services/admin/operation.service.ts`, `src/features/admin/crud/operation/operation-rerun-dialog.tsx` | B7 |
| `prisma/schema.prisma` + new migration | B8: `PackageAllocation.sourcePackageId` |
| `src/server/services/admin/package.data.ts`, `package.service.ts`, `package-fractionation.ts` | B8 |
| `prisma/seed.ts` | B5, ADR 0010 seed cleanup, fixtures #12/#67 |
| `src/features/cart/use-cart-sync.ts`, `src/store/cart-store.ts`, `src/features/cart/checkout-start-gate.decision.ts`, cart page component | B9 |
| `src/app/admin/payments/_components/payments-admin-client.tsx` | #36 hint + column label |
| `scripts/qa-tickets.data.ts`, `docs/qa/qa-ciclo-de-vida.md` | Phase 4 ticket rewrite |
| `docs/fulfillment-reference.md`, `docs/architecture/features/fulfillment-lifecycle-actions.md`, `docs/plans/checkout-redesign.md` | Documentation |

## 8. Phases and tasks

### Phase 1 — Customer-facing defects

**Task 1.1 (B1) — journey empty state.**
- In `buildCustomerOrderJourneyView`, replace `items.every((item) => !item.timeline)` with a helper `hasReachedAnyStage(timeline)` returning `true` when any stage has `status !== "pending"` or the timeline has notices. Empty when no item has reached a stage.
- Test: items whose timelines are all-pending → `{ mode: "empty" }`; one item with `orderConfirmed` current → unified mode.
- Acceptance: #30 — pedido con Pago externo pendiente muestra "El seguimiento comienza cuando se acredita el pago." sin etapas.

**Task 1.2 (B2) — reason in customer notices.**
- `userTrackingTimelineNoticeSchema`: add `reason: z.string().optional()`.
- In `toUserOrderItemTimeline`, set `reason` from `record.metadata?.reason` when it is a non-empty string, **only** for notice kinds `rollover` and `exception` (not `resolved`, `info`, `quantity`).
- `CustomerJourneyNoticeView` gains `reason?: string`; `NoticeList` renders `{label} · {date}` and, when present, the reason on a second line (`text-muted-foreground`).
- Tests: mapper test with a `fulfillmentException` record carrying `metadata.reason` → notice has reason; `rolledOverPostAllocation` with reason → has reason; a `resolved` notice → no reason.
- Acceptance: #33, #61 step 2 — cliente ve el motivo en "Reprogramado…" e "Incidencia de fulfillment".

**Task 1.3 (B3) — checkout terms.** *Done 2026-09-18 with a placeholder text marked "TEXTO DE PRUEBA" (user: not in production yet); replace the text and bump `version` before going live.*
- Create `src/shared/common/checkout-terms.ts` exporting `CHECKOUT_TERMS = { version: "checkout-v2", text: "…" } as const`.
- In `checkout.service.ts` delete `TERMS_TEXT`, use `CHECKOUT_TERMS.text` / `.version` in `buildTermsSnapshot` and the `termsText` returns (`:448`, `:477`).
- Test: snapshot built by `buildTermsSnapshot` carries `checkout-v2` and text ≠ `"lorem ipsum"`.
- Acceptance: #16 — el texto de términos muestra condiciones reales; orders placed before keep their `checkout-v1` snapshot untouched.

**Task 1.4 (B9) — refused guest merge.**
- Add bootstrap state `"blocked"` (with `blockedMessage`) to `cart-store.ts`. In `useCartSync`, `onError` with `data.code === "PRECONDITION_FAILED"` sets `"blocked"`; other errors keep today's `"done"`.
- `canStartCheckout` returns `false` for `"blocked"`; `/cart` shows an alert with the server message and keeps the local items visible as "pendientes de agregar".
- Tests: `checkout-start-gate.decision` for `blocked`; hook-level decision test if one exists (`cart-bootstrap.decision.test.ts`).
- Acceptance: #3 re-test path — with a payment in flight the user sees why the items were not merged and cannot start checkout on the frozen cart.

### Phase 2 — Admin fulfillment defects

**Task 2.1 (B4) — confirm at 0.**
- Extract `blocked` into `supplier-order-confirm.decision.ts` as `isConfirmBlocked(lines, watchedLines)`; write a failing test: overrides seeded for a cut of 5, confirmed then set to 0 → currently blocked.
- Fix: when a line's `confirmedQuantity` becomes `0`, clear `overrides` (`form.setValue(\`lines.${index}.overrides\`, undefined)`) in `LineRow`; at 0 the full line cancels and there is nothing to distribute.
- Acceptance: #48 — línea confirmada en 0 habilita "Confirmar", cancela la línea y crea rollover total.

**Task 2.2 (B7) — force rollovers on completed rerun.**
- `operation.service.ts` `rerun()`: in the `record.status === "completed"` branch, pass `includeRollOver: true` to `createRunningOperation` regardless of input; record `forcedIncludeRollOver: true` in the audit metadata when input was `false`.
- `operation-rerun-dialog.tsx`: when the source status is `completed`, render the switch `checked` and `disabled` with help text "Obligatorio al reejecutar una operación completada: la compensación libera demanda que debe volver a entrar."
- Tests: service test — completed source + `includeRollOver: false` → new operation built with rollovers; failed source keeps the input value.
- Docs: align `fulfillment-lifecycle-actions.md:154,269,318` with `fulfillment-reference.md:246`.
- Acceptance: #45 — el switch está forzado; la nueva operación no queda "Sin rollovers".

**Task 2.3 (B6) — `shipment.recover`.**
- `fulfillment-transitions.ts`: add `"recover"` to `ShipmentCommandKey`; `recoverState()` enabled only when `status === "delayed"`, reason otherwise "Solo se puede recuperar un envio demorado". Export `shipmentRecoveryTarget({ dispatchedAt })` → `"inTransit"` when the shipment was dispatched, else `"readyForDispatch"` (add the latter to `shipmentTransitions.delayed` only if `readyForDispatch → delayed` stays legal — it is, line 141).
- `shipment.schemas.ts`: `shipmentRecoverInputSchema = z.object({ id, notes: optionalTrimmedText })`.
- `shipment.service.ts` `recover()`: mirror `markDisrupted` — load, assert `delayed`, move shipment to the target, live packages `delayed → inTransit` (or `readyForShipment` if target is `readyForDispatch`), lines to `shipped`/`packed`, call new `sideEffects.onShipmentRecovered` (publishes the same exception-resolved tracking event as `onPackageRecovered`), audit `shipment.recover`, `DomainEventDispatcher.wake()`.
- Router `recover: adminProcedure` with the same invalidations as `markDelayed`.
- UI: `shipment-recover-dialog.tsx` (target shown read-only, optional notes); expose from detail dialog and row actions via `availableActions`.
- Tests: transitions unit test for `recoverState`; service test delayed → recovered, packages recovered, a subsequent package `recover` no longer needed; customer notice becomes "Incidencia resuelta".
- Verify field name for dispatch time in `model Shipment` before coding (schema lines ~1040-1060); if none exists, derive from the latest `shipment.dispatch` audit entry or `carrierOrder` status and note it in the PR.
- Acceptance: #61 steps 3–4 — con envío demorado el paquete muestra "Primero hay que recuperar el envio" (deshabilitado con motivo); recuperar el envío vuelve a "En tránsito" y la incidencia figura resuelta.

**Task 2.4 (B8) — attribute outbound quantity to its source package.**
- Migration: `PackageAllocation.sourcePackageId Int?` + relation to `Package` (`onDelete: SetNull`) + index. Only outbound rows set it.
- `fractionate()`: persist `sourcePackageId` from the candidate's `sourcePackageId` when creating outbound allocations. Promotion of a mono-customer inbound package sets it to that package.
- `package.data.ts`: new `packageAllocationRemaining(packaged, sourcePackageId)` = `packaged.quantity − Σ outbound allocations of the same demand with sourcePackageId = this package`; legacy outbound rows (null) are charged through today's `fractionableQuantity` cap. `packageFractionableQuantity` and `collectFractionationCandidates` use it, still bounded by the per-demand budget (keeps §21.6 guarantee).
- Include the new field in the Prisma selects feeding these functions.
- Tests: two inbound packages A (30) and B (40) on the same demand; fractionate B fully → B remaining 0, A remaining 30; legacy null-source rows reproduce current numbers; seed-verify diagnostics unchanged.
- Acceptance: #54 — tras fraccionar todo, el paquete de entrada muestra "No queda cantidad recibida sin fraccionar."

### Phase 3 — Seed integrity

**Task 3.1 (B5).** In `resetDemoTransactionalData`, after collecting seeded cart item allocations, also collect lot items / package lot items / packages that are reachable **only** through allocations being deleted (i.e., lineage whose every demand allocation belongs to seeded cart items) and delete them in FK order, together with their supplier-order lines, shipments left empty, and operations whose lots are all deleted. Lineage that still has non-seeded demand is kept and its quantities left intact. Add a comment linking to this plan.
- Verification: reproduce #69 (manual operation on `CITEM-SEED-*`, then `pnpm db:seed && pnpm db:seed-verify`) on a disposable DB branch → exit code 0, no `quantityMismatch`.

**Task 3.2 (ADR 0010 seed cleanup).** Remove `buyerCardOk`/`buyerRejected` mock card seeds (`prisma/seed.ts:~1045-1072`) and any reference to `expectedStatus` mock semantics; keep Mercado Pago / transfer methods still used by checkout. Grep `pm-seed-buyer-card` to delete dependants.

**Task 3.3 (fixtures).**
- #12: a seeded customer `qa-clean@…` with no address and no payment method.
- #67 case A: a seeded order with all items delivered (use `scripts/fulfillment-e2e.ts` helpers if they expose a complete run; otherwise seed the lineage directly) so closure derives `completed`.
- Both documented in the ticket preconditions.

### Phase 4 — QA tickets, UX hint and docs

**Task 4.1 — `/admin/payments` (#36).** Rename the "Refs" column to show `Pago: <id>` or `Preferencia: <id>`; add tooltip on disabled "Reconciliar ahora": "Sin id de pago de Mercado Pago: el comprador todavía no pagó esta preferencia."

**Task 4.2 — ticket text (`scripts/qa-tickets.data.ts`, mirrored in `docs/qa/qa-ciclo-de-vida.md`).**
- Retire #15 (move to `retiredQaTicketCodes`).
- #18 → "Pago externo rechazado por admin": confirm with Pago externo, admin rejects in `/admin/payments`, cart stays editable.
- #20, #31, #32: numbered steps naming screen, button and what to check after each step (use the fixture order from 3.3).
- #22: state that the three URLs open directly, no MP needed.
- #25: include the exact `curl -i -X POST $APP_URL/api/mercadopago/webhook -H 'x-signature: ts=1,v1=bad' -H 'x-request-id: qa' -d '{"type":"payment","data":{"id":"1"}}'`.
- #36: "providerPaymentId = campo **Pago** del intento".
- #42: expected item status "Asignado a proveedor", journey "Preparación".
- #54: journey stays "Envío" when an internal leg already happened.
- #61: package "Recuperar" disabled with reason; recover the shipment first (new action).
- #12, #67: point to the new fixtures.
- Then `pnpm qa:seed`. Status of the re-opened tickets is reset by the QA lead in the admin, not by the seed.

**Task 4.3 — docs.** Update `docs/plans/checkout-redesign.md` (mock gateway/payment methods removed per ADR 0010), `fulfillment-lifecycle-actions.md` (B6, B7), `fulfillment-reference.md` router surface (shipment recover), `docs/tracking-architecture.md` (notice reason).

## 9. Cross-cutting concerns

- **Privacy:** only `metadata.reason` from exception/rollover events reaches customers; never audit notes.
- **Authorization:** `shipment.recover` is `adminProcedure`, same as `markDelayed`.
- **Idempotency:** `recover` on a non-delayed shipment → conflict, no side effects.
- **Migration:** B8 is additive and nullable; no backfill.
- **Async projection:** journey changes appear after the domain event dispatcher runs; tests call the projector directly.

## 10. Pitfalls

- B1: do not use payment status as the empty-state gate — a rollover notice before any stage must still render.
- B6: `packageRecoveryTarget` treats a disrupted shipment as `null`; after shipment recover the package statuses are set by the shipment command, so the package-level recover must not be required.
- B8: keep the per-demand budget cap; removing it reintroduces double packaging across selected sources (§21.6).
- Seed (3.1): deleting by reachability must run inside the existing transaction and before `cart_item` deletion, or cascades remove the evidence needed to compute reachability.
- `qa:seed` rewrites text only; changing a ticket's meaning does not reset its status.

## 11. Testing

Per task as listed; then `pnpm typecheck && pnpm check && pnpm test`, `pnpm fulfillment:e2e`, and on a disposable DB `pnpm db:seed && pnpm db:seed-verify`. Manual re-run of tickets #3, #16, #30, #33, #45, #48, #54, #61, #69 in the admin.

## 12. Rollout and rollback

- Ship phases as separate PRs (1, 2.1–2.3, 2.4 + migration, 3, 4).
- Rollback: revert the PR; B8 migration is additive, so a code revert leaves an unused nullable column (drop in a follow-up if needed). Terms v2 applies to new orders only.

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| B4 root cause differs (A3) | Reproducing test first |
| B6 dispatch-time field absent | Derive target as described; document |
| B8 legacy data keeps showing leftover on old packages | Accepted; only new fractionations are attributed |
| Seed reachability deletes shared lineage | Keep any lineage with non-seeded demand; test with a mixed fixture |
| B8: one fractionation taking the same demand from two sources writes one row with `sourcePackageId = null` (unique `(cartItemLotItemId, packageLotItemId)`) | Accepted: per-demand cap still prevents double packaging; only the per-source display can over-offer, as before |

## 14. Open questions

1. **B3 legal text** — who provides it, and is `checkout-v2` the right version label?
2. Environment actions outside this plan: set `MERCADOPAGO_ACCESS_TOKEN` (sandbox) in QA; #38: the tester's account `lsferreyra@gmail.com` already has role `superadmin` (checked 2026-09-18) — re-run the ticket.

## 15. Definition of done

All B1–B9 fixed with tests; typecheck/lint/tests/e2e/seed-verify green; tickets rewritten and re-seeded; the listed tickets re-run by QA; docs updated.

## 16. Executor instructions

Use `q-code-implement` phase by phase; start each defect with a failing test (`q-code-tdd`). Task 1.3 is done (placeholder). Record progress on the QA tickets in `/admin/qa-tickets` (notes), not in this plan.

## 17. Execution record (q-code-implement, 2026-09-18)

**Status:** implemented and unit-verified, **not yet released**. Scope per user instruction: every task except the Mercado Pago part, which stays pending — Task 4.1 (`/admin/payments` hint, #36) and the MP-subject ticket rewrites #22, #25, #36.

### Change summary

| Task | Result |
| --- | --- |
| 1.1 B1 (#30) | `hasReachedAnyStage` gates the empty state (any non-pending stage or any notice). The old test asserting six pending stages encoded the bug and was replaced. |
| 1.2 B2 (#33, #61) | Notice `reason` via `customerNoticeReason`, an **event-type** allow-list (`fulfillmentException`, `rolledOverPreAllocation`, `rolledOverPostAllocation`). Narrower than "notice kinds rollover/exception": the `rollover` kind also covers `rollOverResolved` and `excludedFromOperation`, whose reasons are operator notes (A1 privacy). |
| 1.3 B3 (#16) | Done earlier; added a test on `CHECKOUT_TERMS`. |
| 1.4 B9 (#3) | Bootstrap state `blocked` + message on `PRECONDITION_FAILED`; `/cart` alert "Productos pendientes de agregar", rows/"Vaciar carrito"/"Ir a pagar" disabled, cart sheet routes to `/cart`; `/checkout` renders the refusal. "Descartar productos pendientes" is the way out (drops local items and reloads, so the frozen checkout can resume). |
| 2.1 B4 (#48) | Root cause confirmed as A3 (stale overrides). `isConfirmBlocked` ignores overrides at 0; the row clears them when the line reaches 0. |
| 2.2 B7 (#45) | `rerunParameters` forces `includeRollOver` on a `completed` source (audited `forcedIncludeRollOver`); dialog shows the switch on and disabled. |
| 2.3 B6 (#61) | `shipment.recover` end to end (transitions, schema, service, effects, router, dialog). Target from the latest `shipment.markDelayed` audit `before.status` (no dispatch timestamp on `Shipment`); no audit trail → `inTransit`. `shipmentTransitions.delayed` gained `readyForDispatch`. Exception/resolution event keys carry the occurrence after the first so a repeated delay → recover cycle is not deduplicated away. |
| 2.4 B8 (#54) | Migration `20260918000000_package_allocation_source_package` (additive, nullable, `SET NULL`, indexed). Fractionation records the source; promotion attributes rows to the package itself (and those rows still count as received evidence, fixing a double charge against sibling packages); split inherits the source. |
| 3.1 B5 (#69) | `collectLineageOnlyReachableFromSeed` + `collectPackagingLeftEmpty` in the reset. |
| 3.2 | Mock card seeds removed (`buyerTransfer` replaces them), `expectedStatus` gone, legacy rows soft-deleted. Seeded transactions keep `provider: "mock"` (out of this task). |
| 3.3 | See deviations. |
| 4.2 | #15 retired; #3, #12, #18, #20, #31, #32, #33, #42, #54, #61, #67 rewritten in `scripts/qa-tickets.data.ts` and mirrored in `docs/qa/qa-ciclo-de-vida.md` (also #17 marked retired there and the mock precondition/regression chain fixed). |
| 4.3 | `fulfillment-lifecycle-actions.md`, `fulfillment-reference.md`, `tracking-architecture.md`, `checkout-redesign.md` (ADR 0010 note). |

### Deviations and decisions

- #12 fixture: no seeded `qa-clean@…` user — login is Google OAuth only, so it could not sign in. The ticket now requires a Google account with no saved address.
- #67 case A: uses the existing fixture ORD-SEED-PICKUP / PKG-SEED-OUT-PICKUP-B (one "Confirmar entrega" from closure) instead of a new pre-completed order, so QA observes the derivation.
- 3.1: no plan link in `seed.ts` (source carries no plan/ticket references).
- #69 exists only in the database; its text was not rewritten (QA lead can tighten it in the admin: `pnpm db:seed && pnpm db:seed-verify` exit 0, no `quantityMismatch`).

### Evidence

`pnpm typecheck` clean; `pnpm test` 66 files / 1082 tests green; `biome check` clean on all changed files (repo-wide `pnpm check` still fails only on pre-existing files outside this change: `.agents/`, `field.tsx`, `audit-log.service.ts`, `domain-event-publisher.ts`, `.vscode/launch.json`).
**Not run** (the configured `DATABASE_URL` is the shared Neon database): migration apply, `pnpm db:seed`, `pnpm db:seed-verify`, `pnpm fulfillment:e2e`, `pnpm qa:seed`, manual re-run of the tickets.

### Mini review

- `q-review-code`: standards pass *fail* → fixed (reason privacy M1, event-key dedupe M2, blocked-merge exit M3, promotion double charge M4, `assertLegal` in recover, transaction-scoped recovery lookup, dead seed query, ticket references in tests); spec pass *pass with findings* → fixed (#31 step 4 path, #32 checkbox wording, recover dialog copy). Accepted: B8 merged-source rows (§13), mixed seeded lineage can still fail the verifier.
- `q-review-comments`: pass with findings; 4 rewrites applied.

### Follow-ups / required actions

1. Apply the migration **before** deploying this code (every package read selects `sourcePackageId`).
2. On a disposable Neon branch: reproduce #69, then `pnpm db:seed && pnpm db:seed-verify` (exit 0) and `pnpm fulfillment:e2e`.
3. Run `pnpm qa:seed` only after deploy (§5), then the QA lead reopens #3, #12, #16, #18, #20, #30, #31, #32, #33, #42, #45, #48, #54, #61, #67, #69.
4. Mercado Pago part (4.1, #22, #25, #36) and MP sandbox credentials remain pending.
5. Optional: ship as the PRs §12 describes; add a `shipment.recover` step to `scripts/fulfillment-e2e.ts`.
