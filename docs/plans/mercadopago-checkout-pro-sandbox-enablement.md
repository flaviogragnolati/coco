# Implementation Plan: Mercado Pago Checkout Pro Sandbox Enablement

## 1. Objective & outcome
- **Done means:** an authenticated customer can select Mercado Pago, create a sandbox Checkout Pro preference from server-owned cart prices, follow the sandbox redirect, and have signed payment webhooks reconciled into the existing payment attempt and order records.
- **Why:** the Checkout Pro implementation is present but is not operational: the local credentials use unsupported aliases, the provider row is disabled/absent, and the public Vercel deployment does not contain the Mercado Pago routes.
- **For:** AI coding agent / developer
- **Upstream design doc:** `docs/plans/mercadopago-checkout-admin.md`

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Product | Use Checkout Pro preferences, not direct card handling, Bricks, or Orders API | ADR 0001 and existing plan |
| Domain record | `UserTransaction` is the payment attempt; `Operation` remains a fulfillment batch | `CONTEXT.md` |
| Environment | Validate only with the configured Mercado Pago test seller in sandbox; no real charges | user |
| Public base URL | `https://coco-murex.vercel.app` | user |
| Webhook | Receive payment events at `/api/mercadopago/webhook`, validate the secret signature, then fetch the payment as source of truth | ADR 0001, code, official docs |
| Credential names | Preserve canonical `MERCADOPAGO_*` names while accepting the existing local aliases `MP_ACCESS_TOKEN` and `MP_WEBHOOK_TOKEN` server-side | code audit + user environment |
| Activation | Enable a sandbox provider configuration with signed webhooks; unsigned processing stays disabled | user + secure default |
| Deployment | A preview deployment is allowed by default; updating the stable production deployment requires explicit confirmation | Vercel deployment rule |

## 3. Scope
- **In scope:** environment alias resolution, sandbox provider activation, Vercel HTTPS return/webhook URLs, preference payload correctness, signed webhook reconciliation, automated checks, a real test preference, and a Vercel preview.
- **Out of scope / non-goals:** production Mercado Pago credentials, real charges, refunds, direct card APIs, Bricks, OAuth/marketplace, or redesigning the existing admin payments UI.
- **Deferred:** production cutover and rotating to production credentials after sandbox acceptance.
- **Must not change / break:** mock payment methods, server-owned price calculation, one fulfillment transition per completed order, provider-secret isolation, and the user’s unrelated worktree changes.

## 4. Current system context

`src/server/services/checkout/checkout.service.ts` already creates a pending order and payment attempt, calls `createMercadoPagoPreference`, and chooses `sandboxCheckoutUrl` when `providerMode` is `sandbox`. `src/app/api/mercadopago/webhook/route.ts` persists provider events, validates signatures, and calls `reconcileMercadoPagoPayment`, which fetches `Payment.get` before changing internal state. `src/app/checkout/mercadopago/*` contains the return pages, while `/admin/payments` manages the provider row.

The database already contains `payment_provider_config`, `payment_provider_event`, and the provider columns on `user_transaction`, but no Mercado Pago config row. The configured token belongs to the configured test seller. The stable Vercel deployment currently returns 404 for the return and webhook routes.

## 5. Approach & sequencing

Make credential resolution deterministic and tested first. Then harden the preference payload with pure, testable builders so the sum sent to Mercado Pago matches the internal order total. Run all local gates before writing the reversible sandbox configuration to Neon. Finally create a harmless sandbox preference and deploy a preview; do not update the stable deployment without explicit approval.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| `MP_ACCESS_TOKEN` is a test seller token | `/users/me` matches the configured test seller | Mercado Pago rejects test preference creation | obtain current Checkout Pro test credentials |
| `MP_WEBHOOK_TOKEN` is the Webhooks secret signature | user added it for this purpose | signed simulator request fails validation | replace it with the secret shown under Webhooks |
| Vercel and local execution share the same Neon database | current `.env` points to the application database | preview diagnostics/config differ | configure the intended preview database explicitly |
| Current schema is already applied | read-only inspection found provider tables and columns | runtime Prisma query fails | synchronize schema before activation |

## 7. Phased execution plan

### Phase 1 — Runtime configuration
**Objective:** make existing safe aliases usable without exposing secrets.
**Tasks:** T1, T2.
**Dependencies:** none.
**Validation / done:** helper tests and environment diagnostics recognize both canonical and alias names.

### Phase 2 — Preference and webhook reliability
**Objective:** prove the outgoing preference and incoming state decisions preserve money and trust boundaries.
**Tasks:** T3, T4.
**Dependencies:** Phase 1.
**Validation / done:** focused unit tests pass; typecheck accepts SDK v3.1.0 request shapes.

### Phase 3 — Sandbox activation
**Objective:** make Mercado Pago selectable with stable public URLs and no unsigned fallback.
**Tasks:** T5.
**Dependencies:** Phases 1–2 and successful local gates.
**Validation / done:** Neon contains one enabled `mercadopago` sandbox config with the agreed HTTPS URLs and no secrets in JSON.

