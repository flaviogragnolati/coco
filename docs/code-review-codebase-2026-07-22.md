# Code Review Report — Coco Bulk (whole codebase)

> **Scope type:** Codebase
> **Reviewed:** 2026-07-22  ·  **Reviewer:** `/code-review` (max effort, 10 finder angles + adversarial verification)
> **Target:** `main` @ `e078a8e` — working tree identical to `origin/main`

---

## 1. Executive Summary

This is a well-structured T3 codebase — clean layering, consistent `adminProcedure` coverage across all 18 admin routers, `Decimal` money columns throughout, a real outbox, and a type-check that passes clean under `strict` + `noUncheckedIndexedAccess`. The architecture is sound. **The payment path built on top of it is not.**

The single most important finding: **`submitOrderAfterCompletedPayment` is unreachable code.** It receives the *post-update* `completedAt`, so its own early-return guard is always true. Every MercadoPago payment captures money and then stops — cart stays `atCheckout`, order stays `pending`, no domain events, nothing reaches operations. Two independent review angles found this separately and a verifier confirmed the block has never executed. Nothing downstream compensates.

Around it sits a cluster that compounds: a mock payment gateway reachable in production, a pricing helper that silently undercharges 10x on a legal terms configuration, one cart able to mint multiple payable preferences, and a reconciler that never checks the amount actually paid. **The root cause is structural, not incidental — there is zero test coverage on the money path.** No test imports `commerce.helpers`, `checkout.service`, `payment-gateway`, or any MercadoPago module. That is finding #1 by computed risk, and it is why the rest shipped.

**58 findings: 1 Critical · 8 High · 31 Medium · 18 Low**, plus **12 commendations** and **3 documented refutations**. 13 findings carry an ⚡ urgency flag — single-site defects whose computed band understates how urgently they need fixing.

**Before anything else ships:** fix the `completedAt` guard, and fix it together with findings #7 and #8 — correcting it in isolation converts a silent stall into a silent rollback.

> **Status note (2026-07-22):** the MercadoPago / money cluster is **deliberately deferred to a separate session** at the owner's direction. It is parked, not dismissed. (The numbering in the original note read "#2–#9"; per §5 those numbers are the structural findings, and the money cluster is **#10, #15, #25–#34**. Corrected here.)
>
> **Remediation note (2026-07-22):** findings **#2, #3, #4, #5, #6, #7, #8** are **resolved** — see the per-finding notes in §5 and the full log in §10. Finding **#9** (CRUD-client consolidation) is **resolved** in a follow-up session; see its note in §5.1, which also records a refutation of one claim in the finding. Findings **#35** and **#36** (Batch 2 — session boundary and environment) are **resolved** in a third session; see §12, which also records two corrections to #36's text and an explicit list of what was left unverified. Findings **#20, #21, #22, #23, #24, #39, #40** (Batch 6 — consolidation and naming) are **resolved** in a fourth session; see §13, which records nine corrections to the review's own text, five deliberate behaviour changes, and what was left unverified. Findings **#17, #18, #37, #38, #44, #45** (Batch 5 — performance) are **resolved** in a fifth session; see §14, which records three corrections to the review's own text, the diagnostics-filter compromise, one deviation on #38, and what was left unverified. Finding **#1** (money-path tests) remains open.
>
> **Running total: 23 of 58 findings resolved** — #2–#9, #17, #18, #20–#24, #35, #36, #37, #38, #39, #40, #44, #45. Open: **#1** (Critical), the parked money cluster (**#10, #15, #25–#34**), and the Medium/Low remainder. Dead code (**#55–#58**) is deferred, and **#55** is deliberately *kept* rather than pending — see §9. **#57** closed incidentally inside the Batch 5 #44 rewrite (see §14).

## 2. Scope & Methodology

**What was reviewed** — the whole application: `src/server/**` (17.8k LOC), `src/app/**` (14.3k), `src/features/**` (11.6k), `src/components/**`, `src/schemas/**`, `src/store/**`, `src/shared/**`, `src/trpc/**`, plus `prisma/schema.prisma`, `prisma/seed.ts`, `src/env.js`, and the config files. 374 TS/TSX files. Documentation treated as normative: `CONTEXT.md`, `docs/adr/0001`, `docs/tracking-architecture.md`, `docs/schema-reference.md`.

**Explicitly out of scope** — `generated/`, `node_modules/`, `public/`, the untracked `.agents/skills/**` and `e2e/` scaffolding, and the uncommitted test-file edits in the working tree.

**How** — 10 independent finder angles run in parallel (5 correctness: line-scan, removed-behavior, cross-file tracing, language pitfalls, wrapper/proxy correctness; 3 cleanup: reuse, simplification, efficiency; plus altitude and conventions). Every candidate then went to an independent adversarial verifier instructed to refute it, returning CONFIRMED / PLAUSIBLE / REFUTED. A final sweep pass re-read the codebase holding the verified list, hunting only for gaps. Three candidates were refuted and are recorded in §8 so they are not re-investigated.

**Tooling signals** (all run 2026-07-22):

| Command | Result |
|---|---|
| `pnpm typecheck` (tsgo) | ✅ clean, exit 0 |
| `pnpm test` (vitest) | ✅ 5 files, 37 tests, all pass — **in 553ms** |
| `pnpm check` (biome) | ❌ **29 errors, 4 warnings** across 393 files |
| `npx madge --circular src/` | ✅ no circular dependencies — **but see the correction below; this signal was vacuous** |

> **Baseline snapshot.** The table above records what the review measured on `main` @ `e078a8e`. It is deliberately **not** updated as findings are remediated — each session's log (§10–§13) carries its own before/after gates. Current numbers: `pnpm check` is at **19 errors / 4 warnings** (down from 29; finding #19 still open), and `pnpm test` at **15 files, 118 tests** (up from 5 / 37).
>
> **Correction (2026-07-22, §13).** The madge signal — repeated in §12 — proved **vacuous**. Both `pnpm madge` and a bare `npx madge ./src` process **2 files** (`env.js` and `env.helpers.js`): madge defaults to `.js` only, so it never looked at a single `.ts` or `.tsx` file. Re-run correctly as `npx madge --circular --extensions ts,tsx --ts-config tsconfig.json ./src`, it reports **39 cycles, all of them inside `generated/prisma/`** (generated code, out of scope per §2) and **zero in hand-written `src/`**. The conclusion happens to hold; the evidence for it did not exist until now. **The `madge` script in `package.json` needs the flags added, or it will keep reporting a clean bill of health for a directory it is not reading.**

The test duration is itself a finding: 37 tests in 42ms of actual test time is a suite that touches almost nothing. See finding #1.

