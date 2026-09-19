# Implementation Plan: QA Mercado Pago Pending Work

> **Lifecycle:** Working · **Owner skill:** q-code-implementation-plan · **Created:** 2026-09-19
> **Parent:** `docs/plans/qa-open-tickets-remediation.md` — this plan supersedes its Task 4.1 and the Mercado Pago ticket rewrites (#22, #25, #36) listed as pending in its §17 item 4.
> **Source tickets (`qa_ticket`):** #21, #22, #23, #24, #25, #26, #36, #37.

## 1. Objective & outcome

- **Done means:** the Mercado Pago tickets can be run cold by the tester against `https://coco-kappa-ashy.vercel.app`, each with concrete steps, data and expected output. `/admin/payments` makes clear which provider id a row shows and why "Reconciliar ahora" is disabled.
- **Why:** the 04/09 pass blocked or questioned all MP tickets. The environment is now ready: Vercel `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_WEBHOOK_SECRET`, the webhook registered in the MP panel, and `payment_provider_config` URLs on `coco-kappa-ashy` (2026-09-19). What remains is one UX gap (#36) and ticket text the tester could not act on.
- **For:** AI coding agent / developer.

## 2. Scope

- **In scope:**
  - Task 4.1 of the parent plan: the "Refs" column and the disabled-reconcile hint in `/admin/payments`.
  - Rewriting the text of #21–#26, #36 and #37 in `scripts/qa-tickets.data.ts`, mirrored in `docs/qa/qa-ciclo-de-vida.md`.
  - Extending the `mustMention` spot check.
  - Rolling out through `qa:seed`.
- **Non-goals:**
  - Changing webhook, reconciliation or signature behaviour.
  - Adding a UI to fire signed test webhooks.
  - Production credentials.
  - The seeded transactions that still use `provider: "mock"`.
- **Deferred:** a signed-webhook test harness for #23/#26 without a real sandbox payment.
- **Must not break:**
  - The webhook contract in `src/app/api/mercadopago/webhook/route.ts`: 401 plus a `rejected` event on a bad signature.
  - The server-side `providerPaymentId` requirement in `reconcileMercadoPagoAttempt`.
  - The `qa:seed` guarantee that `status`, `notes`, `assigneeId` and `evidence` are never touched.
  - The regression chain in `scripts/qa-tickets.data.test.ts`.

## 3. Current system context

- `src/app/admin/payments/_components/payments-admin-client.tsx` is the single client for the page:
  - `AttemptDetail` (179–341): shows "Preferencia" / "Pago" (`providerPreferenceId` / `providerPaymentId`, 239–251). "Reconciliar ahora" is `disabled={isReconciling || !attempt.providerPaymentId}` (284) and has no explanation.
  - `EventDetail` (343+): "Reprocesar" is enabled only for `providerResourceType === "payment"`. "Ignorar" is disabled while the reason is shorter than 5 characters.
  - The attempts table "Refs" column (956–964) shows `providerPaymentId ?? providerPreferenceId ?? "Sin ref."`, without saying which one it is.
  - The search placeholder is "Pedido, email, preferencia, pago o request id" (1074).
- `payment.mappers.ts` in the same folder holds the pure status helpers. New pure helpers go there.
- Webhook (`route.ts`):
  - It validates `x-signature` / `x-request-id` against `data.id` with `WebhookSignatureValidator`.
  - On failure it stores a `rejected` event with `signatureValid: false` and `lastError` from `resolveWebhookSignatureOutcome`. That message is `"Firma inválida: <reason>"` or `"Firma inválida."`, never "firma no válida".
  - It responds `401 {"error":"invalid signature"}`.
- Ticket text source:
  - `qaTicketSeedEntries` in `scripts/qa-tickets.data.ts`: #21 at ~255, #22 ~267, #23 ~279, #24 ~291, #25 ~303, #26 ~315, #36 ~434, #37 ~446.
  - The doc mirror in `docs/qa/qa-ciclo-de-vida.md`: rows at lines ~61–66, 86, 87.
  - `scripts/qa-tickets.data.test.ts` holds the `rewrittenDefinitions` spot check.
- Commands: `pnpm test`, `pnpm typecheck`, `pnpm exec biome check <files>`, `pnpm qa:seed`.

## 4. Approach

UI first, as one small, pure-helper-driven change with unit tests. Then the ticket text, with its spot-check test. Ticket text references the UI copy from Task 1, so the order matters. Roll out with `qa:seed` only after the UI change is deployed, per the parent plan's §5 rule: never advertise behaviour that is not live.

## 5. Assumptions

- **A1:** The tester gets the MP sandbox buyer and test cards (`MP_TEST_BUYER_*`, `MP_TEST_CARD_*` in the local `.env`) through a private channel. Ticket text names the variables' purpose, never their values.
- **A2:** In Argentina, MP sandbox decides a test card's result from the cardholder name: `APRO` approved, `OTHE` rejected, `CONT` pending. This comes from MP's public test-card docs and was not re-verified in this session, so the executor confirms it against the current MP docs before writing #23/#24.
- **A3:** Rejected-signature events are not linked to an attempt, because their `data.id` is arbitrary. They appear only in the Eventos tab.

## 6. File map

| File | Responsibility / change |
| --- | --- |
| `src/app/admin/payments/_components/payment.mappers.ts` | Add `formatAttemptRefs` and `reconcileUnavailableReason` |
| `src/app/admin/payments/_components/payment.mappers.test.ts` (new) | Unit tests for both helpers |
| `src/app/admin/payments/_components/payments-admin-client.tsx` | Use the helpers in the "Refs" column and `AttemptDetail`; relabel "Pago" |
| `scripts/qa-tickets.data.ts` | Rewrite #21–#26, #36, #37 |
| `docs/qa/qa-ciclo-de-vida.md` | Mirror rows 21–26, 36, 37 |
| `scripts/qa-tickets.data.test.ts` | Extend `rewrittenDefinitions` |
| `docs/plans/qa-open-tickets-remediation.md` | §17 item 4: point to this plan |

## 7. Phases and tasks

### Phase 1: `/admin/payments` clarity (#36)

**Task 1.1: pure helpers in `payment.mappers.ts`.**

```ts
type AttemptRefsInput = {
	provider: string;
	providerPaymentId: string | null;
	providerPreferenceId: string | null;
};

/** One labelled line per known id, payment first; empty when none. */
export function formatAttemptRefs(
	input: AttemptRefsInput,
): Array<{ label: "Pago" | "Preferencia"; value: string }>;

/** Why "Reconciliar ahora" cannot run, or null when it can. */
export function reconcileUnavailableReason(
	input: Pick<AttemptRefsInput, "providerPaymentId">,
): string | null;
```

- `reconcileUnavailableReason` returns exactly `"Sin id de pago de Mercado Pago: el comprador todavía no pagó esta preferencia. El id llega con el webhook del pago."` when `providerPaymentId` is null; otherwise it returns `null`.
- Tests in `payment.mappers.test.ts`:
  - both ids present → two entries, "Pago" first;
  - preference only → one "Preferencia" entry;
  - none → `[]`;
  - the reason is null or the exact string above.

**Task 1.2: wire the helpers into `payments-admin-client.tsx`.**
- "Refs" column (956–964): render each `formatAttemptRefs(item)` entry as `<span className="block break-all text-xs"><span className="text-muted-foreground">{label}:</span> {value}</span>`. An empty array renders `"Sin ref."`.
- `AttemptDetail` label at 247: change "Pago" to "Pago (id de Mercado Pago)".
- Under the "Reconciliar ahora" button group (283–297): compute `const unavailable = reconcileUnavailableReason(attempt)`. Keep `disabled={isReconciling || unavailable !== null}`. When `unavailable` is non-null, render `<p className="text-muted-foreground text-xs">{unavailable}</p>` below the buttons.
- Use visible text, not a tooltip: a disabled `<button>` fires no pointer events, so a tooltip on it never shows.
- Acceptance: #36. A pending MP attempt with no payment shows the reason and the button stays disabled. After a sandbox payment, "Pago" shows an id and "Reconciliar ahora" gives the toast "Intento reconciliado".

### Phase 2: ticket text (#21–#26, #36, #37)

**Task 2.1: rewrite the entries in `scripts/qa-tickets.data.ts`.**

Keep `code`, `section`, `title`, `actor`, `feature` and `isRegressionPath`, and change only `steps` and `expectedResult`. Use the base URL `https://coco-kappa-ashy.vercel.app` wherever an absolute URL is needed. Write in the existing voice (Spanish, numbered steps, UI strings in double quotes, routes in backticks).

- **#21 — precondition:** "Entorno QA ya configurado (Mercado Pago en Sandbox, URLs en `https://coco-kappa-ashy.vercel.app`). Tener a mano el usuario comprador de prueba de MP, que el responsable de QA pasa por privado."
  - Step 3: search the attempt in `/admin/payments` → "Intentos" by the order code shown in the checkout.
  - Keep the current expected result.
- **#22:** steps open the three absolute URLs directly, with the note "no hace falta pagar ni pasar por Mercado Pago".
  - Keep the current expected copy, which matches `mercadopago-return-page.tsx`.
- **#23:**
  - Precondition: continue from the #21 attempt; log in to Checkout Pro with the **test buyer** (never the seller); pay with the test card, cardholder name `APRO` (A2) and the document number from the test-card sheet.
  - Step 2: in `/admin/payments` → "Eventos", the event of type `payment` with Firma "válida" whose resource is the "Pago" id of the attempt.
  - Keep the expected result, and add that the attempt's "Pago" field now shows the id.
- **#24:**
  - Step 1: a new checkout with holder `OTHE` → rejected.
  - Step 2: another one with holder `CONT` → pending / `in_process`.
  - Step 3: check the attempt in `/admin/payments`, the order in `/my-orders` and the cart in `/cart` for each.
  - Keep the expected result.
- **#25:**
  - Step 1, exact command:

    ```
    curl -i -X POST 'https://coco-kappa-ashy.vercel.app/api/mercadopago/webhook?type=payment&data.id=123' -H 'Content-Type: application/json' -H 'x-request-id: qa-firma-invalida' -H 'x-signature: ts=1,v1=invalida' -d '{"type":"payment","action":"payment.updated","data":{"id":"123"}}'
    ```

  - Step 2: in the "Eventos" tab, search `qa-firma-invalida`.
  - Expected result: "HTTP/2 401 con cuerpo `{\"error\":\"invalid signature\"}`. El evento aparece con estado \"rejected\", Firma \"no válida\" y error que empieza con \"Firma inválida\". No aparece en ningún intento y no cambia ningún pago ni pedido."
  - This replaces the wrong "firma no válida" wording.
- **#26:**
  - Precondition: the order credited in #23.
  - Step 1: in "Eventos", open that `payment` event and click "Reprocesar" twice.
  - Step 2: check the attempt, and the order's `/my-orders/[id]` tracking.
  - Keep the expected result.
- **#36:**
  - Step 1: in "Intentos", open an MP attempt whose "Refs" shows "Pago: …" (for example, the #23 one) and click "Reconciliar ahora".
  - Step 2: open an MP attempt that shows only "Preferencia: …" (for example, a #21 checkout left unpaid).
  - Expected result: toast "Intento reconciliado" and the status matches MP. In the second case the button is disabled and shows the Task 1.1 reason text.
  - Add the clarification "`providerPaymentId` = campo \"Pago (id de Mercado Pago)\"".
- **#37:**
  - Precondition: at least one `payment` event (after #23) and the rejected event from #25.
  - Step 1: "Reprocesar" on the `payment` event.
  - Step 2: on the #25 event, type a 3-character reason → "Ignorar" stays disabled.
  - Step 3: type a reason of 5 or more characters → "Ignorar".
  - Expected result: toasts "Evento reprocesado" / "Evento ignorado"; the event shows as "ignored"; with fewer than 5 characters the button cannot be clicked.

**Task 2.2: mirror the changes in `docs/qa/qa-ciclo-de-vida.md`.** Update the "Flujo" and "Resultado esperado" cells of rows 21–26, 36 and 37 with the same text. Table cells are single-line, so write the numbered steps inline, as the other rows do. Do not touch the "Estado" and "Notas" columns.

**Task 2.3: extend the spot check in `scripts/qa-tickets.data.test.ts`.**
- Add or update these `rewrittenDefinitions` entries:
  - `{ code: 23, mustMention: ['"Eventos"', "APRO"] }`
  - `{ code: 24, mustMention: ["OTHE", "CONT"] }`
  - `{ code: 25, mustMention: ["curl", "x-signature", "qa-firma-invalida", "401"] }`
  - `{ code: 26, mustMention: ['"Reprocesar"'] }`
  - `{ code: 36, mustMention: ['"Reconciliar ahora"', "Pago (id de Mercado Pago)"] }`
  - `{ code: 37, mustMention: ['"Ignorar"', '"Reprocesar"'] }`
- Keep the existing entries for #21 and #22. Add `"coco-kappa-ashy"` to #22's list.

### Phase 3: rollout

**Task 3.1:** update the parent plan's §17 item 4 to read "Mercado Pago part moved to `docs/plans/qa-mercadopago-pending.md`".

**Task 3.2:** after Phase 1 is deployed:
- run `pnpm qa:seed`;
- the QA lead reopens #21–#26, #36 and #37 (sets them back to `pending`) in `/admin/qa-tickets`;
- the QA lead shares the test buyer and cards privately (A1).

## 8. Cross-cutting concerns

- **Secrets:** no credential values in ticket text, tests or the doc. #25 uses a deliberately invalid signature.
- **Data:** the #25 curl creates one `rejected` event row in the shared database, which is expected and harmless. #37 then ignores it.
- **Security:** the change is UI only; authorization is unchanged (`/admin/payments` requires admin, config requires superadmin).

## 9. Pitfalls

- A tooltip on a disabled button never shows; use visible text (Task 1.2).
- `qa:seed` rewrites text but not status: reopening tickets is a manual step in the admin.
- The doc table breaks if a cell contains a raw `|` or newline; escape or inline them. The curl command has no `|`.
- MP sandbox rejects a login with the seller account: the tester must use the buyer (#23).

## 10. Testing

- `pnpm exec vitest run src/app/admin/payments scripts/qa-tickets.data.test.ts`
- `pnpm typecheck`
- `pnpm exec biome check` on the changed files
- Manual: open `/admin/payments` locally or on a preview and check an attempt with no payment id (reason shown) and the Refs column labels.

## 11. Rollout and rollback

- Rollout: one PR (Phases 1 and 2), deploy, then Task 3.2.
- Rollback: revert the PR and run `qa:seed` again, which restores the previous text. Ticket statuses are unaffected.

## 12. Documentation

- `docs/qa/qa-ciclo-de-vida.md` (Task 2.2).
- The parent plan pointer (Task 3.1).
- No ADR or architecture doc changes.

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| The cardholder-name convention (A2) differs for this account or country | Executor verifies against MP's current test-card docs before writing #23/#24 |
| The webhook still fails on the deployed app (for example, a secret mismatch between Vercel and the MP panel) | #21/#23 surface it: an event with Firma "no válida" and a "Firma inválida: …" error means the secret differs, so fix the Vercel env and redeploy |
| Tickets rewritten before the deploy that carries Task 1 | Task 3.2 order |

## 14. Open questions

None blocking. Confirm A2 during Task 2.1.

## 15. Definition of done

- The helpers are tested and wired.
- Tickets #21–#26, #36 and #37 are rewritten in the seed data and the doc, and the spot check passes.
- Typecheck, lint and tests are green.
- The change is deployed, `qa:seed` has been run and the tickets are reopened.

## 16. Executor instructions

Run `q-code-implement` on this plan, Phase 1 then Phase 2, in a single PR. Do not paste any `.env` value anywhere. Record progress on the QA tickets in `/admin/qa-tickets`, not here.

## 17. Execution record (q-code-implement, 2026-09-19)

**Status:** Phases 1–2 and Task 3.1 are implemented and unit-verified, but **not yet released**. Task 3.2 is pending: deploy, then `qa:seed`, reopen the tickets and share the test data.

### Change summary

| Task | Result |
| --- | --- |
| 1.1 | `formatAttemptRefs` and `reconcileUnavailableReason` are in `payment.mappers.ts`, with the exact reason string, and tested in `payment.mappers.test.ts`. |
| 1.2 | The "Refs" column shows labelled "Pago: …" / "Preferencia: …" lines, or "Sin ref.". `AttemptDetail` now labels the field "Pago (id de Mercado Pago)". When reconciling is unavailable, the reason shows as visible text under the buttons and the button stays disabled. |
| 2.1 | #21–#26, #36 and #37 are rewritten in `scripts/qa-tickets.data.ts`. |
| 2.2 | Rows 21–26, 36 and 37 in `docs/qa/qa-ciclo-de-vida.md` are generated from the seed text with the steps inlined. The Estado and Notas columns are untouched. |
| 2.3 | `rewrittenDefinitions` covers #23–#26, #36 and #37, and #22 now also requires `coco-kappa-ashy`. |
| 3.1 | The parent plan's §17 item 4 now points here. |

### Deviations and decisions

- **`EventDetail` renders `lastError`**, which the plan did not list. Before this change, only events linked to an attempt showed it, and rejected events are never linked. Without it, #25's "Firma inválida" check and the §13 secret-mismatch diagnosis were invisible. An ignored event shows its reason as "Motivo: …" in muted text, not as an error.
- **`AttemptRefsInput` has no `provider` field**, because neither helper reads one.
- **#21 searches the attempt by the Cliente's email.** `confirmAndPay` redirects to Mercado Pago immediately, so the checkout never shows the order code.
- **A2 checked against MP's docs** ([test cards](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/cards), [test purchases](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases)):
  - `APRO` is approved, `OTHE` is rejected, `CONT` is pending.
  - The purchase uses the buyer test account.
  - The DNI is 12345678. The ticket falls back to the buyer profile's document if MP refuses it.
- **Every rewritten ticket opens with `Precondiciones:` and has multi-line expected results.** The spot check enforces this shape, and it applied to #24–#26, #36 and #37 as well.
- **#24's expected result is split per holder** (`OTHE` / `CONT`) instead of kept as it was.
- **Status names follow the screen the tester is on.** Admin chips show raw statuses ("pending", "completed", "failed", "inProcess"), and the customer sees "Aprobado" / "Rechazado" / "En proceso". #21 and #23 were aligned to this after review.
- **#25 wording:** it says "HTTP 401", which holds for any protocol curl negotiates, instead of "HTTP/2 401", and it names the UI text "Sin vincular".
- **#25 gets a new precondition:** the "Webhooks unsigned dev" switch must be off. Outside production that setting accepts the invalid signature.
- **#37 step 1 is pinned to the #23 event.** The #25 event is also of type `payment`, so "Reprocesar" would query payment 123.

### Evidence

- `pnpm typecheck` is clean.
- `pnpm test` passes: 67 files, 1107 tests.
- `biome check` is clean on the changed files.
- **Not run:** the manual `/admin/payments` check (§10). Admin login is Google OAuth only, and this session is non-interactive. `qa:seed` and the sandbox runs also wait for Task 3.2.

### Mini review

- **`q-review-code`, standards axis: pass with findings.** Applied:
  - #21/#23 status labels;
  - #37 event ambiguity;
  - #25 unsigned-webhook precondition;
  - ignored-reason styling;
  - `AttemptRef` type.

  Kept on purpose: the spot check pins `coco-kappa-ashy`, because that is the fixed QA URL.
- **`q-review-code`, specification axis: pass with findings.** Deviations were declared and judged justified. The undeclared #24 and #25 wording changes are now recorded above.
- **`q-review-comments`: pass with findings.** One rewrite, on the `rewrittenDefinitions` JSDoc, was applied.

### Follow-ups / required actions

1. Deploy this change. Then run `pnpm qa:seed`, and the QA lead reopens #21–#26, #36 and #37 in `/admin/qa-tickets`.
2. Before #25, confirm "Webhooks unsigned dev" is off on `coco-kappa-ashy`.
3. Share the MP test buyer and cards with the tester privately (A1).