### Phase 4 — External validation and deployment
**Objective:** verify the provider accepts the payload and publish a testable build.
**Tasks:** T6, T7.
**Dependencies:** Phase 3.
**Validation / done:** Mercado Pago returns a preference id and sandbox init point; Vercel returns a preview URL. Stable deployment remains untouched unless approved.

## 8. Task breakdown

### T1 — Resolve Mercado Pago server credential aliases
- **Files:** `src/env.helpers.js`, `src/env.helpers.test.ts`, `src/env.js`
- **Symbols / signatures:** `firstDefinedEnvValue(...values)`, `runtimeEnv.MERCADOPAGO_ACCESS_TOKEN`, `runtimeEnv.MERCADOPAGO_WEBHOOK_SECRET`
- **Change (operational, not finished code):** prefer canonical names and fall back to `MP_ACCESS_TOKEN` / `MP_WEBHOOK_TOKEN`, treating empty values as absent.
- **Mirror this pattern:** `defaultAppEnvFor` in `src/env.helpers.js`
- **Depends on:** none
- **Acceptance:** unit tests cover canonical precedence, alias fallback, and empty values; no client schema exposes either secret.
- **Pitfalls:** never log resolved values or add them to client env.

### T2 — Document supported configuration
- **Files:** `.env.example`, `README.md`
- **Symbols / signatures:** Mercado Pago environment section
- **Change (operational, not finished code):** keep canonical variables as the recommended contract and document legacy aliases plus the Vercel/webhook setup without secret values.
- **Mirror this pattern:** existing Better Auth and Prisma env documentation
- **Depends on:** T1
- **Acceptance:** a new environment can be configured without reading implementation code.
- **Pitfalls:** do not commit credentials or test-account passwords.

### T3 — Make the preference payload money-conserving and testable
- **Files:** `src/server/services/payments/mercadopago/mercadopago-preference.service.ts`, `src/server/services/payments/mercadopago/mercadopago-preference.decision.ts` `[NEW]`, `src/server/services/payments/mercadopago/mercadopago-preference.decision.test.ts` `[NEW]`
- **Symbols / signatures:** pure preference-item/body builder and `createMercadoPagoPreference`
- **Change (operational, not finished code):** build items from backend snapshots so their rounded ARS total equals the internal transaction amount, reject mismatches before the provider call, preserve attempt-level `external_reference`, expiry, back URLs, and deterministic idempotency.
- **Mirror this pattern:** `calculateLineTotal` and `assertSingleCurrency` behavior in checkout/cart services
- **Depends on:** T1
- **Acceptance:** tests cover integer and fractional catalog quantities, multiple lines, expected total mismatch, sandbox URLs, and idempotency shape.
- **Pitfalls:** Mercado Pago item quantity must not silently change the charged total through rounding.

### T4 — Characterize webhook/state decisions
- **Files:** `src/server/services/payments/mercadopago/mercadopago-reconciliation.decision.ts` `[NEW]`, `src/server/services/payments/mercadopago/mercadopago-reconciliation.decision.test.ts` `[NEW]`, `src/server/services/payments/mercadopago/mercadopago-reconciliation.service.ts`
- **Symbols / signatures:** provider-status mapping and internal status precedence
- **Change (operational, not finished code):** extract pure status decisions and test that approved evidence can recover a failed attempt while pending/rejected evidence cannot downgrade completed/refunded/charged-back history.
- **Mirror this pattern:** `webhook-signature.decision.ts`
- **Depends on:** none
- **Acceptance:** status mapping/precedence tests pass and reconciliation behavior is unchanged except where a test exposes an unsafe downgrade.
- **Pitfalls:** webhook bodies remain signals; only `Payment.get` results drive state.

### T5 — Upsert the sandbox provider configuration
- **Files:** Neon `payment_provider_config` row (external state)
- **Symbols / signatures:** provider `mercadopago`
- **Change (operational, not finished code):** enable sandbox mode with `https://coco-murex.vercel.app`, the three return routes, the webhook route, 60-minute expiry, and unsigned webhooks disabled.
- **Mirror this pattern:** `defaultMercadoPagoSettings` and `upsertMercadoPagoConfig`
- **Depends on:** T1–T4 and green local gates
- **Acceptance:** a read-back reports enabled sandbox mode, HTTPS URLs, and configured-secret diagnostics without exposing secret values.
- **Pitfalls:** settings JSON must never contain access tokens or webhook secrets.

### T6 — Create a Mercado Pago sandbox preference
- **Files:** no repository file; Mercado Pago test account external state
- **Symbols / signatures:** `Preference.create`
- **Change (operational, not finished code):** send a minimal non-monetary-production test preference through the real SDK using the agreed callbacks.
- **Mirror this pattern:** `createMercadoPagoPreference`
- **Depends on:** T5
- **Acceptance:** response has a preference id and `sandbox_init_point`; no real payment is submitted.
- **Pitfalls:** use the test seller only and redact provider identifiers from logs where unnecessary.