**Limitations** — No DB was provisioned, so no query was run against live data and no migration was exercised; performance findings are derived from reading query shapes against `prisma/schema.prisma` indexes, not from `EXPLAIN`. Two findings (#3, #5) were confirmed by executing extracted pure functions in a scratch script rather than through the full stack. Accessibility was sampled, not audited exhaustively. Frequency scores for duplication findings are exact counts; for behavioural findings they reflect call-site spread.

## 3. Risk-Ranked Findings (Overview)

Sorted by computed risk descending. **✅** marks findings resolved on 2026-07-22 (see §10, §11, §12, §13). **⚡** marks findings whose real urgency exceeds their computed band — per the rubric, single-site defects that still corrupt money or breach a boundary keep their honest score and carry the flag instead.

| # | Finding | Area | Location | Sev | Freq | Risk | ⚡ | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 1 | No test coverage on the money path | TEST-1 | `vitest.config.ts:8` | S3 | F4 | 🔴 Critical (12) | | 🔴 Must-fix |
| ✅ 2 | Validity-window helper shifts dates by TZ offset per edit | LIB-DATE-2 | `product-client-terms.mappers.ts:6` | S3 | F3 | 🟠 High (9) | | 🔴 Must-fix |
| ✅ 3 | `fulfillmentStatus` has three writers, one in the data layer | MAINT-1 | `operations-cart.data.ts:516` | S3 | F3 | 🟠 High (9) | | 🟠 Strong |
| ✅ 4 | "Has operational lineage" computed 4 ways, 2 definitions | MAINT-3 | `operations-cart.data.ts:390` | S3 | F3 | 🟠 High (9) | | 🟠 Strong |
| ✅ 5 | Cart-total aggregation written 3× (client + 2× server) | MAINT-4 | `cart-store.ts:62` | S3 | F3 | 🟠 High (9) | | 🟠 Strong |
| ✅ 6 | Terms validity predicate implemented 5× | MAINT-4 | `checkout.service.ts:102` | S3 | F3 | 🟠 High (9) | | 🟠 Strong |
| ✅ 7 | Admin can self-promote to superadmin / lock out all superadmins | SEC-2 | `admin/user.router.ts:70` | S4 | F2 | 🟠 High (8) | ⚡ | 🔴 Must-fix |
| ✅ 8 | `mapServiceError` copy-pasted into 16 routers | MAINT-4 | `admin/brand.router.ts:22` | S2 | F4 | 🟠 High (8) | | 🟠 Strong |
| ✅ 9 | 7 CRUD clients (~2,668 lines) structurally identical | MAINT-4 | `brand-crud-client.tsx:50` | S2 | F4 | 🟠 High (8) | | 🟡 Preferable |
| 10 | Webhook swallows errors; failure state rolled back | ERR-1 | `mercadopago/webhook/route.ts:142` | S3 | F2 | 🟡 Medium (6) | | 🔴 Must-fix |
| 11 | Outbox has no background drain, no backoff, no requeue | OPS-4 | `domain-event-dispatcher.ts:185` | S3 | F2 | 🟡 Medium (6) | | 🔴 Must-fix |
| 12 | `fulfillmentStatus` regresses on outbox retry; `exceptionResolved` stuck | DATA-2 | `tracking-status-projector.ts:236` | S3 | F2 | 🟡 Medium (6) | | 🟠 Strong |
| 13 | Concurrent cart writes duplicate items and carts | DATA-2 | `cart.service.ts:223` | S3 | F2 | 🟡 Medium (6) | | 🟠 Strong |
| 14 | Aggregate status is last-event-wins with one evidence branch | MAINT-1 | `tracking-status-projector.ts:195` | S3 | F2 | 🟡 Medium (6) | | 🟠 Strong |
| 15 | Payment→submit transition duplicated per gateway | MAINT-4 | `mercadopago-reconciliation.service.ts:112` | S3 | F2 | 🟡 Medium (6) | | 🟠 Strong |
| 16 | Diagnostics substitute for write-time invariants | DATA-1 | `operations-cart.service.ts:198` | S3 | F2 | 🟡 Medium (6) | | 🟠 Strong |
| ✅ 17 | `syncLocal` unbounded input, 3 serial queries per item in a txn | SEC-7 | `cart.schemas.ts:75` | S3 | F2 | 🟡 Medium (6) | | 🟠 Strong |
| ✅ 18 | Unbounded admin list queries, phantom `pageSize` | PERF-1 | `admin/lot.data.ts:194` | S2 | F3 | 🟡 Medium (6) | | 🟠 Strong |
| 19 | Biome fails on checked-in source (29 errors) | TEST-4 | `supplier-form-dialog.tsx:23` | S2 | F3 | 🟡 Medium (6) | | 🟠 Strong |
| ✅ 20 | `selectProductImage` defined 5× with two behaviours | MAINT-3 | `checkout.service.ts:78` | S2 | F3 | 🟡 Medium (6) | | 🟠 Strong |
| ✅ 21 | `decimalStringSchema` redeclared in 5 schema files | MAINT-4 | `cart.schemas.ts:8` | S2 | F3 | 🟡 Medium (6) | | 🟡 Preferable |
| ✅ 22 | Local `requiredText`/`optionalUrl` copies — already drifted | CONV-3 | `admin/brand.schemas.ts:3` | S2 | F3 | 🟡 Medium (6) | | 🟡 Preferable |
| ✅ 23 | Forbidden domain names in admin UI (`CartItemLotItem`) | CONV-2 | `tracking-detail-dialog.tsx:112` | S2 | F3 | 🟡 Medium (6) | | 🟡 Preferable |
| ✅ 24 | `/my-operations` overloads the reserved term "Operation" | CONV-2 | `my-operations/page.tsx:67` | S2 | F3 | 🟡 Medium (6) | | 🟡 Preferable |
| 25 | **MP payments never submit the order (dead guard)** | DATA-3 | `mercadopago-reconciliation.service.ts:225` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| 26 | Mock gateway approves real orders in production | SEC-3 | `payment-gateway.ts:93` | S4 | F1 | 🟡 Medium (4) | ⚡ | ⛔ Antipattern |
| 27 | Null `stepPrice` silently charges flat MOQ price (10x under) | DATA-4 | `commerce.helpers.ts:179` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| 28 | One cart can create multiple payable orders | DATA-2 | `checkout.service.ts:628` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| 29 | MP charged amount diverges from recorded amount | DATA-4 | `mercadopago-preference.service.ts:57` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| 30 | Reconciliation never verifies the amount paid | DATA-4 | `mercadopago-reconciliation.service.ts:185` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| 31 | Cart stays writable during checkout | DATA-1 | `cart.data.ts:112` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| 32 | Admin edit rewrites quantity on paid orders | DATA-4 | `operations-cart.data.ts:476` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| 33 | Cancelling allocated demand creates no roll over | DATA-1 | `operations-cart.service.ts:229` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| 34 | Rolled-over demand excluded from all future operations | DATA-4 | `operation-execution.service.ts:262` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| ✅ 35 | Cart survives logout, merges into the next user's cart | SEC-6 | `use-cart-sync.ts:56` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| ✅ 36 | `APP_ENV` fails open; security branch on a Spanish substring | OPS-3 | `env.js:18` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| ✅ 37 | N+1 in cart traceability diagnostics | PERF-1 | `cart-traceability.service.ts:29` | S2 | F2 | 🟡 Medium (4) | | 🟠 Strong |
| ✅ 38 | Filter dropdowns download whole dimension tables | PERF-1 | `user-carts-client.tsx:117` | S2 | F2 | 🟡 Medium (4) | | 🟠 Strong |
| ✅ 39 | `home-formatters.ts` is a fork of `commerce.helpers.ts` | MAINT-4 | `home-formatters.ts:7` | S2 | F2 | 🟡 Medium (4) | | 🟡 Preferable |
| ✅ 40 | Duplicated tooltip components + 25 copies of a date formatter | MAINT-4 | `operation-table.tsx:40` | S1 | F4 | 🟡 Medium (4) | | 🔵 Optional |
| 41 | `billingAddressSnapshot` populated with the shipping address | DATA-6 | `checkout.data.ts:391` | S3 | F1 | 🟢 Low (3) | | 🟠 Strong |
| 42 | Diagnostics attributed at lot, not lot-item, granularity | DATA-4 | `cart-traceability.assembler.ts:65` | S3 | F1 | 🟢 Low (3) | | 🟠 Strong |
| 43 | Unhandled outbox events marked `processed` (latent) | ERR-1 | `domain-event-dispatcher.ts:145` | S3 | F1 | 🟢 Low (3) | | 🟠 Strong |
| ✅ 44 | Sequential creates inside a Serializable transaction | PERF-5 | `operation-execution.service.ts:556` | S3 | F1 | 🟢 Low (3) | | 🟠 Strong |
| ✅ 45 | `RollOver` has no index covering `status` | PERF-1 | `prisma/schema.prisma:855` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 46 | Order page masks every failure as 404 | ERR-2 | `my-orders/[orderId]/page.tsx:126` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 47 | User can rewrite `type` on the managed MP payment method | DATA-5 | `checkout.data.ts:341` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 48 | Second hand-rolled inbox beside the outbox | MAINT-4 | `mercadopago-reconciliation.service.ts:258` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 49 | `PaymentGatewayPort` bypassed by the only real provider | MAINT-1 | `payment-gateway.ts:36` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 50 | `checkout-client` hand-splices React Query cache (86 lines) | LIB-QUERY-1 | `checkout-client.tsx:143` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 51 | `ConfigEditor` prop-mirroring effect discards admin edits | REACT-2 | `payments-admin-client.tsx:270` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 52 | `profile.router.ts` is the only router touching Prisma directly | CONV-1 | `profile.router.ts:25` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 53 | `tracking-architecture.md` omits the reconciliation producer | MAINT-7 | `docs/tracking-architecture.md:418` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 54 | `payment.service.ts` bypasses the shared audit-log helper | DATA-6 | `admin/payment.service.ts:117` | S2 | F1 | 🟢 Low (2) | | 🟡 Preferable |
| 55 | `checkout.getState` is dead and duplicates `start` | MAINT-5 | `checkout.service.ts:481` | S1 | F1 | 🟢 Low (1) | | 🔵 Optional |
| 56 | `domainEventTypeSchema` + `DomainEventType` unreferenced | MAINT-5 | `domain-events.schemas.ts:294` | S1 | F1 | 🟢 Low (1) | | 🔵 Optional |
| 57 | Dead `includedSourceRollOverIds.add` superseded 30 lines later | MAINT-5 | `operation-execution.service.ts:605` | S1 | F1 | 🟢 Low (1) | | 🔵 Optional |
| 58 | `lodash` and `dayjs` declared but never imported | SEC-8 | `package.json:45,48` | S1 | F1 | 🟢 Low (1) | | 🔵 Optional |

## 4. Findings by Recommendation Category

**⛔ Antipatterns** — 26 (mock payment gateway wired into the production checkout path).

**🔴 Critical / Must-fix** — 1, ~~2~~ ✅, ~~7~~ ✅, 10, 11, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, ~~35~~ ✅, ~~36~~ ✅.

**🟠 Strong** — ~~3~~ ✅, ~~4~~ ✅, ~~5~~ ✅, ~~6~~ ✅, ~~8~~ ✅, 12, 13, 14, 15, 16, 17, 18, 19, ~~20~~ ✅, 37, 38, 41, 42, 43, 44.

**🟡 Preferable** — 9, ~~21~~ ✅, ~~22~~ ✅, ~~23~~ ✅, ~~24~~ ✅, ~~39~~ ✅, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54.

**🔵 Optional / Nit** — ~~40~~ ✅, 55, 56, 57, 58.

**🟢 Commendations** — see §7.

## 5. Detailed Findings

Full finding blocks are given for #1–#38 (Critical, High, and Medium bands). Findings #39–#58 are Low-band cleanup and are documented in condensed form in §5.3 — each still carries location, cost, and fix, but without the extended narrative, per the skill's proportionality principle.

### 5.1 Critical and High

---

### 1. No test coverage on the money path

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🔴 Critical (12) — S3 × F4
- **Standard:** `TEST-1` Coverage of what matters
- **Location:** `vitest.config.ts:8` · absence across `src/**`

**What** — `grep -rln "calculateLineTotal\|normalizeCartQuantity\|commerce.helpers" --include=*.test.ts src e2e` returns nothing. No test imports `checkout.service`, `payment-gateway`, or any MercadoPago module; the only occurrence of "mercadopago" in any test is a fixture string. The suite is 37 tests across 5 files running in 42ms of test time.

```ts
// vitest.config.ts:8-10
include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
```

Two test files are *named* after commerce concerns and give the appearance of coverage: `checkout-steps.test.ts` tests only client-side step gating (a navigation model the server re-validates anyway), and `catalog-filtering.test.ts` reaches pricing only via `getDisplayPrice`, never `calculateLineTotal`. The e2e suite is a single `expect(response?.ok()).toBe(true)` on `/`, and `pnpm test` excludes `e2e/` entirely, so Playwright never runs unless invoked separately.

**Why it matters** — `calculateLineTotal` is the pricing authority for three independent consumers: cart display, the `UserTransaction.amount` written to the database, and the amount actually charged at MercadoPago. It carries the 10x undercharge of finding #27, which a single assertion would have caught. This is the systemic reason findings #25–#34 all shipped: there is no gate that would have failed.

**Fix** — Start with pure-function characterization tests on `commerce.helpers` (`calculateLineTotal`, `normalizeCartQuantity`, `toMoneyString`) covering the MOQ/step matrix including `stepPrice: null` and fractional quantities. Then integration tests on `confirmAndPay` and `reconcileMercadoPagoPayment` using `createCaller` — the repo already has `server-side-calls` patterns available. Assert the invariant that binds the cluster: *the sum of preference line items equals `UserTransaction.amount` equals the sum of `UserOrderItem.priceSnapshot` line totals.*

**References** — `.agents/skills/codebase-review/references/generic-standards.md` (TEST-1) · [Vitest — testing async code](https://vitest.dev/guide/testing-types) · [tRPC — server-side calls](https://trpc.io/docs/server/server-side-calls)

---

### 2. Validity-window helper shifts dates by the TZ offset on every edit

> **Resolved (2026-07-22).** Phase 2 of `tmp/implementation-plan-code-review-structural-fixes.md`. One TZ-pinned helper pair in `src/shared/common/date.helpers.ts` (`BUSINESS_TZ = America/Argentina/Buenos_Aires`) replaces the 4 copies and the 20 naive `new Date(input.x)` parses. Existing drifted rows are corrected manually — no backfill.

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟠 High (9) — S3 × F3
- **Standard:** `LIB-DATE-2` Timezone correctness
- **Location:** `src/features/admin/crud/product-client-terms/product-client-terms.mappers.ts:6` (`toDateTimeLocalValue`), duplicated in `product-supplier-terms.mappers.ts:6`, `product-local-constraints.mappers.ts:6`, `operation.mappers.ts:10`

**What** — The helper renders a stored `Date` into a `datetime-local` string using browser-local getters, producing a string with no offset. The server then parses it as server-local.

```ts
// mappers.ts:6-11
function toDateTimeLocalValue(value: Date | string) {
	const date = new Date(value);
	const pad = (part: number) => String(part).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
// product-client-terms.data.ts:126 — parsed with no offset, so server-local
fromDate: new Date(input.fromDate),
```

`dateInputSchema` (`_crud-schema-helpers.ts:19-25`) is a bare `z.string()` with a validity-only `.refine()` — no transform, no `Z`, no offset — so nothing normalizes in between. The edit path *does* round-trip the stored value (`mappers.ts:41-42` via `form.reset` on open), so the shift compounds.

**Why it matters** — An admin in UTC-3 opening a terms row stored at `14:30Z` sees `11:30`, changes only the price, and saves — the window start moves 3 hours earlier, and again on the next edit. This is enforced: `catalog.data.ts:67` and `home.data.ts:68` filter `fromDate: { lte: now }`, and `checkout.service.ts:111` / `cart.service.ts:85` gate add-to-cart on the same window. Products go live early and expire early. `grep -rn "timeZone" src/` is empty — nothing pins a business timezone anywhere. This manifests only on deploy, never on a dev machine where server TZ equals browser TZ, which is why it has gone unnoticed.

**Fix** — Normalize at the schema boundary so every consumer gets an absolute instant. Convert the `datetime-local` string to UTC using the intended business timezone (`America/Argentina/Buenos_Aires`) at submit time, and render back through the same zone. `dayjs` is already a declared dependency (currently unused, see #58) — `dayjs.tz(value, BUSINESS_TZ).toISOString()` is the shape. Deduplicate the four copies into one helper while fixing.

```ts
// one shared helper, timezone-explicit both ways
export const BUSINESS_TZ = "America/Argentina/Buenos_Aires";
export const toDateTimeLocalValue = (v: Date | string) => dayjs(v).tz(BUSINESS_TZ).format("YYYY-MM-DDTHH:mm");
export const fromDateTimeLocalValue = (v: string) => dayjs.tz(v, BUSINESS_TZ).toDate();
```

**References** — `CONTEXT.md` ("Client terms … and validity window") · [MDN — `datetime-local` and time zones](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local#setting_timezones) · [Day.js — Timezone plugin](https://day.js.org/docs/en/plugin/timezone)

---

### 3. `fulfillmentStatus` has three writers, one of them in the data layer

> **Resolved (2026-07-22).** Phase 7. `softDeleteCartItem` became `setCartItemLifecycle`, which writes only `deleted`/`status`; the cancellation `fulfillmentStatus` write now flows through the outbox to `TrackingStatusProjector`. The three MercadoPago-cluster writers are unchanged (out of scope).

- **Recommendation:** 🟠 Strong
- **Risk:** 🟠 High (9) — S3 × F3
- **Standard:** `MAINT-1` Separation of concerns / layering
- **Location:** `src/server/services/admin/operations-cart.data.ts:516`, plus `mercadopago-reconciliation.service.ts:126` and `tracking-status-projector.ts:236`

**What** — `docs/tracking-architecture.md` declares `TrackingStatusProjector` the authority on aggregate status. Three sites write it anyway, and the worst is a *data-layer* function that also encodes the business rule:

```ts
// operations-cart.data.ts:506-520
export async function softDeleteCartItem(db, id, hasOperationalLinks: boolean) {
	return db.cartItem.update({
		where: { id },
		data: {
			deleted: true,
			status: hasOperationalLinks ? "cancelled" : "dropped",
			fulfillmentStatus: hasOperationalLinks ? "cancelled" : undefined,
		},
```

**Why it matters** — The same cancellation is written twice by two mechanisms with different rules: this unconditional data-layer write, and later `admin.cartItem.cancelled → cancelled` through the projector — whose evidence check (`cartItem?.deleted === true || status === "cancelled"`) passes *only because* the data layer already wrote it. The evidence check is tautological and validates nothing. Reorder the two, or add a fourth caller of `softDeleteCartItem`, and you get items whose status was never evidence-checked. Any rule change must land in three files that share no type.

**Fix** — Make the data layer dumb: `setCartItemLifecycle(id, { deleted, status })` with the `hasOperationalLinks` decision moved up into `operations-cart.service.ts`. Remove the `fulfillmentStatus` write entirely and let the projector own it, driven by the `admin.cartItem.cancelled` event that is already published (`cart-operation-effects.ts:265-283`). That makes the projector's evidence check meaningful instead of circular.

**References** — `docs/tracking-architecture.md` (Core Rule) · `.agents/skills/codebase-review/references/generic-standards.md` (MAINT-1)

---

### 4. "Has operational lineage" is computed four ways with two definitions

> **Resolved (2026-07-22).** Phase 6. One `hasFulfillmentLineage` in `operations-cart.data.ts`, beside its `_count` select. `trackingEvents` is deliberately excluded. The `operationalLinkCount`/`orderItemCount` output fields collapsed into `hasLineage: boolean`.

- **Recommendation:** 🟠 Strong
- **Risk:** 🟠 High (9) — S3 × F3
- **Standard:** `MAINT-3` Naming & clarity
- **Location:** `src/server/services/admin/operations-cart.data.ts:390`, `operations-cart.service.ts:227` and `:153`, `cart-operation-effects.ts:270` and `:298`

**What** — The predicate deciding `cancelled` vs `dropped`, `admin.cartItem.cancelled` vs `admin.cartItem.removed`, and whether a hard delete is blocked exists in four places with two different definitions and no shared type:

```ts
// data.ts:390 — definition A (folds in trackingEvents)
operationalLinkCount: _count.rollOvers + _count.cartItemLotItems + _count.trackingEvents,
// service.ts:153-164 — definition B (inline, adds userOrderItems)
item._count.rollOvers > 0 || item._count.cartItemLotItems > 0 ||
item._count.trackingEvents > 0 || item._count.userOrderItems > 0
```

**Why it matters** — Definition A folds `trackingEvents` into "operational links", and `admin.cartItem.added` writes an `addedToCart` tracking row. So an item an admin adds and later removes has `trackingEvents = 1`, is classified as having lineage, and is persisted as `status: "cancelled"` + `fulfillmentStatus: "cancelled"` — a cancelled *fulfillment* record for demand that never reached an operation, a lot, or an order. It is also permanently un-hard-deletable for the same reason.

**Fix** — One named predicate, `hasFulfillmentLineage(counts)`, defined beside the `_count` select it reads, excluding `trackingEvents` (which record history, not lineage). Have all four sites call it.

**References** — `CONTEXT.md` ("Fulfillment lineage") · `.agents/skills/codebase-review/references/generic-standards.md` (MAINT-3)

---

### 5. Cart-total aggregation is written three times, across the client/server boundary

> **Resolved (2026-07-22).** Phase 5. `buildCartSnapshot` in `commerce.helpers.ts` is used by the store, `cart.service.ts` and `checkout.service.ts` (87 net lines removed). Arithmetic and rounding are byte-preserved; the store keeps its own name sort.

- **Recommendation:** 🟠 Strong
- **Risk:** 🟠 High (9) — S3 × F3
- **Standard:** `MAINT-4` DRY vs premature abstraction
- **Location:** `src/store/cart-store.ts:62`, `src/server/services/cart/cart.service.ts:129`, `src/server/services/checkout/checkout.service.ts:137`

**What** — The `CartItem[] → CartSnapshot` aggregation exists in three places. `cart.service.ts` and `checkout.service.ts` are **byte-for-byte identical** (27 lines, verified by `diff`); `cart-store.ts` differs only in the three source-field lines.

```ts
// identical in all three
for (const item of items) {
	totalQuantity += toNumber(item.quantity) ?? 0;
	totalsByCurrency.set(item.terms.currency,
		(totalsByCurrency.get(item.terms.currency) ?? 0) + (toNumber(item.lineTotal) ?? 0));
}
```

**Why it matters** — This is money arithmetic with one client copy and two server copies. Adding rounding, a discount, a shipping line, or changing currency bucketing means three edits. Fix only the server pair and the Zustand store shows a stale total in the cart sheet while checkout charges a different amount — invisible until a user compares the badge to the payment screen. The rounding path (`toNumber` → float accumulate → `toMoneyString`) being copy-pasted rather than shared is what makes client/server agreement a convention rather than a structural guarantee.

**Fix** — One `buildCartSnapshot(items, { id, code, status })` in `src/shared/common/commerce.helpers.ts` — which already holds `calculateLineTotal`, `toMoneyString`, `toQuantityString` and is already imported by all three. Roughly 90 lines collapse to ~25.

**References** — `.agents/skills/codebase-review/references/generic-standards.md` (MAINT-4)

---

### 6. The terms validity predicate is implemented five times

> **Resolved (2026-07-22).** Phase 4. `src/server/services/_base/terms-validity.ts` owns both dialects (in-memory predicates + the Prisma `where` builder) for all 5 sites. `cart.service.ts` now threads a single `now` per request.

- **Recommendation:** 🟠 Strong
- **Risk:** 🟠 High (9) — S3 × F3
- **Standard:** `MAINT-4` DRY vs premature abstraction
- **Location:** `src/server/services/checkout/checkout.service.ts:102`, `cart/cart.service.ts:79`, `operations/operation-assignment.helpers.ts:31`, `home/home.data.ts:64`, `catalog/catalog.data.ts:63`

**What** — "Is this terms row usable right now" is written five times: two byte-identical in-memory predicates, one supplier-side variant, and two identical Prisma `where` fragments. `catalog.data.ts:63` already exports `currentCatalogTermsWhere(now)` — `home.data.ts` could call it today.

```ts
// checkout.service.ts:102, byte-identical to cart.service.ts:79
terms.active && !terms.deleted &&
terms.product.active && !terms.product.deleted &&
terms.fromDate <= now &&
(terms.toDate === null || terms.toDate >= now)
```

**Why it matters** — This decides whether a customer can buy at a given price. The boundary semantics (inclusive both ends) are encoded five times. Change it to a half-open window to fix a midnight off-by-one and you must find all five; miss the in-memory pair and Prisma returns a row the service then rejects, so the product renders in the catalog but `addToCart` fails with a confusing error. Miss the supplier variant and purchase orders are mispriced.

**Fix** — One `termsActiveAt(now)` returning both shapes: a Prisma `where` fragment and an in-memory predicate derived from the same constants, exported from a single module. Compounded by #2 — the timezone bug means `now` comparisons are already against drifted stored values.

**References** — `CONTEXT.md` ("Client terms … validity window")

---

### 7. Any admin can self-promote to superadmin, or lock out every superadmin

> **Resolved (2026-07-22).** Phase 1. `user.authz.ts` enforces a rank hierarchy server-side across `create`/`update`/`softDelete`/`hardDelete`, including a last-active-superadmin guard that also covers the `update({ active: false })` lockout path. UI gating was skipped — `authClient.useSession()` does not expose a typed `role`.

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟠 High (8) — S4 × F2
- **Urgency:** ⚡ Directly reachable through the normal admin UI with no crafted request; privilege escalation is a breach regardless of frequency.
- **Standard:** `SEC-2` Server-side authorization
- **Location:** `src/server/api/routers/admin/user.router.ts:55` (create), `:70` (update), `:85` (softDelete), `:100` (hardDelete)

**What** — All four run on `adminProcedure` and accept a client-supplied `role` whose enum includes `"superadmin"`, with no role-hierarchy check, no self-target check, and no last-superadmin protection anywhere in the service or data layer.

```ts
// user.router.ts:70
update: adminProcedure.input(userUpdateInputSchema)
// schemas/admin/user.schemas.ts:24,31
export const userRoleSchema = z.enum(["user", "admin", "superadmin"]);
  role: userRoleSchema.default("user"),
// services/admin/user.data.ts:177
      role: input.role,
```

**Why it matters** — Escalation takes effect immediately, not on next login: `better-auth/config.ts` has no `session` block, so `cookieCache` is off and `getSession` reads the user from the DB every request. No crafted request is needed — `user-form-dialog.tsx:39-42` offers "Superadministrador" in an ungated `<Select>`. That grants `superadminProcedure`, gating `admin.payment.updateProviderConfig` (provider `enabled`, `mode`, `notificationUrl`, `allowUnsignedWebhooksInDevelopment` — which is the second half of finding #36). Better Auth's `input: false` on `role` is irrelevant: this path writes via Prisma directly.

The lockout is worse because it is irreversible. `softDeleteUser` writes `{ active: false, deleted: true }` unconditionally; `assertActiveUser` (`auth.utils.ts:25`) then rejects every authenticated request from that user inside `protectedProcedure`. An admin can enumerate users via `admin.user.list` (which returns `role`) and delete every superadmin. There is **no restore procedure anywhere in `src/server`**, and `update()` throws on deleted users — recovery requires direct DB access. `prisma/seed.ts:955-968` seeds user/admin/superadmin as three distinct tiers, so the boundary is real, not decorative.

**Fix** — Add an authorization rule in `user.service.ts`, not the router: an actor may never assign a role above their own, never modify or delete a user whose role outranks theirs, and never soft-delete themselves. Add a "cannot remove the last active superadmin" guard. Gate the `superadmin` option in the form on the actor's own role for affordance — but the server check is the one that counts.

```ts
const RANK = { user: 0, admin: 1, superadmin: 2 } as const;
function assertCanManage(actor: SessionUser, target: { role: UserRole }, nextRole?: UserRole) {
	if (RANK[target.role] > RANK[actor.role]) throw new AdminCrudError("CONFLICT", "…");
	if (nextRole && RANK[nextRole] > RANK[actor.role]) throw new AdminCrudError("CONFLICT", "…");
}
```

**References** — [OWASP — Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) · `.agents/skills/codebase-review/references/generic-standards.md` (SEC-2)

---

### 8. `mapServiceError` is copy-pasted into 16 routers

> **Resolved (2026-07-22).** Phase 3. One definition in `src/server/api/_shared/map-service-error.ts`, with an exhaustive switch; `RELATION_BLOCKED` now maps to `PRECONDITION_FAILED` instead of collapsing to `CONFLICT`. Verified no client branches on the error code.

- **Recommendation:** 🟠 Strong
- **Risk:** 🟠 High (8) — S2 × F4
- **Standard:** `MAINT-4` DRY vs premature abstraction
- **Location:** `src/server/api/routers/admin/brand.router.ts:22` and 15 siblings

**What** — The 11-line `AdminCrudError → TRPCError` translator appears in 16 admin routers with an identical body. Five entire routers (`address`, `brand`, `carrier`, `destination`, `supplier` — 114 lines each) are byte-for-byte identical after substituting the entity name: `diff` reports **0 differing lines**.

```ts
// identical ×16
function mapServiceError(error: unknown): never {
	if (error instanceof AdminCrudError) {
		throw new TRPCError({ code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "CONFLICT",
```

**Why it matters** — ~570 lines of pure template, and the drift is already latent: `AdminCrudErrorCode` declares three codes — `NOT_FOUND`, `CONFLICT`, `RELATION_BLOCKED` — but all 16 copies collapse them, so `RELATION_BLOCKED` is silently reported as `CONFLICT` everywhere. Giving it its own status is a 16-file edit; miss one and that entity alone returns a different code for the same domain error. A new entity is added by copying a 114-line file, so the surface grows per entity.

**Fix** — Move `mapServiceError` into `src/server/services/admin/_base/admin-crud.errors.ts`, which already owns the error type and exports `throwNotFound`. Map all three codes. Then consider a `createAdminCrudRouter(config)` factory for the five identical routers.

**References** — `.agents/skills/codebase-review/references/generic-standards.md` (MAINT-4)

---

### 9. Seven CRUD clients (~2,668 lines) are structurally identical

> **Resolved (2026-07-22).** `tmp/implementation-plan-crud-client-consolidation.md`. Three new pieces under `src/features/admin/crud/` — `useCrudPageState` (the six state slots, generic over the id type), `useCrudEntityPage` (filter memo, detail-error effect, submitting flag) and `<CrudEntityPage>` (stats quartet, filter bar, list gate, both delete dialogs) — now drive all seven standalone clients and all three `product-terms` panels. Per-entity wording is a typed `CrudEntityCopy` config. The eight target files went from **3,677 to 2,000 lines**; Biome errors inside `src/app/admin/crud-home` + `src/features/admin/crud` went from 9 to **0** (repo-wide 28 → 19). Behaviour-preserving migration and the copy/confirmation fixes are separate commits.
>
> **Two deviations from the fix as written.** (1) The form-dialog prop rename (`brand` → `entity`) was **skipped**: render props already decouple the shell from the dialogs' prop names, so the rename bought nothing while touching seven more files including the riskiest one (`product-form-dialog.tsx`, inline brand creation). (2) `useCrudEntityPage` takes **already-called** query/mutation results rather than a config holding the router proxy. A spike showed the natural `{ router: api.admin.brand }` design *compiles* but silently collapses every entity generic to `{}`, and the closure variant (`useList: (i) => …useQuery(i)`) trips `lint/correctness/useHookAtTopLevel`. Hooks are called by the client; the shared hook only receives their results.
>
> **Refutation — the terms-panel copy is not drift.** This finding cites `"lot items relacionados"` vs `"cart items relacionados"` as visible drift. It is intentional and correct: `product-client-terms.service.ts` guards on `_count.cartItems`, `product-supplier-terms.service.ts` guards on `_count.lotItems`, and `product-local-constraints.service.ts` `hardDelete` has no relation guard at all, matching its unconditional wording. The copy tracks the server, so all three were preserved. Do not re-report.
>
> **Follow-ups this unlocks.** Finding **#18** (unbounded admin list queries) is now a one-site change in `useCrudEntityPage` rather than a ten-file edit. Deferred: normalizing form-dialog props to `entity` / `isLoadingEntity`, a server-side `createAdminCrudRouter` factory, and applying the same shell to the `lot` / `operation` / `package` / `shipment` screens.

- **Recommendation:** 🟡 Preferable
- **Risk:** 🟠 High (8) — S2 × F4
- **Standard:** `MAINT-4` DRY vs premature abstraction
- **Location:** `src/app/admin/crud-home/{brands,carriers,addresses,destinations,suppliers,users,products}/_components/*-crud-client.tsx`, plus three ~260-line panels in `product-terms-crud-client.tsx:200,460,726`

**What** — Diffing brand (375 lines) against carrier (371): the import block, `closedFormState`, all 7 state hooks, the 3 queries, the 4 mutations, the error effect, the `useMemo` filter, `handleSubmit`, `renderTable`, the stats ternary, the filter bar, and both delete dialogs are identical modulo the entity token. Real variation is the `matchesSearch` field list, Spanish gender in labels ("Activas"/"Activos"), and the form-dialog prop name.

**Why it matters** — ~2,000 lines deletable behind one `useCrudEntityPage(config)` hook plus a `<CrudEntityPage>` shell. Today, changing delete-confirmation semantics or adding a filter control is a 7-file edit with no compiler assistance. The project already centralized the leaf pieces (`CrudPageShell`, `CrudStatsCards`, `CrudDeleteDialog`, `filter-helpers`) and stopped short of the orchestration layer, which is where the bulk sits. Drift is already visible in the terms panels: one hard-delete message says "lot items relacionados", another "cart items relacionados", and a reader cannot tell intentional variation from a missed edit.

**Fix** — Normalize the form-dialog prop from `brand`/`carrier` to `entity` (mechanical, the only blocker), then extract the orchestration into a config-driven hook with render props for table and form dialog. Tagged Preferable rather than Strong because it is a large mechanical refactor with no correctness impact — schedule it, don't rush it.

**References** — `.agents/skills/codebase-review/references/generic-standards.md` (MAINT-4)

---

### 5.2 Medium

---

### 10. Webhook swallows reconciliation errors and rolls back its own failure state

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `ERR-1` No swallowed errors
- **Location:** `src/app/api/mercadopago/webhook/route.ts:142`; `mercadopago-reconciliation.service.ts:254-267`
- **Status:** ⏸ Deferred with the MercadoPago cluster

**What** — Two compounding defects. The route discards the error entirely (no logger is imported in the file at all) and returns 202. Separately, the only code that marks a provider event `failed` runs *inside* the transaction that then throws:

```ts
// route.ts:142-144
} catch (_error) {
	return NextResponse.json({ received: true }, { status: 202 });
}
// reconciliation:254 opens the txn; :259 writes status "failed"; :267 throws — rolling that write back
```

**Why it matters** — The `PaymentProviderEvent` row stays `received` with `lastError: null` forever. It is the only `status: "failed"` writer for provider events repo-wide, so `payment.data.ts:255-257`'s `failedEvents` dashboard metric is structurally always 0. A captured payment that never reconciled leaves no signal anywhere. The correct pattern already exists next door: `DomainEventDispatcher.handleFailure` deliberately opens its own separate transaction (`:181`) so failure bookkeeping survives. Note also that MercadoPago acks on 200/201, so the 202 likely *causes* retries into the identical failure, incrementing `retryCount` without ever changing status.

**Fix** — Move the `failed` write into its own `db.$transaction` outside the failing one, mirroring `handleFailure`. Log the error through `app-logger.service`. Return 200 on successful receipt-and-persist, and a 5xx only when you genuinely want MercadoPago to retry.

**References** — `docs/plans/mercadopago-checkout-admin.md:257` ("If processing fails after persistence: set event `failed`, store `lastError`") · [Mercado Pago — webhook responses](https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks)

---

### 11. The outbox has no background drain, no backoff, and no requeue

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `OPS-4` Deployment assumptions
- **Location:** `src/server/events/domain-event-dispatcher.ts:185`

**What** — `wake()` is called from exactly seven places, all inside request paths. There is no `instrumentation.ts`, no cron, no `setInterval`, and no admin retry route. `handleFailure` re-marks the row `pending` with `attempts: { increment: 1 }` and **no delay**; after `MAX_ATTEMPTS = 5` it flips to `failed`, which nothing ever reads or resets.

```ts
// :185
status: exhausted ? "failed" : "pending",
attempts: { increment: 1 },
```

**Why it matters** — During a 10-second DB blip in a busy checkout period, each subsequent request's `wake()` burns another attempt with no backoff; five requests later the event is permanently `failed`. The `cart.item.submittedToOrder` event is then never handled: no `CartItemTrackingEvent` is written, `TrackingStatusProjector` never runs, and `CartItem.fulfillmentStatus` freezes at its pre-event value — the customer's order timeline is silently and permanently incomplete. Separately, if the process dies between `claim()` and completion the row sits in `processing` until some unrelated user action happens to call `wake()` after `STALE_LOCK_MS`.

**Fix** — Add exponential backoff via a `nextAttemptAt` column consulted by the claim query. Add a periodic drain that does not depend on user traffic (a Next.js `instrumentation.ts` interval is the smallest step; a real queue is the right long-term answer). Add an admin procedure to requeue `failed` events, and surface the `failed` count in the admin dashboard.

**References** — `docs/tracking-architecture.md` · [Microservices.io — Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)

---

### 12. Fulfillment status regresses on outbox retry; `exceptionResolved` is a dead end

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `DATA-2` Concurrency & races
- **Location:** `src/server/services/tracking/tracking-status-projector.ts:236` and `:11-26`

**What** — The write guards against re-writing the *same* value, not against regression, and the dispatcher does not stop the batch on first failure:

```ts
// :236-244
await tx.cartItem.updateMany({
	where: { id: cartItemId, fulfillmentStatus: { not: targetStatus } },
	data: { fulfillmentStatus: targetStatus },
});
```

**Why it matters** — `packaged` fails its listener and is reset to `pending`; the loop continues and `delivered` succeeds; the retry of `packaged` on the next `wake()` then rewrites the item *backwards* from `delivered` to `packaged`, and its evidence gate still passes because package allocations survive delivery. `orderBy` on the fetch orders only the batch, not retries. Separately, `exceptionResolved` is a real enum member (`prisma/schema.prisma:515`) and *is* emitted as a command (`tracking-event-mapper.ts:169`), but has no entry in `fulfillmentStatusByTrackingEvent` — so `targetStatusForCommand` returns `undefined` and an item that hit `fulfillmentException` stays `exception` permanently. I grepped every `fulfillmentStatus` write in `src/`: none clears it.

**Fix** — Give the status a monotonic rank and put it in the `where`: `fulfillmentStatus: { in: STATUSES_RANKED_BELOW[targetStatus] }`, so a late retry is a no-op rather than a regression. Add an `exceptionResolved` entry that recomputes from current evidence rather than a fixed target — which is the deeper fix in #14.

**References** — `docs/schema-reference.md:777` ("return to the summary implied by current detailed records")

---

### 13. Concurrent cart writes duplicate items and carts

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `DATA-2` Concurrency & races
- **Location:** `src/server/services/cart/cart.service.ts:223` (`upsertCartItem`), `:165` (`getOrCreateCurrentCart`)

**What** — Read-then-create with no unique constraint backing either. `CartItem` has five `@@index` entries and **zero `@@unique`**; `Cart` likewise. The enclosing `db.$transaction` calls pass no options, so they run at Prisma's default — Postgres Read Committed.

```ts
const existing = await findActiveCartItemByTerms(database, cartId, terms.id);
if (existing) return updateCartItemQuantity(database, existing.id, quantity);
return createCartItem(database, { cartId, productClientTermsId: terms.id, … });
```

**Why it matters** — Two concurrent add-to-cart requests both find `null` and both create. `checkout.data.ts:33-37` selects *all* `{deleted:false, status:"inCart"}` items and maps every one into a `UserOrderItem`, so the customer is billed twice for the same product; `removeItem` uses `findFirst` and removes only one. The same shape on `getOrCreateCurrentCart` yields two open carts, and `findCurrentCartByUserId` orders by `updatedAt desc` and returns one — silently hiding items added to the other. The UI disables the button during the mutation, which reduces but does not eliminate reachability: the `protectedProcedure` is directly callable, cart mutations carry no idempotency key, and separate tabs bypass a per-component pending flag entirely. Note the codebase knows how to do this — `operation-execution.service.ts:840` uses `Serializable` explicitly.

**Fix** — Add `@@unique([cartId, productClientTermsId])` scoped to active rows (a partial unique index via `prisma migrate` raw SQL, since Prisma cannot express partial uniqueness declaratively) and convert `upsertCartItem` to a real `upsert`. For carts, a unique partial index on `(userId)` where the cart is open.

**References** — [PostgreSQL — partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html) · [Prisma — `upsert`](https://www.prisma.io/docs/orm/reference/prisma-client-reference#upsert)

---

### 14. Aggregate status is last-event-wins with a single hand-carved evidence branch

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `MAINT-1` Separation of concerns / layering
- **Location:** `src/server/services/tracking/tracking-status-projector.ts:195`

**What** — `CartItem.fulfillmentStatus` — CONTEXT.md's "Aggregate status" — is produced by a static `eventType → status` lookup applied last-event-wins, with one branch that actually consults evidence:

```ts
// :195-212
if (command.eventType === "rolledOverPreAllocation" || command.eventType === "rolledOverPostAllocation") {
	const allocatedCount = await tx.cartItemLotItem.count({ where: { cartItemId } });
	return allocatedCount > 0 ? "partiallyRolledOver" : "rolledOver";
}
return fulfillmentStatusByTrackingEvent[command.eventType];
```

**Why it matters** — That branch is the design admitting derivation is what is needed, then implementing it for one case. Three consequences follow: the regression and dead-end of #12; the rollover branch deciding `partiallyRolledOver` from a `count()` of allocation *rows* rather than remaining decimal quantity, so an item whose entire quantity rolled over still reports "partially"; and `toUserOrderItemTimeline` (`tracking-event.service.ts:462`) deriving the same concept a *second* way via `Math.max(...reachedStageIndexes)` — monotonic — so the customer stepper and the admin status can disagree about the same item.

**Fix** — Replace the table with one derivation function that computes status from current lineage records (allocations, package allocations, shipments, roll overs, remaining quantity) and writes it monotonically. Have the customer timeline read the same function instead of its own `Math.max`. This subsumes #12 and the `exceptionResolved` gap falls out for free.

**References** — `CONTEXT.md` ("Aggregate status: … backed by more detailed operational records") · `docs/tracking-architecture.md`

---

### 15. The payment→submit transition is duplicated per gateway

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `MAINT-4` DRY vs premature abstraction
- **Location:** `src/server/services/payments/mercadopago/mercadopago-reconciliation.service.ts:112`; `checkout.service.ts:725-772`
- **Status:** ⏸ Deferred with the MercadoPago cluster

**What** — "Payment completed ⇒ submit the cart, close the order, publish `cart.item.submittedToOrder`" is inlined once per payment path. The checkout copy goes through the data layer; the reconciliation copy reimplements it with raw Prisma, a duplicated `buildSubmittedToOrderEventKey`, a different actor (`system` vs `user`), a different cart-item selection, and a direct `fulfillmentStatus` write.

**Why it matters** — The copies have already diverged, and that divergence *is* finding #31: the MP copy updates only `{deleted:false, status:"inCart"}` items but publishes events for the **unfiltered** `cart.cartItems` relation. The event-key format is textually duplicated across two files and must stay byte-identical or outbox idempotency silently breaks. A third provider means a third copy of five writes plus the key format.

**Fix** — One `submitOrderForCompletedPayment(tx, { orderId, transactionId, actor })` that every gateway result funnels into, with the event-key builder exported from a single module.

**References** — `docs/adr/0001-mercadopago-checkout-pro-reconciliation.md`

---

### 16. Diagnostics substitute for write-time invariants

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `DATA-1` Atomicity
- **Location:** `src/server/services/admin/operations-cart.service.ts:198`; `lot-diagnostics.ts:78`

**What** — `docs/schema-reference.md` §3 states normatively that the quantity represented by `CartItemLotItem` "must never exceed the original request quantity". Nothing enforces it at write time. The admin cart editor mutates `CartItem.quantity` with no look at existing allocations, and no diagnostic checks the `CartItem → CartItemLotItem` direction at all — `calculateLotDiagnostics` only compares `lotItem.quantity` against the sum of *its* allocations, so both sides stay consistent while diverging from the request.

**Why it matters** — This is the shape that produces #32 and #33: state the read-time diagnostics hunt for is state a write-time guard should have made impossible. `CartItemLotItem.cartItem` is `onDelete: Cascade`, so `hasHardDeleteBlockers` — a read-then-delete check at Read Committed — is the only thing between a concurrent `executeOperation` and cascade-deleting the lineage it just created.

**Fix** — Assert conservation inside the mutating transaction (`sum(CartItemLotItem.quantity) <= newQuantity`, `sum(PackageAllocation) <= CartItemLotItem`) and switch the lineage relations to `onDelete: Restrict`. Keep the diagnostics as a safety net for historical data, not as the primary control.

**References** — `docs/schema-reference.md` §3 · `CONTEXT.md` ("Roll over … _Avoid_: silent quantity delta")

---

### 17. `syncLocal` accepts unbounded input and issues three serial queries per item inside a transaction

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S3 × F2
- **Standard:** `SEC-7` Abuse resistance
- **Location:** `src/schemas/cart.schemas.ts:75`; `src/server/services/cart/cart.service.ts:269`

**What** — `cartSyncInputSchema.items` is `z.array(...).default([])` with no `.max()`, and the handler loops serially inside `db.$transaction`, issuing `findProductClientTermsForCart` → `findActiveCartItemByTerms` → `upsertCartItem` per item.

**Why it matters** — Any authenticated user can POST `cart.syncLocal` with 50,000 schema-valid entries; the transaction holds a pooled connection for the whole duration, blowing past the Prisma transaction timeout and starving the pool for every other request. Even benignly, a guest with 30 local products triggers 90+ serial round-trips inside one transaction on the login path — a user-facing latency path. `operationsCartUpdateInputSchema.items` has the same gap.

**Fix** — Add `.max(200)` to both schemas. Hoist the two reads out of the loop into one `findMany({ where: { id: { in: ids } } })` each, keyed into Maps, leaving only writes in the loop.

> **Resolved (2026-07-22).** Batch 5, Phase 1 (§14). `.max(200)` added to `cartSyncInputSchema.items` and `operationsCartUpdateInputSchema.items`. `syncLocal` now issues two batched `findMany` reads (`listProductClientTermsForCart` + `listActiveCartItemsByTerms`, in one `Promise.all`) before the write loop; the loop body contains only the write. **Correction to the finding's text: it was four serial queries per item, not three** — `findActiveCartItemByTerms` was issued twice (once for the merge arithmetic, again inside `upsertCartItem`); the redundant read was removed by passing the already-resolved item into `upsertCartItem`. Deliberate behaviour change: a >200-item local cart now fails the login merge with a toast and is **not** retried (`use-cart-sync.ts` sets `bootstrapCompleted` before the mutation fires) — accepted as the abuse-resistance fix.

**References** — `.agents/skills/codebase-review/references/generic-standards.md` (SEC-7, PERF-1)

---

### 18. Admin list queries are unbounded and `pageSize` is phantom

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S2 × F3
- **Standard:** `PERF-1` Query efficiency
- **Location:** `src/server/services/admin/lot.data.ts:194`, `package.data.ts:174`, `shipment.data.ts:155`, `operations-cart.data.ts:401`

**What** — Each `findMany` carries a deep detail select with **no `take`/`skip` and no `count`**; the service paginates the result in JS. `getStats` calls the same function passing `pageSize: 100`, which the query ignores entirely.

```ts
return db.lot.findMany({ where: buildLotWhere(input), select: lotDetailSelect, orderBy: [...] });
// lot.service.ts:192 — the phantom bound
const records = await listLotCandidates(database, { page: 1, pageSize: 100, … });
```

`buildLotWhere` returns `{}` when no filters are set. The lots page mounts `list` and `getStats` together, so a 5,000-lot table is fetched **twice per page load** with every `lotItem`, `cartItemLotItem`, `packageAllocation`, `cartItem`, `cart` and `user` joined — to render 20 rows and 7 counters.

**Why it matters** — Response size and parse cost grow without bound. `listOperationCarts` is worst: its input schema has no `page`/`pageSize` at all and the output is a bare `z.array(...)`, so every matching cart is serialized to the browser, unpaginated, forever.

**Fix** — Push `skip`/`take`/`orderBy` into Prisma alongside a `count()` in one `Promise.all`. Rewrite `getStats` as `groupBy({ by: ["status"], _count: true })` — `operations-cart.data.ts:419` already does this correctly with six `db.cart.count()` aggregates and is the model to copy. One honest caveat: `list` filters on a computed `diagnosticCount` that SQL cannot express, so *some* over-fetch is by design — but the deep select and missing `count` are not.

> **Resolved (2026-07-22).** Batch 5, Phases 4–5 (§14). All four entities now paginate in SQL. **Lot/package/shipment (18a):** `list*Candidates` gained `{ skip, take }` over a **narrow summary select** that no longer joins `Cart`, `User`, `Product` or `Destination`; on the unfiltered `diagnosticState: "all"` path `skip`/`take`/`count()` go into Prisma; the two computed-filter paths scan at most `DIAGNOSTIC_SCAN_LIMIT` (1000) rows and surface `truncated` to the clients. `getStats` is now exact `count`/`groupBy`/`aggregate` for every field except `withDiagnostics` (the one stat needing per-row diagnostics, capped the same way) — each aggregate's row-set equivalence verified against `schema.prisma`. **Operations cart (18b):** `operationsCartListInputSchema` gained `page`/`pageSize`, the output is now an `{ items, page, pageSize, total, pageCount }` envelope, and the user-carts page has working prev/next controls. **Correction to the finding's four locations: `operationsCart.list` has a second, unlisted consumer** — `cart-traceability-search-card.tsx` reads it as a bare array; it was migrated to `.items` in the same phase. Diagnostics behaviour is unchanged: the `calculate*Diagnostics` signatures were narrowed to the summary record type (a structural subset of the detail record), guarded by `operational-diagnostics.test.ts`.

**References** — [Prisma — pagination](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)

---

### 19. Biome fails on checked-in source

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S2 × F3
- **Standard:** `TEST-4` Type & lint gates
- **Location:** `src/features/admin/crud/supplier/supplier-form-dialog.tsx:23` and ~12 other first-party files

**What** — `pnpm check` reports **29 errors and 4 warnings** across 393 files, including an `assist/source/organizeImports` error on a rule `biome.jsonc:15` explicitly enables. Affected first-party files include `crud-delete-dialog.tsx`, `crud-page-shell.tsx`, `_lib/filter-helpers.ts`, `admin-crud.errors.ts`, four `crud-home/*/page.tsx` files — and `biome.jsonc` and `package.json` themselves.

**Why it matters** — The repo's own gate is red, so it cannot be used in CI or as a pre-merge check, and every contributor learns to ignore the noise. `pnpm typecheck` passes clean, so the project is one `pnpm check:write` away from having a usable gate.

**Fix** — Run `pnpm check:write`, commit the result as a single formatting commit, then wire `pnpm check && pnpm typecheck && pnpm test` into CI. Note `docs/tracking-architecture.md:203` declares static-only classes intentional while `biome.jsonc`'s `recommended: true` enables `noStaticOnlyClass` with no override — add the override so the documented decision and the linter agree.

**References** — `biome.jsonc:15` · [Biome — configuration](https://biomejs.dev/reference/configuration/)

---

### 20. `selectProductImage` exists five times with two different behaviours

> **Resolved (2026-07-22).** Batch 6, Phase 2 of `tmp/implementation-plan-consolidation-batch-6.md` (§13). One context-parameterized `selectProductImage(product, "cart" | "catalog")` in `commerce.helpers.ts` replaces the five service copies, **precedence preserved per context** — cart/checkout keep `cartImageUrl ?? cardImageUrl`, and two of those sites feed the persisted `productSnapshot` JSON, so flipping them would have diverged stored data silently. No default was given to `context`; that would reinstate the ambiguity the finding names. **`termsToClientTerms` was duplicated four times, not two** — `mapTerms` (`catalog.service.ts`) and `mapPreviewTerms` (`admin/product.service.ts`) have byte-identical bodies under different names; all four now call `_base/client-terms.mapper.ts`. **The count was six, not five:** `prisma/seed.ts:159` still carries a sixth copy, deferred (§13, open remnants). The located lines are `checkout.service.ts:77` and `cart.service.ts:56`.

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (6) — S2 × F3
- **Standard:** `MAINT-3` Naming & clarity
- **Location:** `checkout.service.ts:78`, `cart.service.ts:55`, `catalog.service.ts:20`, `home.service.ts:19`, `admin/product.service.ts:62`

**What** — Identical name, identical signature, identical return type — opposite precedence. Catalog/home/product return `cardImageUrl ?? cartImageUrl`; cart/checkout return `cartImageUrl ?? cardImageUrl`.

**Why it matters** — The split is plausibly deliberate (cart context prefers the cart image) but nothing says so, so a reader cannot tell which variant they are looking at without diffing. That makes it a copy-paste trap: the natural fix for "wrong image in the cart" is to copy the version from whichever file is open, silently flipping catalog behaviour. `termsToClientTerms` is likewise duplicated byte-identically between `cart.service.ts:62` and `checkout.service.ts:85`.

**Fix** — One `selectProductImage(product, context: "cart" | "catalog")` in `commerce.helpers.ts`, making the intent explicit at every call site.

**References** — `.agents/skills/codebase-review/references/generic-standards.md` (MAINT-3)

---

### 21. `decimalStringSchema` is redeclared in five schema files

> **Resolved (2026-07-22).** Batch 6, Phase 1 (§13). `decimalOutputSchema` hoisted out of `admin/_crud-schema-helpers.ts` into the neutral `src/schemas/_schema-helpers.ts` — the contract is Prisma serialization, not a CRUD concept, and 5 of its consumers sit outside `admin/`. The five local copies were verified character-identical, so the deletion is behaviour-preserving; all ~20 references were renamed rather than aliased, and the 8 existing importers repointed. **Seven declarations existed, not five:** `tracking.schemas.ts:24` (a bare `z.string()`) and `domain-events.schemas.ts:49` (regex-validated) share only the name — different contracts, deliberately left in place.

- **Recommendation:** 🟡 Preferable
- **Risk:** 🟡 Medium (6) — S2 × F3
- **Standard:** `MAINT-4` DRY vs premature abstraction
- **Location:** `cart.schemas.ts:8`, `checkout.schemas.ts:17`, `home.schemas.ts:3`, `catalog.schemas.ts:3`, `admin/payment.schemas.ts:15`

**What** — The 13-line `z.preprocess` coercing a Prisma `Decimal` to a string is duplicated five times while `_crud-schema-helpers.ts:56` already exports it as `decimalOutputSchema`. `admin/payment.schemas.ts` sits in the same directory as the helper it duplicates; `cart-traceability.schemas.ts:2` already imports the shared one, proving the path works.

**Why it matters** — 65 lines duplicating a `Decimal → string` contract every tRPC output depends on. A Prisma 7 serialization change means six edits; patch the shared one alone and cart, checkout, home, catalog and payment outputs keep the old coercion.

**Fix** — Delete the five copies, import `decimalOutputSchema`.

---

### 22. Local `requiredText`/`optionalUrl` copies have already drifted

> **Resolved (2026-07-22).** Batch 6, Phase 1 (§13). All local `requiredText` / `optionalText` / `nullishText` / `optionalUrl` copies deleted from the five admin schemas in favour of `_crud-schema-helpers.ts`. **The drift ran the opposite way from what the finding implies:** the *shared* helper was the outlier — 1 unaccented site against 4 accented, with an app-wide convention of 11:5 and 15:3 — so importing it naively would have regressed copy on three live admin forms. The shared messages were moved to the accented convention **first**, then the copies deleted, which made the dedup behaviour-preserving. `optionalUrl` was duplicated in **three** files (`brand`, `product`, `user`), not five; `address` and `supplier` carry `optionalEmail` instead. One contract change: `brand`/`product` `description` widened `.optional()` → `.nullish()`, which broke `product-form-dialog.tsx`'s `useForm` typing — resolved through the `toInlineBrandValues` helper that already existed for that purpose (§13, deviations). Two further `requiredText` copies in `checkout.schemas.ts:5` / `profile.schemas.ts:5`, and the `emptyStringToNull` helpers the shared module does not cover, remain **open** outside the finding's five files.

- **Recommendation:** 🟡 Preferable
- **Risk:** 🟡 Medium (6) — S2 × F3
- **Standard:** `CONV-3` Import & structure conventions
- **Location:** `admin/brand.schemas.ts:3`, `product.schemas.ts:12`, `user.schemas.ts:9`, `address.schemas.ts:3`, `supplier.schemas.ts:3`

**What** — Five admin schema files redeclare `requiredText`, `nullishText`/`optionalText`, and `optionalUrl` although `_crud-schema-helpers.ts` exports all three and eleven sibling files import them correctly.

**Why it matters** — The drift is not hypothetical. The shared `optionalUrl` rejects with `"Ingresa una URL valida"` (unaccented); all three local copies say `"Ingresá una URL válida"` (accented). Users see two spellings of the same error depending on which form they are in. Same split on the id validator: seven files say `"numero entero"`, five say `"número entero"`. Any future change to the shared trim/empty-string transform — the rule deciding whether a blank input clears a column or is ignored on update — reaches only the eleven importers.

**Fix** — Delete the local copies, import the shared helpers, and pick one accent convention for user-facing copy.

**References** — `.agents/skills/codebase-review/references/generic-standards.md` (A11Y-5, CONV-3)

---

### 23. Forbidden domain names surface in the admin UI

> **Resolved (2026-07-22) — the UI half.** Batch 6, Phase 4 (§13). The two badges now read `Asignacion de demanda #…` and `Asignacion empaquetada #…`, CONTEXT.md's terms for *Demand allocation* (`:33-35`) and *Packaged allocation* (`:45-47`). **Unaccented deliberately** — every sibling badge in the same array is ("Operacion", "Lote", "Paquete", "Envio"), as is the wider admin-operations copy; the accent decision made in #22 applies to validation messages, not here. Only the label strings changed; the `related.cartItemLotItem` property access is untouched. **The deeper half remains open:** renaming the Prisma models `CartItemLotItem` → `DemandAllocation` and `PackageAllocation` → `PackagedAllocation` is 73 and 59 call sites plus a migration, and deserves its own PR.

- **Recommendation:** 🟡 Preferable
- **Risk:** 🟡 Medium (6) — S2 × F3
- **Standard:** `CONV-2` ADR/decision adherence
- **Location:** `src/features/admin/crud/tracking/tracking-detail-dialog.tsx:112,115`

**What** — Two badge labels render the exact Prisma model names CONTEXT.md forbids, while every sibling label in the same array uses the correct domain term:

```ts
? `CartItemLotItem #${related.cartItemLotItem.id} - …`
? `PackageAllocation #${related.packageAllocation.id} - …`
```

CONTEXT.md:33-35 — *"**Demand allocation**: … _Avoid_: CartItemLotItem"*. CONTEXT.md:45-47 — *"**Packaged allocation**: … _Avoid_: PackageAllocation"*.

**Why it matters** — An operator reads "CartItemLotItem #14" beside "Operacion", "Lote", "Paquete", "Envio". The forbidden names become the operator's vocabulary and leak back into bug reports and code. The correct terms already exist in the codebase (`demandAllocationQuantity`, `packagedAllocationQuantity`), so this is inconsistency, not a missing concept. Worth noting the disagreement originates in `prisma/schema.prisma:803,822`, where the models carry exactly the two forbidden strings — propagating through 73 and 59 call sites.

**Fix** — Relabel the two badges now. Renaming the Prisma models to `DemandAllocation` / `PackagedAllocation` (with `@@map` preserving table names) is the deeper fix and is a good candidate for a dedicated migration PR.

**References** — `CONTEXT.md:33-35,45-47`

---

### 24. `/my-operations` overloads the reserved term "Operation"

> **Resolved (2026-07-22).** Batch 6, Phase 4 (§13). Both pages moved via `git mv` to `/my-orders`; headings read "Mis pedidos"; `MyOperationsPage` → `MyOrdersPage`. **Nine external referrers plus two self-links, not eight** — and four hold the path in a ternary-assigned `const`, so a `href="/my-operations"` grep misses them; the bare string is what to grep. Seven copy strings changed rather than the five scoped, because `"Ver mis operaciones"` also appears in `join-section.tsx` and `home-hero.tsx`. **No redirect was added** — an explicit decision, so `/my-operations` now 404s for any bookmark or previously emailed link; `next.config.js` is where a `permanent: true` redirect goes if that call changes. The finding's text below still reads `/my-operations` throughout: that is the state it describes, and rewriting it would erase what was found. Open finding **#46** was repointed to `my-orders/[orderId]/page.tsx:126`, the rename having moved the file out from under it.

- **Recommendation:** 🟡 Preferable
- **Risk:** 🟡 Medium (6) — S2 × F3
- **Standard:** `CONV-2` ADR/decision adherence
- **Location:** `src/app/my-operations/page.tsx:67`, plus 8 files linking the route

**What** — The customer-facing order list is routed at `/my-operations` and headed "Mis operaciones", while `Operation` is the internal aggregation-batch aggregate at `/admin/operations`. The page compounds it by rendering payment-attempt state under that heading — and CONTEXT.md:13-15 lists "Operation" as a forbidden alternative for *Payment attempt*.

**Why it matters** — "Operation" now refers to two unrelated aggregates in one product; an operator told to "check the user's operation" cannot tell which is meant. The page's own body copy already contradicts its heading, using the correct term: "Pedidos realizados…" and "Ver pedido".

**Fix** — Rename the route to `/my-orders` (or `/mis-pedidos`) and the heading to "Mis pedidos", updating the 8 linking files. Low-risk, high clarity.

**References** — `CONTEXT.md:13-15,21-23`

---

### 25. MercadoPago payments never submit the order (dead guard)

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ A single line, but it silently breaks 100% of MercadoPago orders after money is captured. Highest real-world priority in this report.
- **Standard:** `DATA-3` Idempotency
- **Location:** `src/server/services/payments/mercadopago/mercadopago-reconciliation.service.ts:225` (guard at `:116`)
- **Status:** ⏸ Deferred with the MercadoPago cluster

**What** — The submit function is passed the *post-update* `completedAt`, so its own early-return guard is always true:

```ts
// :116 — the guard
if (attempt.completedAt) return;
// :222-227 — the only call site; the spread is overridden by the freshly-written date
if (status === "completed") {
	await submitOrderAfterCompletedPayment(tx, { ...attempt, completedAt: updated.completedAt });
}
```

`updated.completedAt` is non-null on every path where `status === "completed"` (`:190-195`), so the guard fires on the very first webhook. Lines 118-177 have never executed.

**Why it matters** — On every approved MercadoPago payment: `UserTransaction.status = "completed"` and money is captured, but cart items stay `inCart`, cart stays `atCheckout`, `UserOrder.status` stays `pending`, and zero `cart.item.submittedToOrder` events are published. Since `listOriginalDemand` requires cart and item status `submitted`, every paid MP order is permanently invisible to operations — nothing is sourced, packaged, or shipped. `shouldDispatchDomainEvents` is still set true and `wake()` fires on an empty outbox, so the failure is invisible. No other path compensates: `submitCartItems` is called only from the mock-gateway branch. Contrast `:274`, `const wasCompleted = attempt.status === "completed"`, which reads the pre-update value correctly.

**Fix** — Capture the pre-update value before the write:

```ts
const wasAlreadyCompleted = Boolean(attempt.completedAt);
// … perform the update …
if (status === "completed" && !wasAlreadyCompleted) {
	await submitOrderAfterCompletedPayment(tx, attempt);
}
```

⚠️ **Do not fix this in isolation.** The code it un-blocks contains #31 — an unfiltered cart-item loop that throws and rolls back the whole reconciliation. Land #25, #31, and #10 together, with the test from #1 covering the sequence.

**References** — `docs/adr/0001-mercadopago-checkout-pro-reconciliation.md`

---

### 26. The mock payment gateway approves real orders in production

- **Recommendation:** ⛔ Antipattern
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Reachable by any authenticated user through the normal UI; yields a fulfillable order with no money. Single occurrence is still free goods.
- **Standard:** `SEC-3` Input validation & sanitization / `DATA-4` Server-authoritative decisions
- **Location:** `src/server/services/checkout/payment-gateway.ts:93`; branch at `checkout.service.ts:708`
- **Status:** ⏸ Deferred with the MercadoPago cluster

**What** — A test double is the module-level singleton on the production checkout path, with no environment guard anywhere in the 94-line file:

```ts
export const paymentGateway = new MockPaymentGateway();   // only impl of PaymentGatewayPort
// :77-80 — succeeds for any label lacking fail|error|rechazo
return { status: "succeeded", provider: "mock", providerStatus: "approved", … };
```

**Why it matters** — Fully user-reachable in six steps, no admin involvement: add a payment method of any non-`mercadopago` type via the normal dialog (`checkout.data.ts:324` hardcodes `provider: "mock"`) → it is returned by `listCheckoutPaymentMethods` and rendered as selectable → `mercadoPagoConfig` resolves to `null` → line 672 falls through to `capturePayment` → `"succeeded"` → lines 726-732 run `submitCartItems`, set cart `submitted`, order `processing`, and publish `cart.item.submittedToOrder`. Real demand enters the fulfillment pipeline with zero money moved, no `PaymentProviderEvent`, and no provider record. This also contradicts ADR-0001, which specifies pending-attempt + webhook reconciliation as *the* payment model.

**Fix** — Two layers. (1) Refuse to construct the mock outside development: `export const paymentGateway = env.APP_ENV === "production" ? new UnavailableGateway() : new MockPaymentGateway()` — and note #36, `APP_ENV` currently defaults to `"development"`, so fix that first or the guard is inert. (2) Constrain the payment-method creation schema so users cannot mint `provider: "mock"` methods at all, and filter non-provider-backed methods out of `listCheckoutPaymentMethods`.

**References** — `docs/adr/0001-mercadopago-checkout-pro-reconciliation.md` · [OWASP — Business Logic Abuse](https://owasp.org/www-community/vulnerabilities/Business_logic_vulnerability)

---

### 27. Null `stepPrice` silently charges the flat MOQ price

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ A single admin data-entry state produces an unbounded, silent undercharge on every subsequent purchase.
- **Standard:** `DATA-4` Server-authoritative decisions
- **Location:** `src/shared/common/commerce.helpers.ts:179` (`calculateLineTotal`)
- **Status:** ⏸ Deferred with the money cluster

**What** — The guard treats "no step price" as "no step pricing", ignoring the quantity entirely:

```ts
if (!step || step <= 0 || stepPrice === null || quantityNumber <= moq) {
	return toMoneyString(moqPrice);
}
```

The decisive question is whether `normalizeCartQuantity` clamps the quantity back to `moq` in that configuration — it does not. It reads `step` only and never consults `stepPrice` (`:101-110`).

**Why it matters** — Verified by execution. Terms `moq=100, moqPrice=500, step=10, stepPrice=null`, quantity 1000: normalized quantity stays **1000**, line total returns **500.00**. Control with `stepPrice=50` returns 5000.00 — a **10x undercharge**. The configuration is fully legal: `product-client-terms.schemas.ts:34-35` are independent `optionalDecimalString` with no cross-field refinement (the only `.superRefine` touches the date range), `prisma/schema.prisma:279-280` are independently `Decimal?`, the data layer writes `stepPrice: input.stepPrice ?? null` with no guard, and the admin form labels the field optional. The wrong figure flows to `UserTransaction.amount`, is frozen into the immutable `priceSnapshot`, and drives the MercadoPago preference. `prisma/seed.ts:152` replicates the same shortcut, so the behaviour is consistent-by-duplication rather than validated anywhere.

**Fix** — Two guards. (1) In the schema, a `.superRefine` requiring `stepPrice` whenever `step` is present (and vice versa) — the terms are incoherent otherwise. (2) In `calculateLineTotal`, throw rather than silently fall back when `step > 0 && stepPrice === null && quantity > moq`; a pricing helper should never guess. Add the characterization tests from #1 over the full MOQ/step matrix.

**References** — `CONTEXT.md` ("MOQ … priced as a block by the client terms, with optional step increments above it")

---

### 28. One cart can create multiple payable orders

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Double-charges a real customer; reachable with a browser back-button.
- **Standard:** `DATA-2` Concurrency & races / `DATA-3` Idempotency
- **Location:** `src/server/services/checkout/checkout.service.ts:628`
- **Status:** ⏸ Deferred with the MercadoPago cluster

**What** — `confirmAndPay` creates a `UserOrder` + `UserTransaction` with no cart-status assertion, no row lock, and no uniqueness on `UserOrder.cartId` (`prisma/schema.prisma:547` has `@@index([cartId])`, not `@@unique`; no migration adds one). The MP branch returns at `:689` without moving the cart out of `atCheckout`, which `findCheckoutCartByUserId` still accepts.

**Why it matters** — The idempotency short-circuit is key-only (`findUnique` on `idempotencyKey`), and the key is a client-supplied uuid regenerated by `useState(() => crypto.randomUUID())` on remount — browser-back or a second tab suffices. Sequence: `start()` → `confirmAndPay(keyA)` → order A + preference A → return to `/checkout` → `confirmAndPay(keyB)` → order B + preference B. Both `init_point` URLs are live for 60 minutes and both are payable; MercadoPago will not dedupe because `external_reference` is per-transaction, and the reconciliation guard is per-transaction too. Downstream, `listOriginalDemand` has no per-cart-item dedupe and `materializeAssignments` **sums** both under one `allocationKey` (`:550`), so the supplier lot item is overstated by 2x. This contradicts the plan, which specifies that a retry creates a new `UserTransaction` for the *same* `UserOrder`.

**Fix** — Add `@@unique([cartId])` on `UserOrder` (or a partial unique index on non-cancelled orders), assert the cart is not already ordered inside the transaction, and move the cart to a terminal status on the MP branch as well. Have `getExistingPaymentResult` look up by cart in addition to idempotency key so a retry returns the prior result rather than minting a second order.

**References** — `docs/plans/mercadopago-checkout-admin.md:199-201`

---

### 29. The MercadoPago charged amount diverges from the recorded amount

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Charges customers an amount the system never recorded; reproduces on the repo's own seed data.
- **Standard:** `DATA-4` Server-authoritative decisions
- **Location:** `src/server/services/payments/mercadopago/mercadopago-preference.service.ts:52,57`
- **Status:** ⏸ Deferred with the MercadoPago cluster

**What** — The preference derives `unit_price` by float division of the line total and independently rounds the quantity, while sending no authoritative total:

```ts
const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal;
	quantity: Math.max(1, Math.round(quantity)),
	unit_price: Number(toMoneyString(unitPrice)),
```

The request body (`:72-105`) contains `items`, `payer`, `back_urls`, `metadata` — and **no `total_amount`**. `transaction.amount` is declared in the input type at `:25` and never referenced in the body, so MercadoPago derives the charge solely from the line items.

**Why it matters** — Reproduces on seed data: `prisma/seed.ts:1241` tomate (`moq=20, moqPrice=24000, step=10, stepPrice=11000`), quantity 30 → recorded **35000.00**, MP charges 30 × 1166.67 = **35000.10**. Quantity 140 → +0.60; quantity 130 → −0.60. 225 of the valid quantities across the 7 seeded terms diverge. The fractional path is far worse: `CartItem.quantity` is `Decimal(18,4)`, `ProductUnit` includes `kg`/`gr`/`lb`, and no `.int()` constraint exists — with `moq=step=0.5`, quantity 2.5 records 4600.00 but sends 3 × 1840.00 = **7360.00**.

**Fix** — Send one line item representing the order total (`quantity: 1, unit_price: Number(transaction.amount)`) with the per-product detail in `metadata`, so the charged amount is the recorded amount by construction. If per-item lines are required for the payer's benefit, compute them with decimal arithmetic and assert `sum(items) === transaction.amount` before calling the API, failing loudly otherwise. The repo already has `decimal()`/`sumDecimals()` helpers in `operational-diagnostics.types.ts`.

**References** — `docs/schema-reference.md:94` ("Floating-point math is not acceptable") · [Mercado Pago — Preferences API](https://www.mercadopago.com.ar/developers/en/reference/preferences/_checkout_preferences/post)

---

### 30. Reconciliation never verifies the amount actually paid

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Any approved payment settles the order regardless of sum or currency.
- **Standard:** `DATA-4` Server-authoritative decisions
- **Location:** `src/server/services/payments/mercadopago/mercadopago-reconciliation.service.ts:185`
- **Status:** ⏸ Deferred with the MercadoPago cluster

**What** — The outcome is decided purely from the provider status string. `grep -rn "transaction_amount" src/ prisma/` returns **zero hits repo-wide**; the reconciliation service contains no occurrence of `amount` or `currency` at all.

**Why it matters** — `attempt.amount`/`attempt.currency` are written at `checkout.data.ts:423` and never read back for verification anywhere, including the admin payment service. So: the divergences from #29 are accepted as clean completions with no discrepancy signal in the attempt row, the `PaymentProviderEvent`, or the admin view; an approved payment in a different currency settles the attempt; and a partially-refunded MP payment (status stays `approved`, `transaction_amount_refunded > 0`) reconciles as a clean `completed`. Because `findAttemptForPayment` matches on `external_reference` alone when `providerPaymentId` is unset, any payment carrying that reference satisfies the lookup regardless of sum.

**Fix** — Before applying `completed`, compare `payment.transaction_amount` and `payment.currency_id` against `attempt.amount`/`attempt.currency` using decimal equality. On mismatch, record a discrepancy on the attempt and the provider event, leave the attempt un-completed, and surface it in the admin payments view. Check `transaction_amount_refunded` and map a partial refund to its own status rather than `completed`.

**References** — `docs/adr/0001-mercadopago-checkout-pro-reconciliation.md` ("reconciles the final result through signed webhooks followed by a Mercado Pago resource lookup")

---

### 31. The cart stays writable during checkout

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Silently drops paid-for demand today, and becomes a reconciliation-killer the moment #25 is fixed.
- **Standard:** `DATA-1` Atomicity
- **Location:** `src/server/services/cart/cart.data.ts:112`; consumers at `checkout.data.ts:194`, `mercadopago-reconciliation.service.ts:104,144`
- **Status:** ⏸ Deferred with the MercadoPago cluster

**What** — The cart-mutation lookup accepts `atCheckout`, and the submit paths sweep every `inCart` row rather than the items snapshotted onto the order:

```ts
// cart.data.ts:110-113
status: { in: ["draft", "pending", "atCheckout"] },
// checkout.data.ts:194-199 — sweeps by cart, not by order
return db.cartItem.updateMany({ where: { cartId, deleted: false, status: "inCart" }, … });
```

**Why it matters** — Two distinct failures. **Added item:** the user adds a product from a second tab during the payment window; `submitCartItems` flips it to `submitted` along with the real order items, but it has no `UserOrderItem`, so `listOriginalDemand` never sees it and `findCurrentCartByUserId` no longer returns the cart — the item silently vanishes from the cart, sits on no order, and enters no operation. **Removed item:** a soft-deleted row is still loaded by `findAttemptForPayment`'s unfiltered `cart: { include: { cartItems: true } }`, and the submit loop throws `INTERNAL_SERVER_ERROR` on it, rolling back the entire reconciliation of an already-captured payment. Note the asymmetry that causes it: the `updateMany` is filtered, the *event loop* is not. That throw is unreachable today **only** because #25 makes the block dead code.

**Fix** — Lock the cart for the checkout window: reject cart mutations when the cart is `atCheckout` (returning a clear "checkout in progress" error the UI can surface), and drive both submit and event publication from `UserOrderItem`/`sourceCartItemId` rather than from the live cart relation. Filter the `cartItems` include to `{ deleted: false, status: "inCart" }` to match `checkoutCartSelect`.

**References** — `CONTEXT.md` ("prices and quantities snapshotted at confirmation while the cart stays the live source of truth until then")

---

### 32. An admin quantity edit rewrites paid orders

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Desynchronizes a paid order from its payment with no audit trail.
- **Standard:** `DATA-4` Server-authoritative decisions
- **Location:** `src/server/services/admin/operations-cart.data.ts:476`; caller `operations-cart.service.ts:198`

**What** — An unfiltered `updateMany` over every `UserOrderItem` for a cart item, with no order-status guard:

```ts
await db.userOrderItem.updateMany({ where: { sourceCartItemId: cartItemId }, data: { quantity } });
```

This is the only post-creation write to `UserOrderItem.quantity` in all of `src/server`.

**Why it matters** — A paid order with quantity 10 becomes quantity 40 when an admin edits the cart. `priceSnapshot` is written exactly once at order creation and never recomputed; `UserTransaction.amount` is written once and the admin path performs zero transaction writes. So the order claims 40 units against a payment for 10 — and `listOriginalDemand` reads `userOrderItem.quantity` *specifically on orders with a completed transaction*, so the supplier is asked for 40. The admin input is `requiredDecimalString("Cantidad", 4)` (format only) while the customer path calls `normalizeCartQuantity`, so the stored quantity need not even be a valid MOQ/step multiple. No status gate exists in the router, and the UI disables the field only when `cart.deleted`. Note the asymmetry: the *removal* branch of the same function is lineage-aware; the quantity branch is not.

**Fix** — Refuse to mutate quantities on cart items belonging to an order with a completed transaction; require an explicit compensating flow (refund/credit or a roll over) instead. If mid-flight edits must be supported, recompute `priceSnapshot` and record a transaction adjustment in the same transaction. Apply `normalizeCartQuantity` on the admin path too.

**References** — `docs/schema-reference.md:74` ("never recalculate old commercial records from current mutable tables")

---

### 33. Cancelling allocated demand creates no roll over

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Produces exactly the "silent quantity delta" CONTEXT.md names as forbidden.
- **Standard:** `DATA-1` Atomicity
- **Location:** `src/server/services/admin/operations-cart.service.ts:229`; `operations-cart.data.ts:506`

**What** — `hasOperationalLinks` is **not a guard** — it only selects the status label, so cancelling an allocated item is fully reachable and merely sets flags on the cart item:

```ts
const hasOperationalLinks = item.operationalLinkCount > 0 || item.orderItemCount > 0;
await softDeleteCartItem(database, item.id, hasOperationalLinks);
```

**Why it matters** — A 50 kg item allocated into `CartItemLotItem` (50) and `LotItem.quantity` (50, already requested from the supplier) is cancelled: the allocation row survives at 50, the lot item stays 50, and no `RollOver` is written. The supplier is still asked for 50 kg of demand that no longer exists. Grep of all of `src/` finds exactly **one** `rollOver.create` (`operation-execution.service.ts:609`) with a hardcoded `stage: "preAllocation"`; `cartItemLotItem` has only a `.create` — no delete or update anywhere — and `lotItem.update` exists only at allocation time. Consequently `RollOverStage.postAllocation`, the `rollover.postAllocation.created` event, the `rolledOverPostAllocation` tracking type, and the `partiallyRolledOver`/`rolledOver` statuses are all declarations no code path can produce.

**Fix** — On cancellation of an allocated item, inside one transaction: create a `postAllocation` `RollOver` for the allocated quantity, decrement `LotItem.quantity` (or mark the allocation void), and publish `rollover.postAllocation.created`. This is the missing half of the roll-over mechanism the schema already models.

**References** — `CONTEXT.md:53-55` ("**Roll over**: quantity that dropped out of the current fulfillment path … _Avoid_: silent quantity delta")

---

### 34. Rolled-over demand is excluded from every future operation

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Paid demand is silently never sourced; the default configuration triggers it.
- **Standard:** `DATA-4` Server-authoritative decisions
- **Location:** `src/server/services/operations/operation-execution.service.ts:262`

**What** — `listOriginalDemand` excludes any cart item having a `RollOver` row of **any** status, while `includeRollOver` defaults to `false` at every layer:

```ts
sourceCartItem: { …, cartItemLotItems: { none: {} }, rollOvers: { none: {} } },
// :435-437 — the other half, gated off by default
const rollOverDemand = operation.includeRollOver ? await listOpenRollOverDemand(…) : [];
```

**Why it matters** — Item X, quantity 18, supplier moq 10 / step 5. Operation 1 assigns 15 and opens a roll over of 3. Operation 2 runs with the default `includeRollOver: false`: `listOpenRollOverDemand` is never called, *and* `listOriginalDemand` now skips X because the `rollOvers: { none: {} }` predicate fails. The predicate matches any status including `rebatched`, so the exclusion is permanent, not transient. The customer paid for 18; 3 are never ordered by any future operation. `fulfillmentStatus` stays `partiallyRolledOver` and no diagnostic fires, because the `RollOver` row itself still looks healthy.

**Fix** — Narrow the predicate to open roll overs only (`rollOvers: { none: { status: "open" } }`), so a rebatched item returns to the original-demand pool. Default `includeRollOver` to `true` — leaving paid demand unsourced should require opting *out*, not opting in. Add a diagnostic for "open roll over older than N operations".

**References** — `CONTEXT.md` ("**Roll over**: … must be rebatched or otherwise resolved")

---

### 35. The cart survives logout and merges into the next user's cart

> **Resolved (2026-07-22).** Phase 2 of `tmp/implementation-plan-session-and-env-hardening.md`. Four layered defences (§12): `decideCartBootstrap` refuses to merge a cart attributed to another user (`discard` evaluated first); the logged-out effect branch wipes an attributed cart on any RSC re-render, which is the general case the sign-out handler cannot cover; `user-menu.tsx` resets after a successful sign-out; and the cross-tab rehydrate path checks identity. `clear()` keeps its post-checkout semantics — the new `resetForNewSession()` is a distinct action. Persist `version` bumped `1 → 2`, discarding every existing local cart once. **The guest → login merge is preserved but verified only by a unit assertion on the decision function, never against a running app.**

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ Cross-user data exposure on any shared or public browser.
- **Standard:** `SEC-6` Sensitive data exposure
- **Location:** `src/features/cart/use-cart-sync.ts:56`; `src/store/cart-store.ts:100`

**What** — Sign-out calls `detachServerCart()`, which nulls the server refs but leaves `items` in the persisted store. `clear()` — the only action that empties items — is never called on the sign-out path:

```ts
// use-cart-sync.ts:65-67
const shouldMergeLocal = Object.keys(items).length > 0 &&
	(serverCartId === null || syncedUserId !== userId);
```

The only `signOut` handler (`components/user-menu.tsx:44-54`) calls `authClient.signOut()` then routes away — no cart call — and no `localStorage.removeItem` for the cart key exists anywhere in `src/`.

**Why it matters** — After user A signs out, **both** disjuncts of `shouldMergeLocal` are true, so user B signing in on the same browser triggers `cart.syncLocal` with A's items. The server resolves B's cart and blends them in via `mergedQuantity`; item provenance is never checked. B silently inherits A's products and can check out with them. There is no configuration in which the merge is skipped.

**Fix** — Call `clear()` on sign-out (in the `user-menu` handler and, defensively, in the `!isAuthenticated` branch of the sync effect). Better: key the persisted store by user id so a different session cannot read the previous one's slice at all. Server-side, consider rejecting `syncLocal` payloads when the store's `syncedUserId` does not match the session.

**References** — [OWASP — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

### 36. `APP_ENV` fails open and a security branch reads a Spanish substring

> **Resolved (2026-07-22).** Phase 1 of `tmp/implementation-plan-session-and-env-hardening.md`. `APP_ENV` now derives from `NODE_ENV` via `src/env.helpers.js`, and an inconsistent production build throws at `next.config.js` load time. The webhook decision reads the `canProcessUnsigned` boolean through `resolveWebhookSignatureOutcome`; `rejectedReason` is audit-only and no `.includes("procesada")` remains. A missing webhook secret gets its own audit message instead of a synthetic `SignatureMismatch`. **Two corrections to the text below, detailed in §12: the `error.reason` injection vector is latent rather than live (the SDK enum is closed and ASCII), and the toggle is gated by `superadminProcedure`, not `adminProcedure`.** Runtime behaviour on a production deploy is **not verified** — see §12's "Not verified" (check b).

- **Recommendation:** 🔴 Must-fix
- **Risk:** 🟡 Medium (4) — S4 × F1
- **Urgency:** ⚡ A production deploy silently sits in "development" mode; the webhook's accept/reject decision is coupled to display text.
- **Standard:** `OPS-3` Config & environments / `SEC-3` Input validation
- **Location:** `src/env.js:18`; `src/app/api/mercadopago/webhook/route.ts:96`

**What** — Two related defects.

```js
// env.js:18-20 — defaults to development, and NOTHING in the toolchain ever sets APP_ENV
APP_ENV: z.enum(["development", "test", "production"]).default("development"),
// webhook/route.ts:96 — re-derives the security decision from a display string
if (!signatureValid && !rejectedReason?.includes("procesada")) {
```

**Why it matters** — Unlike `NODE_ENV` (which `next start` sets automatically), nothing sets `APP_ENV`, and it appears in neither `.env` nor `.env.example`. A correct production deploy therefore has `APP_ENV === "development"`, which is the environment half of the gate on `canProcessUnsignedMercadoPagoWebhook`. Exploitation additionally requires an admin to toggle `allowUnsignedWebhooksInDevelopment` (default `false`) — but note #7 makes "admin" self-service. It also relaxes the HTTPS callback-URL check. Separately, the `canProcessUnsigned` boolean is computed at `:80` and then *not used* for the decision; the branch re-derives from the Spanish message assigned at `:87`. A typo fix or translation silently flips behaviour, and `:91` interpolates SDK-controlled text (`Firma inválida: ${error.reason}`) into the very string the security branch matches — any reason containing "procesada" would cause an invalid signature to be **accepted**.

**Fix** — Derive `APP_ENV` from `NODE_ENV` by default rather than hardcoding `"development"`, add it to `.env.example`, and fail startup in production if it is inconsistent. Replace the substring test with the `canProcessUnsigned` boolean already in scope.

**References** — [Mercado Pago — webhook signature validation](https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks#bookmark_signature_validation)

---

### 37. N+1 in cart traceability diagnostics

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (4) — S2 × F2
- **Standard:** `PERF-1` Query efficiency
- **Location:** `src/server/services/admin/cart-traceability.service.ts:29,42,56,93`

**What** — Three diagnostics builders issue a `findUnique` per id inside `Promise.all(ids.map(...))`, each using a deep multi-level detail select; shipments add a second serial round-trip for tracking events. The dedup helper's own doc comment (`cart-traceability.data.ts:186`) promises *"a bounded number of batched reads instead of an N+1 per allocation"* — ids are deduped, but nothing is batched. Separately, per-item timelines are fetched individually although the cart-level timeline fetched alongside is a strict superset (same `where` scope, same select, same mapper, and the mapper emits `cartItemId`).

**Why it matters** — A cart with 40 items across 120 lots, 80 packages and 40 shipments issues ~280 deep-tree queries where 4 would do, plus 41 timeline queries where 1 would do — and the 40 extra return zero rows the cart query did not already return.

**Fix** — One `findMany({ where: { id: { in: ids } }, select: … })` per entity type, one `cartItemTrackingEvent.findMany` for shipments, and group the cart timeline by `cartItemId` in memory instead of refetching.

> **Resolved (2026-07-22).** Batch 5, Phase 2 (§14). `getCartTraceability` now issues one `listLotsByIds` / `listPackagesByIds` / `listShipmentsByIds` `findMany` per entity type, plus one `listShipmentIdsWithTrackingEvents` (a single `cartItemTrackingEvent.findMany` with `distinct: ["shipmentId"]` — presence is all `calculateShipmentDiagnostics` consumes), and one `getAdminCartTimeline`. The per-item `getAdminCartItemTimeline` calls are gone: the new pure helper `groupTimelineByCartItem` buckets the cart timeline (a strict superset) by `cartItemId` in memory, covered by a unit test. The `collectLineageEntityIds` doc comment's promise of batched reads is now true. `assembleCartTraceability`'s signature and `cart-traceability.service.test.ts` are untouched.

---

### 38. Filter dropdowns download whole dimension tables

- **Recommendation:** 🟠 Strong
- **Risk:** 🟡 Medium (4) — S2 × F2
- **Standard:** `PERF-1` Query efficiency
- **Location:** `src/app/admin/operations/user-carts/_components/user-carts-client.tsx:117`

**What** — The page mounts five queries, three of which are unbounded whole-table reads used only to populate `<option>` lists: `user.list` with `includeDeleted: true`, `product.list`, and `productClientTerms.list` — all backed by `findMany` with no `take`.

**Why it matters** — Opening the page downloads the entire user table (every name and email), the product table and the terms table before the filter bar renders — on top of the unbounded cart list from #18. At 5,000 users and 2,000 products that is ~7,000 DOM option nodes for controls where the operator picks one value.

**Fix** — Back these selects with a searchable endpoint taking a `search` term and `take: 50`. The repo already has a `ProductCombobox` component built for exactly this shape.

> **Resolved (2026-07-22).** Batch 5, Phase 6 (§14). Three new `adminProcedure` endpoints — `admin.{user,product,productClientTerms}.options` — take `search` + `take: 50` (default) + `selectedValue` (so the currently-chosen filter still renders its label even when it falls outside the first 50). `Combobox` gained an opt-in server-search mode (`onSearchChange` turns off cmdk's client filter; `loading` renders a "Buscando..." row); a `useDebouncedValue` hook (250 ms) throttles typing. The three user-carts filter dropdowns are now search-backed comboboxes. **Correction to the finding's text: `ProductCombobox` was *not* "built for exactly this shape"** — it takes the whole `ProductListItem[]` array and filters client-side through cmdk, solving the DOM-node count but not the download; a server-search mode had to be added. **Deviation:** `admin.user.list` and `admin.product.list` are gone from the page, but `admin.productClientTerms.list` remains — the edit form (`OperationsCartDetailForm`) needs the full client-terms records (product, moq, pricing) that the lightweight `options` endpoint omits, so that one list query is kept solely for the form, not the filter. The finding's "purely to fill option lists" premise held for user/product but not for client-terms.

---

### 5.3 Low-band findings (condensed)

Each is real and verified; none warrants a full narrative.

| # | Finding | Location | Cost & fix |
|---|---|---|---|
| 39 | **Closed 2026-07-22 (§13); the stated fix was insufficient — the file shrinks, it does not disappear.** `home-formatters.ts` is a near-complete fork of `commerce.helpers.ts` — `productUnitLabelMap`, `quantityFormatter`, `formatCurrency`, `formatQuantity` all duplicated; the two "different" unit/currency types resolve to identical unions. Its local `toNumber` is weaker (returns `0` for empty input where the shared one returns `null`). | `home-formatters.ts:7` | Home page shows a different price from the product page it links to after any formatting change. Delete the fork, import `commerce.helpers`. |
| 40 | **Closed 2026-07-22 (§13); "character-identical" is refuted and the count is 30 sites in 28 files, not 25.** `IdTooltip`/`DateTooltip` re-declared privately in `operation-table.tsx`, narrower than the exported ones — but without the comment documenting why the trigger must be a bare `asChild` span (row click-through). The same `Intl.DateTimeFormat("es-AR", …)` literal appears in **25** files. | `operation-table.tsx:40` | Import the shared components; hoist one formatter module. |
| 41 | `billingAddressSnapshot` is populated with the *shipping* snapshot; `createUserOrder`'s input type has no billing field at all, and no billing address is collected anywhere in checkout. Not out of scope — `AddressType.billing` exists and the seed creates a distinct `buyerBilling`. | `checkout.data.ts:391` | Orders permanently assert the wrong billing address; a chargeback is defended with fabricated evidence. Collect billing (defaulting to shipping) and snapshot it. `docs/schema-reference.md:66,842`. |
| 42 | `attributeItemDiagnostics` attributes at *lot* granularity while `calculateLotDiagnostics` emits at *lot-item* granularity. The test claiming to verify this uses a fixture where no two items share a lot, so it passes either way. | `cart-traceability.assembler.ts:65` | Customer A sees a critical diagnostic caused by customer B's line. Key by `lotItemId`; fix the fixture so it can fail. |
| 43 | An outbox event with zero matching listeners is marked `processed`. Eligibility is gated by a hand-maintained `supportedEventTypes` Set duplicating the mapper's 17 `case` labels. Currently latent — all lists match — and the mapper's exhaustive switch is a partial canary, but the Set is not type-enforced. | `domain-event-dispatcher.ts:145` | Add a distinct "unhandled" outcome; derive `supports()` from the mapper's coverage instead of a parallel list. |
| 44 | **Resolved 2026-07-22 (§14).** `materializeAssignments`/`materializeRollOvers` create rows one at a time in sequential loops inside a **Serializable** transaction, plus a per-assignment `lotItem.update({ increment })` where the map is already accumulating. | `operation-execution.service.ts:556,603` | ~600 sequential round-trips for a 200-item operation, lengthening the Serializable window and raising retry rates. Use `createManyAndReturn`; write summed quantities once. **Fixed:** a pure `groupAssignments` pass generates every code, then four bulk `createManyAndReturn` writes (supplier orders → lots → lot items → demand allocations, FK order) join returned ids by `code`/`lotItemId`; roll overs bulk-insert with a filter-then-zip + length assertion. ~600 → ~12 statements. #57 (dead `includedSourceRollOverIds.add`) deleted incidentally. |
| 45 | **Resolved 2026-07-22 (§14) — schema declared, migration deferred to the owner.** `RollOver` is indexed on `cartItemId`/`operationId` only, none on `status`. `listOpenRollOverDemand` filters `status: "open"` with a non-sargable `operationId: { not: … }` and sorts by `createdAt, id`. | `prisma/schema.prisma:855` | Seq-scan of a table that only grows (rows are transitioned, never deleted), inside the Serializable transaction. Add `@@index([status, createdAt, id])`. **Done:** `@@index([status, createdAt, id])` declared and `pnpm db:generate` run; **no migration was created or applied** — the owner applies it manually. Inert until then; the query is correct either way. |
| 46 | Bare `catch { notFound(); }` around two API calls converts DB outages and Zod output-parse failures into 404s, unlogged (`createCaller` has no `onError`). | `my-orders/[orderId]/page.tsx:126` | Incidents are invisible; users are told their order does not exist. Catch and rethrow non-`NOT_FOUND` errors. |
| 47 | `updateCheckoutPaymentMethod` lets a user rewrite `type` on the provider-managed MercadoPago method, breaking the `find` half of `findOrCreateMercadoPagoPaymentMethod` (which requires both `type` and `provider` to equal `"mercadopago"`). | `checkout.data.ts:341` | A new `PaymentMethod` row is created on every `checkout.start()` thereafter — unbounded growth. Exclude provider-managed rows from user updates. |
| 48 | `PaymentProviderEvent` is a second hand-rolled inbox (`status`/`retryCount`/`lastError`) beside the outbox, with the failure-bookkeeping bug of #10. | `mercadopago-reconciliation.service.ts:258` | Record receipt, publish a domain event, and let the dispatcher's claim/retry/audit machinery drive reconciliation. |
| 49 | `PaymentGatewayPort` has one implementation (the mock) and one caller, and the only production provider routes around it — provider identity then leaks back into the generic result builder as a `provider === "mercadopago"` ternary. | `payment-gateway.ts:36` | The typed interface constrains nothing about the code that takes money. Model both outcomes (`captured` \| `redirectRequired`) so MP is an adapter behind the port. |
| 50 | `checkout-client` mirrors server state into `useState` seeded by a ref-guarded effect, then hand-splices it in four near-identical `setCheckout` blocks. | `checkout-client.tsx:143` | ~86 lines of manual cache maintenance; any fifth mutation must add a fifth splice or serve stale data. Use `utils.checkout.getState.invalidate()`. |
| 51 | `ConfigEditor` mirrors three props into state and re-seeds them in an effect, so `invalidatePayments()` after an adjacent mutation resets a form the admin is editing. | `payments-admin-client.tsx:270` | Initialize state directly and remount via `key={config.id}`; removes the effect, the nullable `settings`, and a defensive branch. |
| 52 | `profile.router.ts` is the only router in the repo that queries and mutates Prisma directly; no `profile.service.ts`/`profile.data.ts` exists. It writes `User` rows with no service boundary and no audit entry. | `profile.router.ts:25,41` | Audit logging or soft-delete filtering added at the service layer will silently not apply here. Extract a service/data pair. |
| 53 | `docs/tracking-architecture.md`'s "Current Producers" lists only checkout and admin operations — omitting `mercadopago-reconciliation.service.ts`, now the producer of `cart.item.submittedToOrder` for every MP order. The doc is wrong, not the code. | `docs/tracking-architecture.md:418` | Anyone auditing submitted-to-order lineage from the doc misses the primary path. Update when #25/#15 land. |
| 54 | `payment.service.ts` is the only admin service writing `db.auditLog.create` raw and outside the transaction; 14 siblings use `writeAdminAuditLog`. | `admin/payment.service.ts:117,136` | Audit rows survive a rolled-back mutation. Use the shared helper inside the transaction. |
| 55 | **Deliberately kept — see §13.** `checkout.getState` is a 28-line near-copy of `start` (differing only in the `atCheckout` write and find-vs-create), exposed on the router with **no caller** anywhere in `src/` or `e2e/`. | `checkout.service.ts:481` | Delete it, or parameterize `start({ claimCart })`. |
| 56 | `domainEventTypeSchema` re-lists all 17 event literals the discriminated union already carries; its only referent, `DomainEventType`, has zero consumers. | `domain-events.schemas.ts:294` | A new event must be added in two places, and forgetting the second produces no error. Delete both; `DomainEventInput["type"]` yields the same union. |
| 57 | **Closed incidentally 2026-07-22 (§14).** A guarded `includedSourceRollOverIds.add` is superseded 30 lines later by an unconditional pass over the same array, making it dead — and misleading about the function's intent. | `operation-execution.service.ts:605` | Delete the three lines; fold the trailing block into the `updateMany`. **Done:** the Batch 5 #44 rewrite of `materializeRollOvers` computes the rebatched id set once from all inputs; the dead guard is gone. |
| 58 | **Corrected 2026-07-22 — see §13.** `dayjs` is **live**: `date.helpers.ts` imports it plus the `utc` and `timezone` plugins, and 17 files consume that module. Removing it breaks the build. That is the "better for `dayjs`" option in the original text, already taken by #2's fix. Genuinely dead: `lodash` (0 imports) and **`bluebird`** (`package.json:41`, 0 imports, no `@types`) — the latter surfaced during Batch 6 and is not in the original review. | `package.json:41,45` | Dead weight in the dependency graph and lockfile. Remove `lodash` and `bluebird`; keep `dayjs`. |

## 6. Themes & Systemic Observations

**1. The money path has no verification layer at any level.** No tests (#1), no amount reconciliation (#30), no assertion that the charged total equals the recorded total (#29), no cross-field validation on pricing terms (#27). Every one of these is a missing *check*, not a missing feature. The code computes the right thing in the common case and has nothing that notices when it doesn't. This is the single highest-leverage theme: adding the invariant *"sum(preference items) == UserTransaction.amount == sum(priceSnapshot line totals)"* as a runtime assertion plus a test would catch #27, #29, and #30 at once.

**2. Guards that only select a label, never block.** `hasOperationalLinks` (#33) reads like a safety check and is actually a formatting parameter. The quantity branch beside it (#32) has no guard at all. `canProcessUnsigned` (#36) was computed and then ignored in favour of a string match — **now fixed (§12): the boolean is the decision, and the string is audit-only.** In each case something *shaped* like a control does not control anything. Worth a targeted sweep for the pattern beyond these three; #36's fix shows the shape of the remedy — derive the decision from the authoritative value already in scope, and let the display text stay display text.

**3. Aggregate state is projected rather than derived.** `fulfillmentStatus` is written by three sites (#3) from a static last-event-wins table (#14) with one evidence-consulting branch, no monotonicity (#12), and a second independent derivation for the customer timeline. The domain has the records to compute status from evidence; the code instead replays events and hopes ordering holds. Fixing #14 properly collapses #3, #12, and part of #43.

**4. Read-time diagnostics stand in for write-time invariants.** The `*-diagnostics.ts` modules detect states that transactions and DB constraints should have made impossible (#16) — and the two most damaging quantity bugs (#32, #33) fall in the *gap* the diagnostics don't cover. Diagnostics are the right safety net for historical data and the wrong primary control.

**5. Shared helpers exist and are bypassed.** `decimalOutputSchema` (#21), `requiredText`/`optionalUrl` (#22), `commerce.helpers` (#5, #39), `crud-cell-tooltips` (#40), `currentCatalogTermsWhere` (#6), `writeAdminAuditLog` (#54), `admin-crud.errors` (#8) — in each case the abstraction was built and then not adopted at some call sites. Two have already drifted in user-visible ways (accented vs unaccented error copy; opposite image precedence). The failure mode isn't missing abstraction, it's incomplete migration — worth a lint rule or a codemod pass rather than case-by-case cleanup.

> **Largely closed (§13).** #21, #22, #39 and #40 are done, alongside #5, #6 and #8 earlier; #54 is the remainder. Two observations from doing it are worth keeping:
>
> - **Drift does not reliably run copy → shared.** #22's drift ran the *other* way: the shared helper carried the unaccented copy and the local copies were correct, so importing the shared version naively would have regressed three live admin forms. A codemod that assumes the shared symbol is canonical would have shipped that regression silently. The shared symbol has to be *checked*, not trusted, before the copies are deleted.
> - **The compiler enumerates the call sites for free, but only per-symbol.** Every consolidation here deleted a local symbol, so `tsgo` listed every miss — provided the deletion happened while the blast radius was still one symbol wide. That, rather than a lint rule, is what made a 77-file change mechanical. A lint rule would still be the right way to stop the *next* copy from being written.

**6. Concurrency is defended in one place and nowhere else.** `executeOperation` correctly uses `Serializable` and `tx` throughout; cart and checkout run at default Read Committed with read-then-write patterns and no unique constraints (#13, #28). The team clearly knows the technique — it just wasn't applied to the paths users hit concurrently.

## 7. Commendations

Sparse and specific — these are worth preserving.

- **🟢 Authorization plumbing is genuinely solid.** All 18 admin routers use `adminProcedure`/`superadminProcedure` with procedure counts matching handler counts exactly — zero `publicProcedure` leaks. The gap in #7 is *within* the admin tier, not at its boundary.
- **🟢 Ownership scoping is consistent.** Cart, checkout, orders and tracking data layers all carry `userId` in the Prisma `where`. Only two `checkout.data.ts` writes rely on a preceding service-layer check, and both are correctly guarded today.
- **🟢 Webhook signature validation is done properly** — `x-signature`/`x-request-id` HMAC via the SDK's `WebhookSignatureValidator` with a 300s tolerance, rejecting with 401 and persisting a `rejected` event. (#36 is about the *bypass* path, not this.)
- **🟢 Money is `Decimal(18,2)` in Postgres throughout** — no `Float` columns anywhere. Float usage is confined to in-memory computation.
- **🟢 Transaction hygiene in operations is exemplary** — `executeOperation` is wrapped in a `Serializable` transaction and consistently uses `tx`; there is **no** instance anywhere in `src/server` of the outer `db` client leaking into a transaction callback. External HTTP calls are all correctly placed outside transactions.
- **🟢 `shouldApplyStatus` correctly protects `completed`/`refunded`/`chargedBack` from backward transitions** — the status machine understands terminal states.
- **🟢 The charged amount is computed server-side.** `checkoutConfirmInputSchema` accepts no amount; the total is derived from the DB cart. (#29 is a serialization bug downstream of a correct decision.)
- **🟢 `PaymentProviderEvent` dedupes on `(provider, providerEventId)`** — webhook replay does not create duplicate rows.
- **🟢 MercadoPago return pages are inert by design**, matching ADR-0001, and say so in the UI: "Esta pantalla no actualiza el estado del pago."
- **🟢 No circular dependencies** — `madge --circular src/` is clean across 374 files.
- **🟢 Strict TypeScript, honoured.** `strict` and `noUncheckedIndexedAccess` are both on and `pnpm typecheck` passes clean — no `ignoreBuildErrors`, no suppression comments at scale.
- **🟢 Better Auth `additionalFields` mark `role`/`active`/`deleted` as `input: false`**, correctly blocking client-side escalation through Better Auth's own `updateUser`. (#7 bypasses this by writing via Prisma — the config itself is right.)

## 8. Refuted Candidates

Recorded so they are not re-investigated. Each was raised by a finder angle and killed by a verifier.

| Candidate | Verdict | Why |
|---|---|---|
| Zustand `persist` causes a hydration mismatch because it rehydrates synchronously at module scope with no `skipHydration` | **REFUTED** | The synchronous-hydration premise is correct, but `persist` pins `api.getInitialState` to the pre-hydration object *before* `hydrate()` runs (zustand 5.0.14, `middleware.mjs:378` vs `:470`). React's `useSyncExternalStore` uses that as `getServerSnapshot`, so the hydration render sees `hasHydrated: false` and matches the SSR HTML exactly. The `hasHydrated` gate is the correct working pattern here. |
| `BETTER_AUTH_SECRET` is optional outside production, so sessions are signed with Better Auth's published default secret and are forgeable | **REFUTED** | Three independent barriers: Better Auth auto-reads `env.BETTER_AUTH_SECRET` even when not passed to `betterAuth()`; it *throws* on the default secret when `NODE_ENV === "production"`; and `next start`/`next build` force `NODE_ENV=production`, under which `env.js` makes the secret a required `z.string()` and the build fails without it. `.env` holds a real 43-char value. Residual (not worth a finding): the schema doesn't *enforce* it in dev. |
| Cart mutability during `atCheckout` causes the webhook to throw and roll back a captured payment | **REFUTED as live; reclassified** | The mechanism is real but the code is unreachable today because #25 makes the enclosing block dead. Folded into #31 as a latent defect that activates the moment #25 is fixed — which is why they must land together. |

## 9. Suggested Remediation Order

**Batch 0 — unblock verification (do this first, it is what makes the rest safe).**
Finding **#1**. Characterization tests on `commerce.helpers` over the MOQ/step matrix, then `createCaller` integration tests for `confirmAndPay` and `reconcileMercadoPagoPayment`. Also **#19** (`pnpm check:write` + CI wiring) so the gate is usable. Without this, every fix below is unverified.

**Batch 1 — the payment cluster (currently deferred; land as one change).**
**#25 + #31 + #10** together — the guard fix, the cart-lock/filtered-iteration fix, and the error-handling fix are mutually dependent. Then **#29 + #30** (send an authoritative total; verify the amount on reconciliation) and **#27** (schema refinement + fail loudly). Then **#28** (unique constraint on `UserOrder.cartId`) and **#26** (gate the mock gateway — note it depends on **#36** being fixed first, or the `APP_ENV` guard is inert).

**Batch 2 — security and cross-user integrity.**
**#7** ✅ **done** (role hierarchy + self-target guards; the restore path was deliberately deferred — see §10). **#35** ✅ **done** and **#36** ✅ **done** — see §12. All three are contained and none depends on Batch 1. **Note for #26:** its `APP_ENV === "production"` guard is no longer inert *in principle* — but see §12's "Not verified", since the derivation has not been confirmed on a real production deploy.

**Batch 3 — demand integrity (open now, one coherent chunk).**
**#32** (refuse quantity edits on paid orders), **#33** (create the `postAllocation` roll over), **#34** (narrow the `rollOvers` predicate, flip the `includeRollOver` default), then **#16** (write-time conservation guards + `onDelete: Restrict`). These four are the same subsystem and share a mental model; doing them together is much cheaper than separately.

**Batch 4 — tracking and reliability.**
**#14** first (derive status from evidence), which collapses **#12** and part of **#43**. (**#3** ✅ done — the data-layer writer is already gone, which removes one of the writers #14 has to reconcile.) Then **#11** (outbox backoff + background drain + requeue) and **#15** (unify the payment→submit transition).

**Batch 5 — performance, before data volume makes it urgent.** ✅ **done — see §14.**
**#18** ✅ and **#38** ✅ (pagination and typeahead-backed selects) are the ones that will bite first as the tables grow; **#37** ✅, **#44** ✅, **#45** ✅ (schema declared; migration deferred to the owner), **#17** ✅ follow. **#57** closed incidentally inside the #44 rewrite.

**Batch 6 — consolidation, opportunistic.** ✅ **done — see §13.**
The duplication cluster is complete: **#5** ✅, **#6** ✅, **#8** ✅, **#20** ✅, **#21** ✅, **#22** ✅, **#39** ✅, **#40** ✅, and naming **#23** ✅, **#24** ✅. **#9** (the CRUD client refactor) landed separately — see §11.

Dead code (**#55**–**#58**) remains **deferred**, and two of its four rows need revising before anyone picks them up:

- **#55 is deliberately kept, not pending.** `checkout.getState` has zero callers today, but it is the only query procedure on the checkout router, and **#50**'s stated fix is `utils.checkout.getState.invalidate()`. `checkout-client.tsx` calls only `checkout.start`, a *mutation*, so there would be nothing else to invalidate. Deleting it now means re-adding it when #50 lands. Resolve #50 first, then revisit.
- **#58's text was stale and has been corrected in place.** `dayjs` is live; `lodash` and `bluebird` are the dead ones.
- **#56 and #57** stand as written.

---

## 10. Remediation Log — 2026-07-22 (structural session)

Executed from `tmp/implementation-plan-code-review-structural-fixes.md` against `main` @ `922053f`. Seven findings closed in seven independently-shippable phases. **50 files changed, +251 / −468 lines.**

**Held out of scope by decision:** #1 (money-path tests), #9 (CRUD-client factory), the whole MercadoPago cluster (#10, #15, #25–#34), #11, #12, #14, #20, #21, #22, #39. No Prisma migration and no data backfill.

### What changed, per finding

| # | Phase | Change | New/changed artifacts |
|---|---|---|---|
| 7 | 1 | Server-enforced rank hierarchy: no self-promotion, no acting on a higher rank, no self-deletion, no removing/demoting/deactivating the last active superadmin | `user.authz.ts` **[new]**, `user.authz.test.ts` **[new]**, `countActiveSuperadmins` in `user.data.ts`, guards wired into all 4 write paths in `user.service.ts`, `role` threaded through `AdminMutationActor` |
| 2 | 2 | One TZ-pinned `datetime-local` helper pair replaces 4 copies; 20 naive server-side parses routed through it | `date.helpers.ts` **[new]** (`BUSINESS_TZ`), `date.helpers.test.ts` **[new]**, `_crud-schema-helpers.test.ts` **[new]**, tightened `dateInputSchema` |
| 8 | 3 | One `mapServiceError` for 16 routers, with an exhaustive switch | `api/_shared/map-service-error.ts` **[new]**, `throwConflict`/`throwRelationBlocked` added to `admin-crud.errors.ts` |
| 6 | 4 | One module owning both dialects of terms validity, used by all 5 sites | `services/_base/terms-validity.ts` **[new]**, `terms-validity.test.ts` **[new]** |
| 5 | 5 | One `buildCartSnapshot` used by the store and both services | `buildCartSnapshot` in `commerce.helpers.ts`, `commerce.helpers.test.ts` **[new]** |
| 4 | 6 | One `hasFulfillmentLineage`; `operationalLinkCount`/`orderItemCount` collapsed to `hasLineage: boolean` | `hasFulfillmentLineage` in `operations-cart.data.ts`, `operations-cart.lineage.test.ts` **[new]** |
| 3 | 7 | Data layer stops writing `fulfillmentStatus`; the projector owns the cancellation transition | `softDeleteCartItem` → `setCartItemLifecycle` |

### Deliberate behaviour changes

These four are intended, not regressions:

1. **#7** — role writes that previously succeeded now throw `CONFLICT`. A single-superadmin environment can no longer demote or delete that superadmin; recovery is to create a second one first.
2. **#2** — stored instants shift by the deploy's TZ delta relative to the previous (broken) behaviour. **That is the fix.** Rows edited before this deploy may still hold drifted windows; they are corrected manually via the admin UI (no backfill is safe, since each edit compounded the shift).
3. **#4** — items whose only link is a `trackingEvents` row now classify as *without* lineage → `dropped`/`removed` instead of `cancelled`, and become hard-deletable. Tracking events are history, not lineage; this is the finding's stated goal. `CONTEXT.md` was updated to make the term unambiguous.
4. **#3** — the cancellation `fulfillmentStatus` write is now **asynchronous** (outbox → projector) rather than synchronous. Before shipping, all four T7.3 gates were confirmed: the projector's evidence check reads `deleted`/`status` (not `fulfillmentStatus`); `admin.cartItem.cancelled` is published on the removal path; `cartItemCancelled → "cancelled"` is mapped; and `DomainEventDispatcher.wake()` fires on both `update` and `softDelete`.

### Deviations from the plan

- **UI role gating (plan T1.6) was not implemented.** The plan's assumption A5 — that `authClient.useSession()` exposes a typed `user.role` — is **false**: Better Auth's `additionalFields` do not reach the React client's `$Infer`ed session type. Per the plan's own fallback, the task was skipped rather than cast around. **Consequence:** an `admin` still sees "Superadministrador" in the role dropdown; the server rejects the write. Affordance-only gap, worth a follow-up.
- **`assertCanManageUser` dropped the planned `actorId` parameter** — it was unused and biome's `noUnusedFunctionParameters` rejects it. Self-checks live in `assertNotSelf`.
- **The plan said "16 naive parses"; there are 20.** Its own file/line table summed to 20. All 20 were converted.
- **`date.helpers.test.ts` does not mutate `process.env.TZ`.** Node fixes the process timezone at startup, so a test written that way would appear to prove TZ-independence while proving nothing. The suite pins explicit UTC instants instead; independence was verified by running the file under `TZ=UTC` and `TZ=America/Los_Angeles`. **That verification is manual and not enforced by CI.**

### Gates

| Command | Before | After |
|---|---|---|
| `pnpm typecheck` | ✅ exit 0 | ✅ exit 0 |
| `pnpm test` | 5 files, 37 tests | ✅ **11 files, 90 tests** — 5 new pure-function suites |
| `pnpm check` (biome) | ❌ 29 errors, 4 warnings | ❌ **28 errors, 4 warnings** — one below baseline; finding #19 still open |
| `npx madge --circular src/` | ✅ clean | ✅ clean |

`operation-assignment.helpers.test.ts` passes **unedited**, which is the evidence that the #6 extraction was behaviour-preserving.

**Not verified:** every manual check in the plan's §11 requires a running app and a database; none was run. The two that matter most are (a) editing a client-terms row with server TZ ≠ browser TZ and confirming `fromDate` does not move, and (b) confirming a cancelled admin cart item reaches `fulfillmentStatus: "cancelled"` once the outbox drains. Watch `trackingStatusProjectionSkipped` in `appLogger` after deploying #3 — a spike means the evidence gate is failing.

### Documentation touched

- `CONTEXT.md` — **Fulfillment lineage** now states explicitly that tracking events are history, not lineage (the ambiguity that produced two definitions).
- `docs/tracking-architecture.md` — records which direct `fulfillmentStatus` writers remain after #3, so the "Core Rule" stops overstating the projector's exclusivity.

---

## 11. Remediation Log — 2026-07-22 (CRUD-client consolidation session)

Executed from `tmp/implementation-plan-crud-client-consolidation.md` against `main` @ `f52095b`. Finding **#9** closed. Two commits: one behaviour-preserving migration, one copy/behaviour fix.

**Held out of scope:** #1 (money-path tests), the MercadoPago cluster (#10, #15, #25–#34), #18 (pagination — now a one-site change), #19 (the pre-existing Biome errors outside the touched directories). No file under `src/server/`, `src/schemas/` or `prisma/` was edited; no `*-table.tsx` or `*-form-dialog.tsx` was edited.

### What changed

| Piece | Path | Role |
|---|---|---|
| `useCrudPageState` | `src/features/admin/crud/_lib/use-crud-page-state.ts` **[new]** | The six state slots + `selectedId`/`formMode` + `openCreate`/`openEdit`/`closeForm`. Generic over `TId` (`string` for `user`, `number` elsewhere) |
| `useCrudEntityPage` | `src/features/admin/crud/_lib/use-crud-entity-page.ts` **[new]** | Filter memo, detail-load-failure effect, `isFormSubmitting` |
| `CrudEntityCopy` | `src/features/admin/crud/_lib/crud-entity-copy.ts` **[new]** | Typed per-entity wording + `crudElementIds` / `buildCrudStatItems` |
| `<CrudEntityPage>` | `src/features/admin/crud/_components/crud-entity-page.tsx` **[new]** | Stats quartet, filter bar, list-state gate, both delete dialogs; render props for table and form dialog, `extras` slot, optional `pageShell` |

All 7 standalone clients and all 3 `product-terms` panels now compose those four.

### Deliberate behaviour changes (second commit only)

- **`address` hard delete now requires typed confirmation** of the record id. It was the only entity where permanent deletion was one unguarded click.
- **`user` hard-delete prose names the email** it asks the admin to type; it previously displayed the name. The typed value stays the email (unique; display names are not).
- **`carrier` / `destination` / `supplier` hard-delete prose names the record** instead of describing the entity abstractly.
- **`carrier` / `destination` accents and voseo restored**; destination's untranslated `lot items` became `ítems de lote`.
- **`supplier`'s include-deleted switch id** went from the unprefixed `include-deleted` to `supplier-include-deleted` (`id` and `htmlFor` moved together).

### Deviations from the plan

- **The ≤120-line-per-client target was not met; clients land at ~190.** The plan's own guardrails require each client to keep its tRPC calls, its entity-specific invalidation set (§2.4) and its mutation toasts, and to hold its copy config in-file — roughly 130 irreducible lines before any JSX. The substantive gate was met: **no `any`, no `as` cast, no `biome-ignore` in any migrated client**, and inference is exact end-to-end. Total across the eight files is 2,000 lines, above the plan's ≤1,200 estimate and down from 3,677.
- **`includeDeletedId` was kept, not deleted (T6.4).** The plan treated it as a supplier-only bridge, but the three terms panels genuinely need it — their switch ids are suffixed onto the search id (`…-search-include-deleted`), not onto the prefix. Supplier's use is gone; the escape hatch remains, documented.
- **`withPageShell` became `copy.pageShell?`.** A boolean would have left `pageTitle`/`pageDescription` as required-but-unused config on the panels. Presence of the optional `pageShell` object now selects the layout, so the type cannot express a panel carrying a page title it never renders.
- **Commits are two, not one-per-entity.** The constraint that actually matters — phase 6 isolated from every migration — holds.

### Gates

| Command | Before | After |
|---|---|---|
| `pnpm typecheck` | ✅ exit 0 | ✅ exit 0 |
| `pnpm test` | 11 files, 90 tests | ✅ **12 files, 94 tests** — `crud-entity-copy.test.ts` **[new]** |
| `pnpm biome check .` | ❌ 28 errors, 4 warnings | ❌ **19 errors, 4 warnings** |
| `pnpm biome check src/app/admin/crud-home src/features/admin/crud` | ❌ 9 errors | ✅ **0 errors** |
| Lines across the 8 target files | 3,677 | **2,000** |

### Not verified

**No manual check from the plan's §11 was run** — none of the eight pages was loaded, because that needs a running app and a database. `vitest.config.ts` is `environment: "node"` with no DOM library, so no component test covers this either; typecheck plus the copy transcription is the entire automated safety net. The checks that matter most before shipping: (a) saving a user still refreshes address lists (the cross-invalidation), (b) the address owner dropdown still lists soft-deleted users, (c) the product preview dialog still opens and inline brand creation still refreshes the brand list, (d) all three product-terms tabs render, and their three hard-delete messages still read `cart items`, `lot items`, and the unconditional one.

### Documentation touched

- `.claude/skills/admin-crud-components/SKILL.md` — the "Build The Page-Level Client" section now describes composing the three new pieces, and states the constraint that tRPC hooks are called by the client and never by the shared hook.
- `CONTEXT.md` — untouched. No new domain term; `CrudEntityPage` is a component name, not vocabulary.

---

## 12. Remediation Log — 2026-07-22 (session-boundary and environment hardening)

Executed from `tmp/implementation-plan-session-and-env-hardening.md` against `main` @ `0839360`. Findings **#35** and **#36** closed — the review's Batch 2. Two independent phases: Phase 1 is server-side only, Phase 2 client-side only.

**Held out of scope by decision:** #1 (money-path tests) and the whole MercadoPago cluster (#10, #15, #25, #27–#34) stay parked. **#10 lives four lines below the #36 fix in the same file and was deliberately left untouched.** #26 remains parked — this session is its *prerequisite*, not its fix. No Prisma schema change, no migration, no backfill. `cart.service.ts` was not entered: the additive server-side merge (`:260-261`) keeps its semantics, and this session only stops the *wrong cart* from reaching it.

### What changed, per finding

| # | Phase | Change | New/changed artifacts |
|---|---|---|---|
| 36 | 1 | `APP_ENV` derives from `NODE_ENV` instead of defaulting to `"development"`; an inconsistent production build now throws at config-load time | `env.helpers.js` **[new]**, `env.helpers.test.ts` **[new]**, `env.js` (derived default + post-`createEnv` assertion), `.env.example` (+6 vars) |
| 36 | 1 | The webhook's accept/reject decision reads a boolean instead of `rejectedReason.includes("procesada")`; a missing secret gets its own audit message | `webhook-signature.decision.ts` **[new]**, `webhook-signature.decision.test.ts` **[new]**, `route.ts:60-98` |
| 35 | 2 | Four layered defences so a signed-out cart cannot reach the next user, in decreasing order of handler-dependence | `cart-bootstrap.decision.ts` **[new]**, `cart-bootstrap.decision.test.ts` **[new]**, `cart-store.ts`, `use-cart-sync.ts`, `use-cart-storage-sync.ts`, `user-menu.tsx` |

**The four #35 defences**, since the review's stated fix ("call `clear()` on sign-out") closes only the common case:

1. **`decideCartBootstrap` refuses to merge a cart attributed to someone else** — structural, independent of every handler. `discard` is evaluated *first*, because in the leak case both `merge` conditions also hold.
2. **The logged-out effect branch wipes an attributed cart** (`use-cart-sync.ts:56-66`) — fires on any RSC re-render with no session. **This is the load-bearing defence, not a defensive extra:** it is the only one that covers session expiry, a cleared cookie, or sign-out in another tab.
3. **`user-menu.tsx` resets after a successful sign-out** — closes the window before `router.refresh()` lands. Called *after* the await: a failed sign-out leaves the user signed in, and wiping then would be a regression.
4. **The cross-tab rehydrate path checks identity** (`use-cart-storage-sync.ts`) — an exposure path the review does not mention. Without it, a stale second tab can write user A's items back *after* tab one cleared them.

### Deliberate behaviour changes

1. **A production build with `APP_ENV` set to anything but `production` now fails at `next.config.js` load**, before any other error. This is the fail-open fix, and it is a build-breaking change by design. Unsetting `APP_ENV` is the correct resolution; the derivation handles it.
2. **Persisted cart `version` bumped `1 → 2`** (`cart-store.ts:143`). No `migrate` is defined, so zustand **discards every existing persisted cart once** — the one-shot eviction for browsers already carrying a merged cart. Per the plan's assumption A5, acceptable for a development-stage app.
3. **A cart attributed to a different user is now discarded rather than merged.** The guest → login merge is unchanged and explicitly asserted in the suite — an unattributed cart (`syncedUserId: null`) still merges, including one built *after* a sign-out, since the reset nulls the attribution.
4. **`PaymentProviderEvent.lastError` distinguishes "no webhook secret configured" from "signature invalid."** Previously a missing secret was laundered into a synthetic `SignatureMismatch` and was indistinguishable in the audit trail. The accept/reject *outcome* for a missing secret is unchanged — changing it would break local webhook testing, where no secret is configured at all.

### Two corrections to §5.2 #36, so neither is re-investigated as a live exploit

- **The `error.reason` injection vector is latent, not live.** The review notes that `route.ts:91` interpolated SDK text into the control string. Verified against the installed SDK: `SignatureFailureReason` (`mercadopago/dist/utils/webhook/index.d.ts:20-49`) is a **closed enum of six ASCII PascalCase values**, and `error.reason` is typed to it, not to `string`. No value contains "procesada". Treat it as one `pnpm update` away from live — which is precisely why the fix is structural rather than a reworded string. Nothing pins those enum values today.
- **The `allowUnsignedWebhooksInDevelopment` toggle is gated by `superadminProcedure`, not `adminProcedure`** (`admin/payment.router.ts:72`). The review's text links it to #7's self-service admin escalation; the escalation story is narrower than stated. It does not change the fix — the env half failed open on its own, independent of the toggle.

### Deviations from the plan

- **`WebhookSignatureOutcome.auditMessage` is `string | null`, not `string`.** The plan (T1.4) declared `string`. The route persists this value as `lastError`, which is nullable and must stay `null` on the valid-signature path; forcing a non-null string would have written a meaningless audit line on every accepted webhook.
- **The route hoists an `accepted` boolean rather than `canProcessUnsigned`.** The plan (T1.5) said to hoist `canProcessUnsigned` and branch on `outcome.accept`. Hoisting `accepted` and assigning it from `outcome.accept` in the catch achieves the same thing while keeping accept-vs-reject derived in exactly one place — the pure function — instead of re-derived in the route. `signatureValid` remains a separate variable, so guardrail §2.4.5 holds: `signatureValid: false` is still persisted on the accepted-unsigned path (`route.ts:128`).
- **The accepted-unsigned audit message is still computed and not persisted.** The `received` event does not carry `lastError`, exactly as before this session. Improving that is a behaviour change the plan did not authorise; noted as a follow-up rather than taken.
- **`DEV_USER_ROLE` was not removed**, per plan §2.2 — it is declared in `env.js:24,52`, read nowhere in `src/`, and looks like an auth backdoor without being one. It was added to `.env.example` (T1.3 requires every `server`-block key to appear there), which makes the dead config *more* visible, not less. **Still worth a follow-up.**

### Gates

| Command | Before | After |
|---|---|---|
| `pnpm typecheck` | ✅ exit 0 | ✅ exit 0 |
| `pnpm test` | 12 files, 94 tests | ✅ **15 files, 111 tests** — 3 new pure-function suites |
| `pnpm check` (biome) | ❌ 19 errors, 4 warnings | ❌ **19 errors, 4 warnings** — unchanged; finding #19 still open |
| `pnpm biome check <touched paths>` | — | ✅ **0 errors** |
| `pnpm build` | ✅ | ✅ |
| `APP_ENV=development NODE_ENV=production pnpm build` | ✅ (the bug) | ✅ **fails with the assertion message** |
| `npx madge --circular src/` | ✅ clean | ✅ clean |

All 12 pre-existing suites pass **unedited**.

### Not verified

**No manual check from the plan's §11.3 was run** — every one needs a running app and a database, and `vitest.config.ts` is `environment: "node"` with no DOM library, so no test covers a React hook or component here. The pure-function suites plus typecheck are the entire automated net; **the wiring between those functions and the hooks/route that call them is unverified by any test.**

Specifically not executed, most consequential first:

- **(d) The finding itself** — sign in as A, add items, sign out, sign in as B on the same browser; B's cart must be empty with no `cart.syncLocal` in the network tab.
- **(e) The guest → login merge** — add items while signed out, then sign in; items must merge. **This is the regression this session most risks**, and it is covered only by a unit assertion on the decision function, not by the hook that calls it.
- **(b) `pnpm preview` with no `APP_ENV` set**, confirming the admin payments panel (`payments-admin-client.tsx:317`) reads **`production`**. This is the check that proves the fail-open is actually closed at runtime rather than only at build time. Until it passes, treat #26's future `APP_ENV` guard as still-unproven. If the panel reads `development`, the pipeline is setting `SKIP_ENV_VALIDATION` — under which the assertion is inert *and* `env.APP_ENV` is raw, possibly `undefined`, which still satisfies every `!== "production"` test downstream.
- **(f)** session-expiry simulation (delete the cookie, reload — the cart must empty without the user menu); **(g)** two-tab rehydrate still propagating a legitimate same-user write; **(h)** a successful checkout still emptying via `clear()`, and the MercadoPago redirect round trip not wiping an in-flight cart; **(a)** the panel reading `development` in dev; **(c)** a bad-signature webhook returning 401 and persisting the new missing-secret audit message.

**Post-deploy:** watch `PaymentProviderEvent` rows with `status: "rejected"` for a spike. A spike means the substring branch had been accepting things it should not have been — information worth recording, not necessarily a bug.

### Documentation touched

- `.env.example` — the six missing `server`-block variables, with `APP_ENV`'s derivation behaviour noted inline.
- `docs/adr/0001-mercadopago-checkout-pro-reconciliation.md` — untouched. The plan's optional note was conditional on the ADR describing the current mechanism; it is a 3-line stub that never mentions signature validation, so there was nothing to attach the note to.
- `CONTEXT.md` — untouched. No new domain term.

---

## 13. Remediation Log — 2026-07-22 (consolidation and naming session)

Executed from `tmp/implementation-plan-consolidation-batch-6.md` against `main` @ `3a9581b`, on branch `refactor/consolidation-batch-6`. Findings **#20**, **#21**, **#22**, **#23**, **#24**, **#39**, **#40** closed — the review's **Batch 6** in full, minus the deferred dead-code rows. Five commits, one per phase plus one isolating the timezone change.

These seven findings share one root cause: leaf helpers were centralized in earlier sessions, but the copies that predated them were never deleted. Two (#22, #39) had already drifted.

**Held out of scope by decision:** #55–#58 (dead code — see §9 for why #55 is *kept*, not merely deferred). The Prisma model rename behind #23's deeper half (`CartItemLotItem` → `DemandAllocation`, `PackageAllocation` → `PackagedAllocation`) — 73 and 59 call sites plus a migration, and the review itself says it deserves its own PR. The MercadoPago / money cluster stays parked. No Prisma schema change, no migration, no backfill.

### What changed, per finding

| # | Phase | Change | New/changed artifacts |
|---|---|---|---|
| 21 | 1 | `decimalOutputSchema` hoisted out of the admin CRUD module; five character-identical local `decimalStringSchema` copies deleted and all ~20 references renamed | `schemas/_schema-helpers.ts` **[new]**, `admin/_crud-schema-helpers.ts`, `cart/catalog/home/checkout.schemas.ts`, `admin/payment.schemas.ts`, 8 admin importers repointed |
| 22 | 1 | Local `requiredText`/`optionalText`/`nullishText`/`optionalUrl` copies deleted across five admin schemas; shared messages moved to the app's accented convention **first**, so the dedup preserves behaviour | `admin/{brand,product,user,address,supplier}.schemas.ts`, `_crud-schema-helpers.ts`, `carrier.schemas.ts`, `product-form-dialog.tsx` |
| 20 | 2 | One context-parameterized `selectProductImage` replaces five service copies; one `termsToClientTerms` replaces four byte-identical bodies | `commerce.helpers.ts`, `_base/client-terms.mapper.ts` **[new]**, `{catalog,home,cart,checkout}.service.ts`, `admin/product.service.ts` |
| 39 | 2 | `home-formatters.ts` shrunk 52 → 19 lines, from a fork to two offer adapters over shared primitives | `home-formatters.ts`, `current-offers-section.tsx`, `home-hero.tsx`, `featured-product-card.tsx` |
| 40 | 3 | Three shared formatters replace 30 inline `Intl.DateTimeFormat("es-AR", …)` sites across 28 files; private tooltips deleted; display timezone pinned | `date.helpers.ts`, `date.helpers.test.ts`, `operation-table.tsx`, 27 further call sites |
| 23 | 4 | Two badges relabelled to CONTEXT.md terms | `tracking-detail-dialog.tsx:112,115` |
| 24 | 4 | `/my-operations` → `/my-orders`; headings read "Mis pedidos" | 2 pages moved via `git mv`, 9 external referrers, 7 copy strings |

### Corrections to the review's text, verified against the code

The review is substantially right but wrong in specifics. Recorded so none is re-derived:

| Review says | Reality |
|---|---|
| #20: five `selectProductImage` copies | **Six** — `prisma/seed.ts:159` is a sixth. Left alone (see "Open remnants"). |
| #20: `termsToClientTerms` duplicated in 2 files | **Four** — plus `mapTerms` (`catalog.service.ts`) and `mapPreviewTerms` (`admin/product.service.ts`), byte-identical bodies under different names. |
| #21: five `decimalStringSchema` declarations | **Seven** exist; only five are duplicates. `tracking.schemas.ts:24` (bare `z.string()`) and `domain-events.schemas.ts:49` (regex-validated) are *different contracts* and were left untouched. |
| #22: `optionalUrl` duplicated in five files | **Three** — `brand`, `product`, `user`. `address` and `supplier` carry `optionalEmail` instead. |
| #22 implies the local copies carry the drift | **Inverted.** The *shared* helper was the outlier — 1 unaccented site against 4 accented, with an app-wide convention of 11:5 and 15:3. Naively importing it would have regressed copy on three live admin forms. Fixed the shared messages first. |
| #39: "Delete the fork, import `commerce.helpers`" | **Insufficient.** `HomeOffer` lacks `step`, `stepPrice` and `max`, so it is not assignable to `CatalogClientTerms`; and `getDisplayPrice` returns a *raw* decimal string where `getOfferDisplayPrice` returns a formatted one. The file shrinks; it cannot disappear. |
| #40: `Intl.DateTimeFormat("es-AR")` in 25 files | **30 sites across 28 files** — but only **3 distinct option shapes**, so three formatters cover everything. Two sites allocated per render. |
| #40: the private tooltips are "character-identical" | **Refuted.** The shared versions are strictly *wider* (`IdTooltip` takes `string \| number` plus `className`; `DateTooltip` normalizes `Date \| string`). The swap is safe but is not a no-op diff. The missing-comment half of the claim holds. |
| #24: 8 files link the route | **9** external referrers plus 2 self-links. Four hold the path in a ternary-assigned `const`, so a `href="/my-operations"` grep misses them. |
| #23: siblings use correct domain terms | Correct — and they are **unaccented** ("Operacion", "Envio"). The new labels match that. |

### Deliberate behaviour changes

1. **Validation copy moved to the accented convention** (#22). `"Ingresa una URL valida"` → `"Ingresá una URL válida"`, plus the fecha/JSON/email messages and the eight `"un numero entero"` id messages. This *fixes* a live inconsistency: an admin typing a bad URL on the Destination form — the one file already importing the shared helper — saw the unaccented string while Brand/Product/User showed the accented one. All four now agree.
2. **`brand`/`product` `description` widened from `.optional()` to `.nullish()`** (#22). `null` is newly accepted as input; the output type is unchanged. This is the one contract change in Phase 1.
3. **The home fork's `toNumber` coerced `""` to `0`; the shared one returns `null`** (#39), so `formatCurrency("", "ARS")` renders `"ARS "` rather than `"$ 0"`. Latent, not live — every caller feeds a `Prisma.Decimal.toString()`, which never yields `""`. Recorded in a test rather than left to be discovered.
4. **Display times are pinned to `BUSINESS_TZ`** (#40), changing rendered output on all 30 sites for every viewer outside `America/Argentina/Buenos_Aires`. This closes the read/write asymmetry #2's fix opened. **Its own commit**, so it can be reverted without unwinding the formatter consolidation.
5. **`/my-operations` now 404s** (#24). No redirect was added — an explicit decision. There is no `middleware.ts`, sitemap, or e2e reference, but any customer bookmark or previously emailed link breaks. `next.config.js` is where a `permanent: true` redirect goes if that call changes.

### Deviations from the plan

- **T1.4's `optionalText` → `nullishText` swap broke the build, which the plan did not predict.** The plan rated it "low risk … output type unchanged". True at the Zod level, but `product-form-dialog.tsx` declares `useForm<ProductFormInput, unknown, ProductFormValues>`, so `form.watch()` yields the *input* type — which now includes `null` — while `InlineBrandValues` derives from the *output* type. Three type errors. Resolved at the owner's direction by keeping the plan's semantic map and normalizing in the component through the `toInlineBrandValues` helper that already existed for exactly this. The alternative considered and rejected: exporting a shared `optionalText` alongside `nullishText`, which would have been a zero-behaviour-change dedup.
- **#24 touched seven copy strings, not the five the plan scoped.** `"Ver mis operaciones"` also appears in `join-section.tsx:17` and `home-hero.tsx:26`; the plan listed both files only as href holders. Changed for consistency — leaving them would have split the vocabulary across the same page.
- **`operations-cart.service.ts:72` is not a fifth `termsToClientTerms`.** It matches on a line-level grep but is an inline snapshot literal with a different shape (no `fromDate`/`toDate`). Correctly out of scope; noted so the next grep does not re-flag it.
- **T3.1's tests were written in T3.4 only**, per the plan's own preference: before the pin, an absolute-output assertion fails under a non-Argentina host `TZ`, so the assertion belongs where the guarantee starts.

### Gates

| Command | Before | After |
|---|---|---|
| `pnpm typecheck` | ✅ exit 0 | ✅ exit 0 — run after every task, not every phase |
| `pnpm test` | 15 files, 111 tests | ✅ **15 files, 118 tests** — 7 new cases |
| `pnpm check` (biome) | ❌ 19 errors, 4 warnings | ❌ **19 errors, 4 warnings** — unchanged; finding #19 still open |
| `pnpm build` | ✅ | ✅ — route tree shows `/my-orders` and `/my-orders/[orderId]` |
| `TZ=UTC` / `TZ=America/Los_Angeles vitest date.helpers` | — | ✅ **identical output under both** |
| `npx madge --circular --extensions ts,tsx --ts-config tsconfig.json ./src` | — | ✅ **0 cycles in `src/`** (39 in `generated/prisma/`, out of scope) |

**Completeness greps, all returning their expected output:**

```
grep -rn "const decimalStringSchema" src/schemas/   -> only tracking.schemas.ts, domain-events.schemas.ts (both deliberate)
grep -rn "const requiredText\|const optionalText\|const nullishText\|const optionalUrl" src/schemas/admin/
                                                    -> only _crud-schema-helpers.ts
grep -rn "function selectProductImage" src/         -> only commerce.helpers.ts
grep -rn 'Intl.DateTimeFormat("es-AR"' src/         -> only date.helpers.ts
grep -rn "Ingresa una URL valida\|...\|un numero entero" src/   -> empty
grep -rn "CartItemLotItem #\|PackageAllocation #" src/          -> empty
grep -rn "my-operations\|Mis operaciones" src/                  -> empty
```

**A note on the biome count.** Running `biome check --write` across all of `src/` auto-fixes several of the 19 pre-existing errors in `src/components/ui/*` and `src/lib/utils.ts`. Those fixes were **reverted** — §2.2 of the plan puts them out of scope, and folding unrelated formatting churn into this diff would make it harder to review. The count is unchanged by design, not by accident.

**Re-verified on `main` @ `22365df` (2026-07-23).** The session that executed this batch ended abruptly, so every gate and completeness grep above was re-run independently against the merged tree: `pnpm typecheck` exit 0; `pnpm test` 15 files / 118 tests passing; `pnpm check` 19 errors / 4 warnings (baseline held); `pnpm build` succeeds with `/my-orders` and `/my-orders/[orderId]` in the route tree; all seven greps return their stated output. The batch is complete as logged — the only thing the interruption cost was the §5.2 per-finding notes, added on this pass.

### Not verified

**None of the plan's five manual checks was run** — each needs a running app and a database, and `vitest.config.ts` is `environment: "node"` with no DOM library, so no test covers a React component or route here. `pnpm build`, `pnpm typecheck` and the greps are the entire automated net for the UI-facing half.

Specifically not executed, most consequential first:

- **The `/my-orders` entry points** — navbar, user menu, home footer, home hero CTA, featured section CTA, current-offers CTA, join section, checkout result panel, MercadoPago return page. `pnpm build` proves the routes exist and `grep` proves no `/my-operations` string survives, but nothing proves each link lands. **A missed reference surfaces only as a 404 on click.**
- **The timezone pin's visible effect** — set the OS timezone to something other than Argentina, load `/admin/operations`, confirm rendered times match `BUSINESS_TZ`. The unit tests pin this at the formatter level and were confirmed to fail (3 cases) when the pin is removed, but the 30 call sites are unexercised.
- **The four admin forms** (Brand, Product, User, Destination) showing `"Ingresá una URL válida"` on an invalid URL, and Brand/Product create/update still accepting their normal payloads after the `.nullish()` widening.
- **The home page** rendering offer prices and quantity labels identically after the formatter swap.
- **Cart vs catalog image precedence** in a live cart — unit-tested at the helper (8 assertions) but not end-to-end. The `productSnapshot` write path is the one with lasting consequences.

**Post-deploy:** watch for 404s on `/my-operations`, and for tRPC output-parse errors on the cart / checkout / catalog / home / payment routers — the #21 blast radius, which surfaces at runtime rather than compile time.

### Open remnants

- **`prisma/seed.ts:159` still carries a sixth `selectProductImage`.** The seed does not import from `~/` today, and wiring it up means validating the `tsx` alias-resolution path for a standalone script. Deferred, not forgotten.
- **`checkout.schemas.ts:5` and `profile.schemas.ts:5` hold two further `requiredText` copies**, and they plus `admin/payment.schemas.ts:11-13` hold `emptyStringToNull` helpers the shared module does not cover. A natural follow-up to #22, outside its stated five files.
- **The Prisma model rename** behind #23's deeper half.
- **`bluebird`** — an unused dependency found during this session, folded into #58.
- **The `madge` script in `package.json` reads no TypeScript.** `madge ./src` defaults to `.js`, so it processes exactly two files and has been reporting a clean result for a directory it never opened — a vacuous green in §2 and §12. Correct invocation and current result are recorded in the §2 correction. One-line fix: add `--extensions ts,tsx --ts-config tsconfig.json` to both `madge` scripts.

### Documentation touched

- **This document** — §3 and §4 marks, §9 Batch 6, in-place corrections to §5.3 rows #39, #40, #55 and #58, and in-place resolution notes on §5.2 findings **#20–#24** (added 2026-07-23; see the verification note under "Gates").
- `docs/plans/checkout-redesign.md` — the two `/my-operations` references updated.
- **Open finding #46's location repointed** to `my-orders/[orderId]/page.tsx:126` in §3 and §5.3. The route rename moved the file out from under a finding that is still open; the `catch { notFound(); }` block itself is unchanged. Finding #24's own text still says `/my-operations` throughout — that is the state it describes, and rewriting it would erase what was found.
- `CONTEXT.md` — untouched. This session brings the code *to* CONTEXT.md, not the reverse.

---

## 14. Remediation Log — 2026-07-23 (performance session)

Executed from `tmp/implementation-plan-performance-batch-5.md` against `main` @ `22365df`. Findings **#17**, **#18**, **#37**, **#38**, **#44**, **#45** closed — the review's **Batch 5** in full — plus **#57** incidentally. Six phases, each an independently-shippable commit; Phase 3 splits into two (#44 code, #45 schema) so the inert schema change is revertable alone.

The through-line: these are the queries whose cost grows with **data volume**, not request count. Every one is cheap today on a near-empty database and gets progressively worse with no code change; fixing them after the tables grow means fixing them under load.

**Held out of scope by decision:** the MercadoPago / money cluster (parked). **#34** (the `rollOvers: { none: {} }` predicate and the `includeRollOver` default) even though Phase 3 edits the same file — it is Batch 3, changes demand semantics, and must land with #32/#33/#16. **#1** (money-path tests). Pagination of `admin.{user,product,productClientTerms}.list` — six other admin pages consume them as bare arrays, so #38 is solved by *adding* endpoints, not changing these. **No Prisma migration was created or applied:** the `RollOver` index is declared in the schema and `pnpm db:generate` was run, but the owner applies the migration manually.

### What changed, per finding

| # | Phase | Change | New/changed artifacts |
|---|---|---|---|
| 17 | 1 | `.max(200)` on both unbounded array inputs; `syncLocal` hoists two batched `findMany` reads out of the loop into one `Promise.all` and removes the double `findActiveCartItemByTerms` by passing the resolved item into `upsertCartItem` | `cart.schemas.ts`, `admin/operations-cart.schemas.ts`, `cart/cart.service.ts`, `cart/cart.data.ts` |
| 37 | 2 | Three `list*ByIds` batched readers + `listShipmentIdsWithTrackingEvents` (one `distinct` query) + a pure `groupTimelineByCartItem`; the three diagnostics builders and the per-item timeline fetch rewritten to consume them | `cart-traceability.service.ts`, `{lot,package,shipment}.data.ts`, `cart-traceability.assembler.ts`, `cart-traceability.service.test.ts` |
| 44 | 3 | A pure `groupAssignments` pass generates every code, then four bulk `createManyAndReturn` writes (supplier orders → lots → lot items → demand allocations, FK order) join returned ids by `code`/`lotItemId`; roll overs bulk-insert via filter-then-zip + length assertion | `operations/operation-execution.service.ts` |
| 45 | 3 | `@@index([status, createdAt, id])` on `RollOver`; schema only, `db:generate` run, no migration | `prisma/schema.prisma` |
| 18a | 4 | Narrow **summary selects** (no Cart/User/Product/Destination join) + `skip`/`take` + `count`; `getStats` becomes exact `count`/`groupBy`/`aggregate`; new `DIAGNOSTIC_SCAN_LIMIT`/`resolveDiagnosticListPage`; `truncated` on six schemas + three clients | `operational-diagnostics.types.ts`, `{lot,package,shipment}.data.ts`, `{lot,package,shipment}-diagnostics.ts`, `{lot,package,shipment}.service.ts`, `{lot,package,shipment}.schemas.ts`, `lots/packages/shipments-client.tsx`, `operational-diagnostics.test.ts` |
| 18b | 5 | `operationsCart.list` gains `page`/`pageSize` + an `{ items, page, pageSize, total, pageCount }` envelope; data-layer `count` + `skip`/`take`; both consumers read `.items`; user-carts pagination controls | `admin/operations-cart.schemas.ts`, `operations-cart.data.ts`, `operations-cart.service.ts`, `cart-traceability-search-card.tsx`, `user-carts-client.tsx` |
| 38 | 6 | Three `options` endpoints (`search` + `take: 50` + `selectedValue`); `Combobox` opt-in server-search mode + `useDebouncedValue` (250 ms); the three user-carts filter dropdowns become search-backed comboboxes | `admin/_options.schemas.ts` **[new]**, `{user,product,product-client-terms}.schemas.ts`, `{user,product,product-client-terms}.data.ts`, `{user,product,product-client-terms}.service.ts`, three admin routers, `combobox.tsx`, `_lib/use-debounced-value.ts` **[new]**, `user-carts-client.tsx` |

### Corrections to the review's text, verified against the code

| Review says | Reality |
|---|---|
| #17: "three serial queries per item" | **Four.** `findActiveCartItemByTerms` was issued twice — once at `:233` for the merge arithmetic and again inside `upsertCartItem` at `:170`. The redundant read is removed by passing the already-resolved item in. |
| #38: `ProductCombobox` is "built for exactly this shape" | **No.** It takes the whole `ProductListItem[]` and filters client-side through cmdk — it solves the DOM-node count, not the download. A server-search mode (`onSearchChange` → `shouldFilter={false}`) had to be added to `Combobox`. |
| #18: four `findMany` locations | **`operationsCart.list` has a second consumer the finding omits** — `cart-traceability-search-card.tsx` reads it as a bare array and does `.slice(0, MAX_RESULTS)`. Changing the output shape breaks it; migrated to `.items` in the same phase (its slice deleted, the server now bounds it). |

### Deliberate behaviour changes

1. **A >200-item local cart now fails the login merge** (#17) with a toast and is **not** retried — `use-cart-sync.ts` sets `bootstrapCompleted.current` to `true` before the mutation fires, so a rejected merge is permanently skipped for that session. Accepted; the `.max(200)` bound is itself the SEC-7 abuse fix.
2. **The two computed-filter list paths and `getStats.withDiagnostics` are capped at `DIAGNOSTIC_SCAN_LIMIT` = 1000 rows** (#18a). The cap is surfaced, never silent: `truncated` renders a one-line note by the pager and a "(primeros 1000)" note on the "Con diagnosticos" stat card. The common `diagnosticState: "all"` path is exact and page-bounded, not count-capped. Every stat value below the cap is numerically identical to the old JS reduction — each aggregate's row-set was checked against `schema.prisma` (e.g. `packageCount` = `package.count({ shipmentId: { not: null } })` reproduces `records.flatMap(r => r.packages)`).
3. **Operation execution writes in bulk** (#44): the same lots, lot items, demand allocations and roll overs are produced with the same quantities, `status` values and `rebatched` transitions — ~600 statements → ~12 for a 200-item operation. The **Serializable** isolation level is unchanged; the window is shorter, not weaker. `operation-assignment.helpers.test.ts` passes untouched.
4. **The three user-carts dimension filters are debounced server-search comboboxes** (#38). Case-sensitive `contains` deliberately matches the existing admin search — no `mode: "insensitive"` was added to only these three.

### Deviations from the plan

- **#38: `admin.productClientTerms.list` is kept, not deleted — so the DoD grep does not come back empty for that one query.** The plan's §3.4 calls all three filter queries "purely to fill option lists"; that holds for `user.list` and `product.list` (both removed) but **not** for `productClientTerms.list`: `OperationsCartDetailForm` consumes the full `ProductClientTermsListItem[]` records (product, moq, pricing) that the lightweight `options` endpoint intentionally omits. Deleting it would break the cart edit form. The list query is retained **solely for the form**; the terms *filter* uses the new `options` combobox. `admin.user.list` and `admin.product.list` are gone from the page as planned.
- **#44's roll-over join is index-zip, not code-keyed** — the plan's chosen approach. `RollOver` has no unique code, so the positive-filtered inputs are zipped to the returned rows by position, guarded by a `length` assertion that turns any future out-of-order return into a loud failure inside the transaction. `materializeAssignments` keys strictly by generated `code`/`lotItemId`, never by array index.
- **`groupAssignments` throws on a missing lookup instead of using `!`.** biome's `noNonNullAssertion` is on (recommended set); a `requireValue(map, key, label)` helper gives the same invariant a loud, typed failure — which also serves the plan's "loud failure inside the transaction" intent.

### Gates

| Command | Before (`main` @ `22365df`) | After |
|---|---|---|
| `pnpm typecheck` (tsgo) | ✅ exit 0 | ✅ exit 0 — run at every phase boundary |
| `pnpm test` (vitest) | 15 files, 118 tests | ✅ **15 files, 122 tests** — +1 `groupTimelineByCartItem`, +3 `resolveDiagnosticListPage` |
| `pnpm check` (biome) | ❌ 19 errors, 4 warnings | ❌ **19 errors, 4 warnings** — unchanged; finding #19 still open |
| `pnpm build` | ✅ | ✅ — all admin-operations routes compile |
| `pnpm db:generate` | — | ✅ — schema parses, client regenerates; **no migration folder created, no `db:push`/`db:migrate` run** |

New files are biome-clean; the 19 pre-existing errors were not touched.

### Not verified

**None of the plan's eight manual checks was run** — each needs a seeded database and a running app, and `vitest.config.ts` provisions no DB (`environment: "node"`, no DOM). `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm db:generate` are the entire automated net. Specifically not executed, most consequential first:

- **Operation execution end to end** (#44) — the highest-risk check in the batch. A wrong FK order or a mis-keyed join corrupts an operation's lot structure inside a Serializable transaction. `operation-assignment.helpers.test.ts` still passes, but it exercises the pure assignment helpers, **not** the bulk-write path that was rewritten. Confirm the same lots/lot items/demand allocations/roll overs with the same quantities, and that source roll overs flip to `rebatched`.
- **Admin stat-card values** (#18a) — the aggregate scoping is argued on paper against `schema.prisma`, but not compared against recorded pre-change numbers on live data. A wrong scoping produces plausible-but-wrong numbers no test catches.
- **Cart merge on login** (#17), **traceability page rendering** (#37), **user-carts pagination + filter-resets-to-page-1** (#18b), **the traceability search card** on `/admin/operations` (#18b), **the three new comboboxes** including a value outside the first 50 (#38), and **the three existing `ProductCombobox` call sites** in the product-terms dialogs (#38) — all unexercised beyond `pnpm build`.
- **The `RollOver` index is inert until the owner applies it.** `listOpenRollOverDemand` runs identically with or without it; the code change in Phase 3 is independent of the index.

### Open remnants

- **`DomainEventPublisher.publishMany` runs inside the Serializable transaction** but already issues a single `createMany` — not an N+1, so nothing to fix (§15.2's open question, answered here).
- **`operationsCartListSelect` is still the detail select.** Now that the query is page-bounded its depth costs 25 rows, not 5,000; narrowing it is deferred (§2.3) unless the products preview proves expensive.
- **The tracking-page user dropdown** (`user.list` with `includeDeleted: true`, `tracking-client.tsx`) is the obvious next consumer of the new `options` endpoint — deferred (§2.3).
- **The 1000-row diagnostics scan cap** is a stopgap; a computed `diagnosticCount` column or a view would remove it entirely — deferred (§2.3).

### Documentation touched

- **This document** — §1 remediation note + running total (17 → 23), §3 marks on **#17, #18, #37, #38, #44, #45**, §9 Batch 5 marked done, in-place resolution notes on §5.2 **#17, #18, #37, #38** and §5.3 rows **#44, #45, #57**, and this §14.
- `CONTEXT.md` — untouched. No new domain concept: `options`, `truncated` and `summary select` are technical, not domain, vocabulary.
- No ADR — none of these changes alters an architectural decision.

## 15. Remediation Log — 2026-07-25 (fulfillment Phase 0 foundations)

Executed from `tmp/implementation-plan-fulfillment-phase-0-foundations.md` against `main` @ `5feee79`, implementing Phase 0 of `docs/architecture/features/fulfillment-lifecycle-actions.md`. Findings **#12**, **#14** and **#34** closed. Six phases: shared transition module → derivation core → projector cutover → diagnostics consumption → re-aggregation → docs.

The through-line: `CartItem.fulfillmentStatus` stops being *carried* by the event that arrived and starts being *recomputed* from the lineage records that back it. That single change subsumes the retry regression (#12), the `exception` dead end (#12), and the row-`count()`-as-quantity rollover branch (#14) — none of them needed a separate fix once the column is derived.

**Held out of scope by decision:** **#33** (cancelling allocated demand creates no roll over) — Phase 1 of the architecture document, where the supplier loop's first real command shapes it. **#32** and **#16** stay with it. The MercadoPago / money cluster stays parked. **#14's third consequence** — the customer timeline's `Math.max` stage walk — is **deliberately not unified** with the derivation: the journey is computed from history and the column from live lineage, they are allowed to diverge, and `docs/tracking-architecture.md` documents why. **No migration file was written and no backfill or recompute script exists:** `prisma/schema.prisma` was edited and `pnpm db:generate` run; migrations are authored manually after all fulfillment phases land. **`prisma/seed.ts` was not touched** — seed realignment is deferred to the same point.

### What changed, per finding

| # | Phase | Change | New/changed artifacts |
|---|---|---|---|
| 14 | 1 | The four aggregate↔lines compatibility tables, the active-demand set, the fulfillment stage rank (derived from `adminTrackingStageKeys`, never a second literal list) and the entity-status→stage maps get one home | `shared/common/fulfillment-transitions.ts` **[new]** |
| 14 | 2 | A lineage snapshot type + single-round-trip loader (`findUnique` with nested selects: roll overs, demand allocations, lot item/lot/supplier order, packaged allocations, package/shipment), and a **pure** `deriveFulfillmentStatus(snapshot)` over it — no I/O, no `server-only`, decimal comparisons throughout | `tracking/fulfillment-lineage.data.ts` **[new]**, `tracking/fulfillment-status.derivation.ts` **[new]**, `tracking/fulfillment-status.derivation.test.ts` **[new]** |
| 12, 14 | 3 | `TrackingStatusProjector.project(tx, { cartItemId, eventKey?, eventType? })` loads → derives → writes. `fulfillmentStatusByTrackingEvent`, `canProjectStatus`, `targetStatusForCommand`, `countUserOrderItemEvidence`, `hasPackageAllocationEvidence`, `hasShipmentEvidence` and `parsePositiveInt` all deleted — the whole per-event evidence machinery is dead once the column is derived | `tracking/tracking-status-projector.ts` |
| 12 | 3 | `recordFromCommand` splits into `writeTrackingRow` + project; `recordManyFromCommands` writes every row then projects **once per distinct cart item**, passing the last command seen for that item as log context | `tracking/tracking-event.service.ts` |
| 14 | 4 | The three diagnostics files delete their local tables and import them; behaviour byte-identical | `admin/{lot,package,shipment}-diagnostics.ts` |
| — | 4 | `package.shipment.missing` narrowed to `inTransit`; new `operation.rollOver.stale` rule with a per-request threshold reader | `admin/package-diagnostics.ts`, `admin/operation-diagnostics.ts`, `admin/operation.data.ts`, `admin/operation.service.ts`, both diagnostics suites |
| 34 | 5 | `listOriginalDemand` excludes only **open** roll overs (`rollOvers: { none: { status: "open" } }`); `includeRollOver` defaults to `true` in the Zod input schema and in `prisma/schema.prisma` | `operations/operation-execution.service.ts`, `schemas/admin/operation.schemas.ts`, `prisma/schema.prisma` |

### The derivation, stated once

Precedence over **live** records only (an allocation is live when neither its lot item nor its lot is `cancelled`; a packaged allocation is live when neither its package line nor its package is `cancelled`):

| # | Rule | Result |
|---|---|---|
| 0 | cart item deleted or `status === "cancelled"` | `cancelled` |
| 1 | a live packaged allocation whose package **or** shipment is `delayed`/`failed` | `exception` |
| 2 | open roll over quantity > 0 **and** live allocated quantity = 0 | `rolledOver` |
| 3 | open roll over quantity > 0 **and** stage below `packaged` | `partiallyRolledOver` |
| 4 | otherwise | the furthest stage backed by a record |

Ladder: `delivered` ← outbound received ← in end-user shipment ← at warehouse ← in internal shipment ← `packaged` ← `supplierConfirmed`/`requestedFromSupplier` ← `allocatedToSupplierItem` ← `includedInOperation` ← `awaitingAggregation` (floor).

### Deliberate behaviour changes

1. **No monotonic guard, by decision** — the review's #12 fix suggests one (`fulfillmentStatus: { in: STATUSES_RANKED_BELOW[target] }`). Derivation makes it unnecessary and wrong: a retried event recomputes the same value (idempotent by construction), and a legitimate regression — a roll over cutting allocated demand — must be able to move the status *down*. The `where` clause keeps only `fulfillmentStatus: { not: derived }`, which avoids a pointless write, not a regression. ADR 0002.
2. **Derivation is total, and that is the #12 dead-end fix** — an item with no backing record floors at `awaitingAggregation` instead of staying stuck. A stale `exception` clears the moment no `delayed`/`failed` record remains; no `exceptionResolved` target status was needed.
3. **The roll over overlay yields to the ladder from `packaged` onward** — a partially cut order can now reach `delivered` and close its `UserOrder`; the still-open roll over is communicated as a journey notice and the `operation.rollOver.open`/`.stale` diagnostics, not by pinning the customer's status at `partiallyRolledOver` forever.
4. **`trackingStatusProjectionSkipped` keeps its name and level but changes meaning** — it now fires when the arriving event implies a stage *ahead of* the derived status (the evidence the event claims is missing). Deviations (`cancelled`/`exception`/`rolledOver`/`partiallyRolledOver`) are legitimate and silent. Its payload swaps `targetStatus` for `expectedStage` + `derivedStatus`.
5. **A `received` package with no shipment no longer warns** — goods handed over without a movement record are legitimate (depot pickup, Phase 4). Only `inTransit` needs a shipment. The message narrows accordingly.
6. **New diagnostic `operation.rollOver.stale`** (warning) fires when an operation has open roll overs and was created before the 2nd most recent completed operation. The threshold is one query per request in `operation.data.ts` (`findStaleOpenRollOverThreshold`); the rule itself stays pure and its options argument optional, so `createAndExecute`'s three `parseDetail` call sites are unchanged and a just-created operation is never stale.
7. **Rolled-over demand re-enters aggregation** (#34): an item whose roll over was rebatched, resolved or cancelled returns to the original-demand pool, while one still awaiting rebatch is sourced through `listOpenRollOverDemand` — no double counting, since `cartItemLotItems: { none: {} }` still keeps allocated demand out. And `includeRollOver` now defaults **on**, so leaving paid demand out of a batch requires an explicit opt-out.
8. **One extra query per projected cart item** inside the listener transaction — a single `findUnique` with nested selects, deduped per batch by the `recordManyFromCommands` rewrite. It replaces the 1–2 `count()` evidence queries the old projector issued per event.

### Deviations from the plan

- **The create dialog needed no change.** T11 lists `operation-create-dialog.tsx` as an edit; `defaultOperationCreateFormValues` (`operation.mappers.ts:160`) already returns `includeRollOver: true`, so the switch already opened on. Only the Zod default and the Prisma column default actually disagreed with the intent, and both were flipped.
- **`writeTrackingRow` is a module-level function, not a `private static` method.** Every other helper in `tracking-event.service.ts` is module-level; a non-exported function is private to the module and matches the file.
- **The `trackingEventRecorded` log moved into `writeTrackingRow`**, so it stays one-per-row in both the single and the batch path — previously it ran after projection, which the dedupe would have collapsed.

### Gates

| Command | Before (`main` @ `5feee79`) | After |
|---|---|---|
| `pnpm typecheck` (tsgo) | ✅ exit 0 | ✅ exit 0 — run at every phase boundary |
| `pnpm test` (vitest) | 24 files, 208 tests | ✅ **25 files, 228 tests** — +17 derivation cases, +1 `package.shipment.missing` silence case, +2 `operation.rollOver.stale` cases; the pre-existing diagnostics suites pass otherwise untouched |
| `pnpm check` (biome) | ❌ 23 errors, 4 warnings | ❌ **23 errors, 4 warnings** — unchanged; all in `tsconfig.json`, `package.json`, `biome.jsonc`, `components.json`, `.vscode/*`, `.agents/skills/*`, `skills-lock.json`, `postcss.config.js`, `src/components/ui/input.tsx`. Every file touched this session is biome-clean (finding #19 still open) |
| `pnpm db:generate` | — | ✅ — schema parses, client regenerates; **no folder added under `prisma/migrations/`**, no `db:push`/`db:migrate` run |

### Not verified

- **No end-to-end projection run.** The derivation is proven by fixture tests that mirror every seed lineage; nothing exercised the projector against a database. The highest-value manual check is: run an operation, then open a cart item's tracking detail and confirm the chip matches the stepper.
- **The diagnostic list/detail symmetry** (a row's diagnostic count matching its modal) is unchanged by construction — `operation.rollOver.stale` reads only `createdAt` (already in `operationListSelect`) and roll over `status`, and `operationDiagnosticsRelationSelect` gained no field — but was not clicked through.
- **The create dialog's roll over switch** was read, not rendered.
- **The schema default and the database default now disagree** until the manual migration runs. No code path omits `includeRollOver` (`operation.data.ts:392` always passes it), so the column default is never exercised at runtime.

### Known seed divergence

`prisma/seed.ts` stores `partiallyRolledOver` for the arroz fixture (open pre-allocation roll over of 4 against a live allocation of 6, packaged and received on an internal transfer). Derivation returns **`atWarehouse`**: from `packaged` onward the ladder outranks the open roll over. The divergence is enumerated in `fulfillment-status.derivation.test.ts` and resolves when seeds are realigned after all fulfillment phases. Existing rows keep their hand-written `fulfillmentStatus` until their next tracking event arrives — there is no recompute path, by decision.

### Open remnants

- **#33** (cancelling allocated demand creates no roll over) is the demand-conservation half of this subsystem and remains open for Phase 1.
- **Legal per-entity transition ladders** are not in `fulfillment-transitions.ts` yet — deliberately deferred to Phase 1, where the first guard exercises them. The module is designed to be additive.
- **`deriveStage` is private.** Exporting it would serve the future `availableActions` computation; kept internal until Phase 1 needs it.
- **A diagnostic comparing the derived column against the journey's history-derived stage** would turn the redefined `trackingStatusProjectionSkipped` warning into a worklist row (architecture §20.3) — not built.

### Documentation touched

- **This document** — this §15 only. Finding bodies, §1 and §3 marks left alone; the logs are append-only here.
- `docs/tracking-architecture.md` — the `TrackingStatusProjector` section rewritten around load → derive → write (precedence table, stage ladder, the no-monotonic-guard rationale, the warning's new meaning), the batch dedupe noted under `TrackingEventService`, step 8 of "Adding A New Domain Event" now points at the derivation instead of per-event evidence checks, and the write-path diagram's last line updated.
- `docs/architecture/features/fulfillment-lifecycle-actions.md` — Phase 0 marked delivered in §21 with what actually landed.
- `CONTEXT.md` — updated in the planning session: **Aggregate status** now states it is recomputed from the live records that back it, and `_Avoid_` gains "event-carried status".
- ADRs 0002–0005 were written in the design session; none was created or changed here.

## 16. Remediation Log — 2026-07-26 (fulfillment Phase 1 supplier loop)

Executed from `tmp/implementation-plan-fulfillment-phase-1-supplier-loop.md`; the phase's "as built" record lives in `docs/architecture/features/fulfillment-lifecycle-actions.md` §21.2.

### What changed, per finding

- **#33 — cancelling allocated demand creates no roll over: closed.** Every Phase 1 path that removes quantity from a live allocation now creates `RollOver(stage: postAllocation, status: open)` for exactly that quantity, inside the same transaction:
  - `supplierOrder.confirm` with a line below its requested quantity — the cut is absorbed across allocations by `planCutAbsorption` (LIFO by payment date, or an operator's per-allocation override), one roll over per reduction.
  - `supplierOrder.confirm` with a line confirmed at `0` — the line moves to `cancelled` and every allocation rolls over in full.
  - `supplierOrder.cancel` — the order, its lots and all live lines move to `cancelled`; one roll over per live allocation for its full quantity.
  - `supplierOrder.cancelLine` — the same, scoped to one line, cascading the lot and then the order when nothing live remains.

  Conservation is enforced in the planner (`Σ removedQuantity === cut`, invalid override sets throw `CONFLICT`) and observable through `recomputeOperationCounters`, which rewrites the six live counters from records in the same transaction so `operation.quantity.balanceMismatch` and `operation.quantity.assignedMismatch` stay silent across every move.

- **#32 and #16** remain open; they were bundled with #33 by the Phase 0 log but are not touched by the supplier loop's commands.

### Deliberate behaviour changes

Three diagnostic rules were corrected because Phase 1 produces the first `cancelled` lots and lot items at runtime, and all three would have reported findings on a correct system:

- `lot.status.aggregateAheadOfLines` and the two per-line lot rules (`lot.item.noDemandAllocations`, `lot.item.quantityMismatch`) now skip cancelled lines.
- `lot.cancelledWithActiveDemand` reads the new `unresolvedDemandFulfillmentStatuses` instead of `activeDemandFulfillmentStatuses`; the latter counts `rolledOver`, which is exactly what a correct cancellation produces.
- `operation.quantity.assignedMismatch` sums only live lot items on live lots, sharing the `isLiveLotItem` predicate with `computeOperationCounters` so the rule and the counter can never disagree. `operationDiagnosticsRelationSelect` gained `status` on lots and lot items to support it — added to the thin list select, which is what keeps a row's diagnostic count identical to the modal's.

### Gates

`pnpm test` (312 passing, 30 files), `pnpm typecheck`, `pnpm biome check` on all 48 touched files, and `pnpm build` all clean. Repo-wide `pnpm check` still reports pre-existing findings in files this phase did not touch (`tsconfig.json`, `package.json`, `src/components/ui/*`, `src/lib/utils.ts`, `.vscode/*`).

### Not verified

No end-to-end run against a seeded database was performed — the test suite is `environment: "node"` with no DB fixture harness, so the transactional paths (cascades, roll over creation, counter recompute, projection after `wake()`) are covered by the pure cores and by review, not by execution. The manual flow in the plan's §11 is still owed.

### Open remnants

- No retry-on-serialization-failure wrapper for the three `Serializable` commands; architecture §18's claim that "the pattern exists" is still wrong and should be corrected when one lands.
- `availableActions` exists on `admin.supplierOrder` only.
- `admin.rollOver` exposes `resolve` and nothing else — no list, no dedicated page.
- **No migration file was written.** `CartItemTrackingEventType.rollOverResolved` was added to `prisma/schema.prisma` and applied with `pnpm db:generate` + `pnpm db:push`; migrations are authored manually after all fulfillment phases land.
- **`prisma/seed.ts` was not touched.** The fixtures Phase 1's logic would no longer produce are enumerated in architecture §21.2 rather than edited.

### Documentation touched

- **This document** — this §16 only; the logs are append-only here.
- `docs/architecture/features/fulfillment-lifecycle-actions.md` — Phase 1 marked done in §21 with a new §21.2; the two §20.2 questions this phase answered marked resolved in place; §12 records `rollover.resolved` and the `rollOverResolved` tracking type.
- `docs/tracking-architecture.md` — a "Supplier Loop" subsection under "Current Producers" with the four events and their deterministic keys, and two new rows in the mapping table.
- `CONTEXT.md` — **Cut absorption** added to the fulfillment glossary.

## 17. Remediation Log — 2026-07-26 (fulfillment Phase 2 operation compensation)

Executed from `tmp/implementation-plan-fulfillment-phase-2-operation-compensation.md`; the phase's "as built" record lives in `docs/architecture/features/fulfillment-lifecycle-actions.md` §21.3.

### What changed, per finding

- **#34 — re-aggregation exclusion: still closed, and its second clause now carries the weight.** Phase 0 fixed the roll over clause of `listOriginalDemand` (`rollOvers: { none: { status: "open" } }`). Phase 2 narrows the *other* clause of the same query, from `cartItemLotItems: { none: {} }` to "no allocation on a live lot item of a live lot", so a compensated cart item becomes aggregable again. The two clauses are now load-bearing together: the allocation clause alone would let a supplier-cancelled item (Phase 1 always mints an open roll over for one) be counted twice, and the roll over clause alone would strand a compensated item forever. Both sites carry a comment saying so; do not weaken either without the other.

- No other listed finding is touched. **#32 and #16** remain open.

### Deliberate behaviour changes

Three corrections were required because Phase 2 produces the first `cancelled` *operations* at runtime, and all three would have misreported on a correct system:

- `deriveStage`'s `includedInOperation` floor counted roll overs of any status, so a compensated item — whose roll overs are all `cancelled` — would have stuck at `includedInOperation` instead of falling back to `awaitingAggregation`. It now counts non-`cancelled` roll overs only.
- `calculateOperationDiagnostics` returns early for a cancelled operation into a single rule of its own, `operation.cancelled.notCompensated` (critical: a live lot item or an own `open` roll over survived the compensation). The exemption is structural: compensation recomputes the live counters to zero while `eligibleQuantity` stays the frozen execution snapshot, so `operation.quantity.balanceMismatch` would otherwise fire on every cancelled operation by construction.
- The embedded operation summaries in `src/schemas/admin/lot.schemas.ts` and `src/schemas/admin/supplier-order.schemas.ts` hard-coded `["running","completed","failed"]`; both gained `cancelled`. Without it the lot list and the supplier-order detail would have failed to parse the moment any operation was compensated.

`operationCreateInputSchema`'s object body was extracted as `operationCreateFieldsSchema` so `operationRerunInputSchema` can extend it — a refined schema is a `ZodEffects` and has no `.extend`, which would have left the date-order rule duplicated or dropped.

### Gates

`pnpm test` (332 passing, 31 files), `pnpm typecheck`, `pnpm biome check` on all 59 touched files, and `pnpm build` all clean. Repo-wide `pnpm check` still reports pre-existing findings in files this phase did not touch.

### Not verified

No end-to-end run against a seeded database was performed, for the same reason as Phase 1 — the suite is `environment: "node"` with no DB fixture harness. The compensation writes, the `rebatchedIntoOperationId` revert, `rerun`'s compound transaction and the projection after `wake()` are covered by the pure cores and by review, not by execution. The manual flow in the plan's §11 is still owed.

### Open remnants

- Still no retry-on-serialization-failure wrapper; the phase adds two more `Serializable` commands (six total), and `rerun` holds a compensation *and* a full execution in one transaction.
- `availableActions` now exists on `admin.supplierOrder` and `admin.operation`; `lot`, `package` and `shipment` still compute nothing.
- `admin.rollOver` still exposes `resolve` only — a roll over reverted to `open` by a compensation is visible only inside its owning operation's detail dialog.
- **No migration file was written.** `OperationStatus.cancelled`, `CartItemTrackingEventType.excludedFromOperation` and `RollOver.rebatchedIntoOperationId` were applied with `pnpm db:generate` + `pnpm db:push`.
- **No backfill.** Roll overs marked `rebatched` before this phase keep a null back-link and would not be reverted by a compensation — confirmed on the development database.
- **`prisma/seed.ts` was not touched**; the drift is enumerated in architecture §21.3.

### Documentation touched

- **This document** — this §17 only; the logs are append-only here.
- `docs/architecture/features/fulfillment-lifecycle-actions.md` — Phase 2 marked done in §21 with §21.3 rewritten from "as planned" to "as built"; §3, §11, §12, §14, §15 #11 and §18 carry its shipped markers; the §20.2 `cancelledAt` question resolved in place.
- `docs/tracking-architecture.md` — an "Operation Compensation" subsection under "Current Producers" with `operation.cartItem.excluded` and its deterministic key, plus a row in the mapping table.
- `CONTEXT.md` — **Operation compensation** and the refined **Administrative window** were added during the grill; unchanged by the build.

## 18. Remediation Log — 2026-07-26 (fulfillment Phase 3 goods inbound)

**Written after the fact, 2026-07-27**, during the series closure. Phases 3–5 shipped without a log entry each; these four sections restore the append-only record from the as-built documents rather than re-deriving it. The architecture document's §21.4 is the primary source for this section.

### What changed, per finding

- No listed review finding is touched. **#32 and #16** remain open.

Structurally, the phase makes the supplier order the command aggregate for the dispatch (`admin.supplierOrder.registerDispatch`) — the shipment and the inbound package are its *outputs*, which **corrects §12** of the architecture document, where the dispatch had been placed on `admin.lot`/`admin.package`/`admin.shipment`.

### Deliberate behaviour changes

- **`Package.leg` replaces shipment-type leg inference** in `FulfillmentPackagedAllocationSnapshot` (ADR 0004). The switch broke the build on purpose until `deriveStage` was rewritten, and the rewrite replaced the old outbound/inbound partition with a max-rank walk over `packagedStage` — a half-received lineage now reads as the furthest stage it actually reached rather than the first branch that matched.
- **Dispatched quantity is derived, never stored**: Σ of a line's live *inbound* package lines. Only the inbound leg counts, or fractionation would double-charge the same quantity.
- **Coverage is FIFO by payment date**, the mirror of LIFO cut absorption, so the two policies never punish the same customer twice.
- **`supplierOrder.cancel`/`cancelLine` now refuse a line holding live inbound packaged quantity.** Without the guard the phase would have shipped a silent conservation break that *no diagnostic catches* — `assigned + rollOver` still sums correctly because packaged quantity is not a separate counter.

### Latent defects fixed on the way through

| Where | Defect |
| --- | --- |
| `fulfillment-transitions.ts` | `supplierOrderStatusLineCompatibility.readyForReceipt` omitted `confirmed`, so **every dispatched order** would have reported its aggregate as ahead of its lines |
| `package-diagnostics.ts` | the two per-line rules iterated every line, so every written-off or zero-received line fired by construction; both now read a `liveLines` filter |
| `shipment-diagnostics.ts` | `shipment.package.missing` fired on every correct `retry` (which empties the source); the two compatibility rules fired on cancelled records |

### Gates

`pnpm test` (451 passing, 35 files), `pnpm typecheck`, `pnpm build` and `pnpm biome check` over every touched file, all clean. Repo-wide `pnpm check` still reports pre-existing findings in files the phase did not touch.

### Not verified

No end-to-end run against a seeded database. The transactional paths — dispatch creation and coverage, the four shortfall reductions, order closing, the retry reassignment, projection after `wake()` — were covered by the pure cores and by review, **not by execution**. Discharged in §22.

### Open remnants

- No retry-on-serialization-failure wrapper; the `Serializable` command count reached **nine**. *(Shipped in Phase 4b.)*
- `availableActions` on `supplierOrder`, `operation`, `shipment` and `package`; **`lot` still computed nothing**. *(Shipped in Phase 4b as a disabled matrix, made real in §22.)*
- `admin.rollOver` still exposed only `resolve`. *(Shipped in Phase 4b.)*
- A `dispatch.notReceived after N days` diagnostic was raised and not built. *(Shipped in §22.)*
- **No migration file**; `PackageLeg` and `Package.leg` were applied with `pnpm db:generate` + `pnpm db:push`. **No backfill** — pre-existing packages silently took `leg: inbound` from the column default, which is the root of the seed drift §22 fixes.
- **`prisma/seed.ts` untouched**; the drift is enumerated in architecture §21.4.

### Documentation touched

`docs/architecture/features/fulfillment-lifecycle-actions.md` §21.4 (as-built), `docs/tracking-architecture.md`, `CONTEXT.md`, ADR 0004.

## 19. Remediation Log — 2026-07-26 (fulfillment Phase 4a outbound packaging)

**Written after the fact, 2026-07-27.** Source: architecture §21.5 (the 4a/4b split) and §21.6 (as built).

### What changed, per finding

No listed review finding is touched.

### Deliberate behaviour changes

- **Fractionation creates new outbound rows and never mutates its sources.** The inbound package stays `received` as the only remaining evidence the goods arrived — `closeReachableSupplierOrders`, `packagedQuantity` and `deriveStage`'s `atWarehouse` branch all read it. Safe because ADR 0004 checks conservation **per leg**.
- **A new invariant, sharper than ADR 0004's:** Σ live outbound allocations of a demand allocation ≤ Σ live inbound allocations of that demand on a **`received`** package. Monitored by `package.outbound.exceedsReceived` (critical).
- **The fractionation budget is per demand allocation, not per packaged allocation.** Two selected sources covering the same `CartItemLotItem` after a partial first pass would otherwise each claim the whole remainder.
- **`packagedStage`'s outbound branch moved outbound-not-departed from rank 5 to rank 7**, across the threshold `deriveFulfillmentStatus` compares against for the roll over overlay. A partially rolled-over item with an outbound package now reads `atWarehouse` rather than `partiallyRolledOver` — intended, and pinned by its own test.
- **`package.promote` publishes no domain event.** The deterministic `packagedKey` for that row was already consumed by `registerDispatch`, so a re-emit would be deduped into silence. The audit log is the record; it is a decision, not an omission.

### Gates

`pnpm test` (503 passing, 37 files), `pnpm typecheck`, `pnpm build` and `pnpm biome check` over every touched file, all clean.

### Not verified

As in Phases 1–3, no end-to-end run. Candidate building, group creation, the split's read-modify-write over allocations and the lot roll-up were covered by the pure cores and by review. Discharged in §22.

### Open remnants

- Batch fractionation across several source packages was implemented in the **command** (`sourcePackageIds` is a list) but the **UI** only ever sent the package whose detail was open. *(Shipped in §22.)*
- `dispatch.notReceived` and `package.received.notFractionated`, both `after N days`, raised and not built. *(Shipped in §22.)*
- **No schema change and no seed change**; every drift enumerated in §21.4 carried over.

### Documentation touched

`docs/architecture/features/fulfillment-lifecycle-actions.md` §21.5 and §21.6, `CONTEXT.md`.

## 20. Remediation Log — 2026-07-26 (fulfillment Phase 4b delivery and order closure)

**Written after the fact, 2026-07-27.** Source: architecture §21.7.

### What changed, per finding

No listed review finding is touched. Two long-standing series debts are discharged here rather than in a later phase:

- **The `Serializable` retry wrapper**, owed since Phase 1. `runSerializable` in `_base/serializable-transaction.ts` is now the only place `Serializable` is requested, with a bounded P2034 retry; the call-site count stayed at twelve. §18's risk row — which had claimed "pattern exists" and was verified false in Phase 1 — is finally true.
- **`admin.rollOver.list` and `/admin/roll-overs`**, owed since Phase 2. The page deliberately does **not** hide `resolved` by default: finding them is the point.

### Deliberate behaviour changes

- **The chain terminates.** `inEndUserShipment` and `delivered` became reachable, taking `CartItemFulfillmentStatus` to 14 of 14, and every declared domain event type gained a producer — the unpublished count reached zero, closing the gap tracked since Phase 0.
- **`Shipment.deliveryMode` stores two modes and derives a third.** Depot pickup is deliberately not an enum value: it is the *absence* of a shipment, the shape `createOutboundPackage` already produces. The delivery event for that path therefore carries `packageId` and **omits `shipmentId`** — the case §12's contract adjustment exists for, and it applies to **both** end-user event schemas, not only the one §12 named.
- **The pickup-point asymmetry is the reason the column exists.** `shipment.deliver` marks only the shipment `received` and publishes an arrival notice; the packages and their lines stay `inTransit` until each customer's own `package.confirmDelivery`. The branch is written so the pickup path cannot reach the package cascade.
- **`shipment.receive` now refuses `endUserDelivery`.** Not in the plan, but end-user shipments became creatable in this phase and `receive` runs the inbound absorption path. The end-user leg closes with `deliver`, which moves no quantity.
- **The end-user movement key carries a leg segment.** The internal shape is untouched — those keys are already in the outbox — and the end-user leg inserts `endUser:` before the movement word, so the two can never collide.
- **`UserOrder` closure is gated to `processing` only.** An allow-list of one, deliberately: `UserOrder.status` is owned by the payment domain, and a deny-list would stop being correct the moment `UserOrderStatus` grows.
- **A delivery discrepancy has no dedicated command.** It is composed from `package.split` + `markFailed` + `writeOff`, all of which already run the four reductions. The consequence is that 4b added zero `Serializable` commands and zero counter recomputes.

### Gates

`pnpm test`, `pnpm typecheck`, `pnpm build` and `pnpm biome check` over every touched file, all clean.

### Not verified

No end-to-end run; the three delivery modes, the closure roll-up and the recovery paths were covered by the pure cores and by review. Discharged in §22.

### Open remnants

- `lotAvailableActions` shipped as every supplier-order key **disabled**, naming the commanding order — ADR 0003 stated at the surface, not real enablement. *(Made real in §22.)*
- No status-transition timestamps on `Shipment`/`Package`; deferred as a modelling decision (architecture §15.3).
- **No migration file**; `DeliveryMode` and `Shipment.deliveryMode` were applied with `db:push`.
- **`prisma/seed.ts` untouched**: both seeded end-user shipments carried a null `deliveryMode`, which `shipment.endUser.noDeliveryMode` correctly reported as critical. *(Fixed in §22.)*

### Documentation touched

`docs/architecture/features/fulfillment-lifecycle-actions.md` §21.7 and §8's delivery scenarios, `docs/tracking-architecture.md`, `CONTEXT.md`, ADR 0005.

## 21. Remediation Log — 2026-07-26 (fulfillment Phase 5 carrier orders)

**Written after the fact, 2026-07-27.** Source: architecture §21.8.

### What changed, per finding

No listed review finding is touched.

### Deliberate behaviour changes

- **`carrier-order.service.ts` publishes nothing** (§15 #10). A booking is a manual transcription of a real-world arrangement: it carries no quantity, and nothing downstream derives from its status. It has no effects handler, no `AdminOperationsMutationSource` entry and no dispatcher wake-up — and that is a decision, not an unfinished wiring.
- **`carrierOrder.status.aggregateAheadOfShipments` is a `warning`, not a `critical`.** Every critical rule in the repository guards demand conservation or a broken command precondition; an inconsistent booking misleads an operator without endangering data.
- **`failed` is terminal on the carrier-order ladder**, unlike `shipmentTransitions` where `failed → cancelled` exists because `retry` empties the source. A carrier order has no retry command; a failed booking is re-transcribed as a new one.
- **Editing stays open on a terminal status.** `externalReference` often arrives after the fact; the audit log is the trail.

### Gates

`pnpm test` (577 passing, 40 files), `pnpm typecheck`, `pnpm build` and `pnpm biome check` over every touched file, all clean.

### Not verified

The live run reached the refusal paths only: no seeded shipment was unassigned, so `carrierOrder.addShipments` could not be exercised against a real candidate, and no seeded booking sat at `pending`, so `request` and `confirm` had no fixture. *(Both fixtures added in §22; the attach/detach pass remains a manual UI check.)*

### Open remnants

- `carrierOrder.restore` (un-soft-delete) and `carrierOrder.deletedWithLiveShipments` deferred behind stated gates (architecture §21.9 Group D).
- A structured `CarrierOrder.metadata` schema deferred; it stays free-form JSON.
- **No migration file**; the `CarrierOrder` model and `CarrierOrderStatus` were applied with `db:push`.

### Documentation touched

`docs/architecture/features/fulfillment-lifecycle-actions.md` §21.8, `CONTEXT.md`, `admin-nav.ts`.

## 22. Remediation Log — 2026-07-27 (fulfillment series closure)

Executed from the closure plan — five phases: commit the series → realign and expand the seed → end-to-end harness → Group C refinements → re-verify and close. **Not a phase**: every architectural decision behind it was already taken. The as-built record is architecture §21.10; the audited inventory it discharges is §21.9.

### What changed, per finding

No listed review finding is touched. **#32 and #16** remain open.

The two entries §21.9 raised against *this document* are discharged: **B2** (the log stopped at Phase 2) by §18–§21 above, and **B1** (the whole series uncommitted) by ten reviewable commits.

### Deliberate behaviour changes

Three defects in shipped code, each found by building a fixture or running the harness, each fixed with a test rather than worked around:

- **`packagedStage`'s outbound arrival.** The branch read a `received` *shipment* as an arrival, so a pickup-point shipment derived `delivered` while its packages were still `inTransit` — the exact opposite of the asymmetry Phase 4b exists for. Only the package's own `received` is a handover now. Home delivery and depot pickup both cascade the package, so no other path changes. Review missed it because every outbound derivation test set package and shipment to `received` together.
- **`lot.cancelledWithActiveDemand` and `supplierOrder.cancelledWithActiveDemand` fired `critical` on every correct compensation.** Compensation is status-only and returns its cart items to `awaitingAggregation`, which both rules read as unresolved demand. Both now exempt a cancelled operation, mirroring the operation-level exemption §14 of the architecture document already establishes. The rules were written for the supplier loop, which mints roll overs instead — and no fixture had ever carried a cancelled operation.
- **Prisma's default 5s interactive-transaction timeout.** The fulfillment commands issue dozens of sequential round trips inside one transaction, so against a managed Postgres a few hundred kilometres away `supplierOrder.request` and then `shipment.receive` aborted with P2028. `src/server/db.ts` now sets a client-level ceiling; co-located with its database the longest of these commands still finishes in well under a second. Unreachable without executing the service layer against a remote database, which is exactly what the owed end-to-end run was for.

Beyond those, the Group C refinements are new behaviour by design: four `after N days` diagnostics (all `warning`), the "sin orden de transporte" shipments filter, multi-source fractionation, and real `lotAvailableActions` delegation. Architecture §21.10 records each.

### Two more, recorded and not fixed

Both are **pre-execution** behaviour, outside the post-execution lifecycle this series owns, and both surfaced by running the chain rather than reading it:

- `listOriginalDemand` excludes only `open` roll overs, so a cart item whose roll over was **resolved** — terminal by ADR 0005 — becomes aggregable again while its derived status reads `cancelled`. Not touched: the closure plan's §2.4 makes those two exclusion clauses a guardrail, and the fix is a third clause needing its own conservation argument.
- **Aggregation applies the supplier MOQ per cart item rather than to pooled demand.** `calculateAssignableQuantity` runs once per `DemandItem`, so a customer ordering below the supplier's minimum rolls over pre-allocation however many other customers ordered the same product in the same operation. Four seeded carts ordering the same two products produced allocations for only two of them. Whether that is intended is a real domain question — pooling demand to reach a supplier minimum is arguably what an operation is *for* — and it is not this series' to answer.

Each belongs to a `simple-grill` of its own.

### Gates

`pnpm test` (592 passing across 40 files — the 577 pre-existing **unmodified**, plus 15 new cases), `pnpm typecheck`, `pnpm build` and `pnpm biome check` over every touched file, all clean. `grep -rn "TransactionIsolationLevel.Serializable" src/` returns **exactly one hit**, and `git diff prisma/schema.prisma` is **empty** — the closure introduced no schema change, as designed. `pnpm db:seed && pnpm db:seed-verify && pnpm fulfillment:e2e` all exit 0.

Three test fixtures gained a field they had always been missing (`lot.operation` in `lot-diagnostics.test.ts` and `operational-diagnostics.test.ts`); no existing assertion changed.

### Not verified

The admin UI itself. The shipments filter, the multi-source fractionate dialog, the lot detail's newly-enabled buttons and Phase 5's attach-then-detach against the now-existing unassigned shipment are a manual pass — the repository has no component-test harness, and the harness drives the service layer by design. The expanded seed makes that pass materially more valuable: every screen now has real rows in every state.

### Open remnants

- **Group D of architecture §21.9 stays listed with its gates** — closed *as deferred*, not forgotten.
- **Group E stays open with a sharper resolver.** The twelve steps contain no compensation, so the run never reverted a roll over to `open`; §20.2 now names the exact reproduction rather than declaring victory.
- **A3 (migration baselining) is owner-managed out of band** and was excluded from the closure by decision.
- The harness is a *script*, not a `vitest` integration suite. Converting it needs a per-test transactional database fixture — a larger, separate piece of work.
- `resetDemoTransactionalData` still only removes `*-SEED-*` rows. The two known strays were deleted explicitly; a general policy is not decided.

### Documentation touched

- **This document** — §18–§21 (historical entries for Phases 3, 4a, 4b, 5) and this §22.
- `docs/architecture/features/fulfillment-lifecycle-actions.md` — the new **§21.10** (closure as built), §21.9's Groups A/B/C struck through with what discharged each, §20.2's Group E question re-armed, the status header and §24 rewritten for the closed state, and §22's pointer changed to describe the plan rather than link into the gitignored `tmp/`.