### T7 — Deploy a Vercel preview
- **Files:** repository source state
- **Symbols / signatures:** Vercel preview deployment
- **Change (operational, not finished code):** deploy the validated source as preview and report its URL; do not use `--prod`.
- **Mirror this pattern:** Vercel deployment skill
- **Depends on:** all local validation
- **Acceptance:** Vercel reports a successful preview URL.
- **Pitfalls:** the preview must receive required server env values; its generated hostname differs from the stable callback hostname.

## 9. Cross-cutting concerns
- **Data / schema / migration / backfill:** no schema change; current Neon schema contains the required tables/columns. The repository’s incomplete migration history is not expanded in this feature.
- **Config / env / feature flags:** canonical `MERCADOPAGO_*` names with server-only `MP_*` aliases; provider database row is the activation switch.
- **Security / permissions:** test credentials only, secrets server-side, signed webhooks required, admin configuration remains superadmin-only.
- **Observability (logs / metrics / tracing):** provider events and failures remain visible in `/admin/payments`; never log tokens.

## 10. Pitfalls & gotchas (global)
- A Vercel preview does not update `coco-murex.vercel.app`; stable callbacks will keep returning 404 until a production deployment is explicitly approved.
- Vercel environment variables are separate from local `.env`.
- `APP_ENV` resolves to production during a Vercel build even when the payment provider is in sandbox mode; therefore unsigned webhooks remain forbidden.
- Checkout redirect query parameters must never mutate payment state.
- Creating the internal order before a failed provider call can leave a retryable pending attempt; idempotency must keep retries safe.

## 11. Testing & validation
- **Tests to add/update:** `src/env.helpers.test.ts`; preference builder tests; reconciliation decision tests.
- **Commands:** `pnpm test`, `pnpm typecheck`, `pnpm check`, `pnpm build`.
- **Manual checks / regression risks:** sandbox redirect, test buyer purchase in incognito, success/pending/failure return, signed webhook simulator, one fulfillment transition.
- **Success criteria:** automated gates introduce no new failures; provider accepts a preference; config read-back is sandbox-only.

## 12. Rollout, migration & rollback

Activate the provider only after local validation. Roll back instantly by setting `payment_provider_config.enabled = false`; mock methods remain available. No schema rollback is required. A stable Vercel rollout, if later approved, should be followed by a signed webhook simulation before a full test purchase.

## 13. Documentation updates
- Add environment and sandbox callback instructions to `README.md` / `.env.example`.
- **CONTEXT.md:** none; `Checkout` and `Payment attempt` were already defined.
- **ADRs:** none; `docs/adr/0001-mercadopago-checkout-pro-reconciliation.md` already settles the architecture.

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| Stable deployment lacks the routes | callbacks return 404 | certain until deployment | high | preview first, then request explicit stable deployment |
| Vercel lacks secrets | preference creation/webhook verification fails | medium | high | configure server env in the linked project |
| Preference total drifts from internal total | customer is charged the wrong amount | medium with fractional quantities | critical | pure builder and pre-call equality assertion |
| Duplicate/concurrent webhook | fulfillment might advance twice | medium | high | transactional status precedence and unique domain-event keys |
| Wrong webhook secret | valid events are rejected | medium | high | use Mercado Pago simulator and inspect provider events |

## 15. Open questions
- **Blocking (resolve before stable deployment):** explicit approval to update `coco-murex.vercel.app`; recommended default is preview-only until the sandbox preference and webhook simulator pass.
- **Non-blocking (resolve during execution):** whether Vercel already has the two `MP_*` variables; default is to inspect diagnostics and report the exact missing configuration without revealing values.
- **Optional refinements:** add an asynchronous webhook worker after V1 validation.

## 16. Definition of done
- [x] Canonical and existing alias env names resolve only on the server.
- [x] Preference totals are proven equal to the internal payment attempt.
- [x] Signed webhooks fetch provider truth and preserve terminal-state precedence.
- [x] The Neon provider config is enabled in sandbox with the agreed HTTPS URLs.
- [x] Mercado Pago accepts a test preference and returns a sandbox checkout URL.
- [x] Tests, typecheck, lint baseline, and build are recorded.
- [ ] A Vercel preview URL is delivered; stable deployment is unchanged unless explicitly approved.

## 17. Instructions for the executing agent
- Use this plan as the primary source; read first: `CONTEXT.md`, ADR 0001, the upstream Mercado Pago plan, checkout service, preference service, webhook route, reconciliation service, and env configuration.
- Respect these settled decisions: Checkout Pro, sandbox/test seller only, signed webhook plus provider lookup, attempt-level external reference. Do not enable production payments.
- Verify before modifying: installed SDK types, database config/schema, and Vercel environment diagnostics.
- Execute phases in order; honor task dependencies.
- Implement at the level specified; do not re-architect payments. Stop before a stable production deployment unless the user explicitly approves it.
- Keep code self-explanatory. Use comments only for non-obvious security or money invariants, preserve useful JSDoc/TSDoc, and avoid unrelated cleanup.
