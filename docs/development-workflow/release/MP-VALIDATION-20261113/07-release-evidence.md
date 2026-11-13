# Mercado Pago validation deployment evidence

Lifecycle: Working. Release execution evidence; no integration acceptance or delivery close is claimed. All actions are agent-executed unless attributed to the user.

- Approval: Flavio explicitly requested deployment of the reviewed change to the previously named coco-kappa-ashy target.
- Authentication: initial Vercel account lacked the project; Flavio completed a separate device authorization for the owning account. Existing CLI credentials were retained.
- Source: exact base commit and runtime/build-file SHA256 are in the candidate and source manifest. A direct CLI source deployment avoids unauthorized Git effects. Local secrets, .aws, agent configurations, output and .env files are excluded.
- Local gates: final source passed 2,260 tests (6 existing skips), TypeScript, Biome and the production build. An additional mixed-provider regression reproduced the dashboard error before the fix and passes after it.
- Environment: existing project coco under flaviogragnolatigmailcoms-projects; server credential names verified present through Vercel env metadata. Credential values were not printed or modified.
- Rollback: exact previous deployment recorded in candidate. No migration; rollback was not exercised and would require separate authorization.
- Initial deployment: `dpl_B7hcF9pLoqrR9jUAJxbd8FfZsPgJ` reached READY and the target alias. Its source metadata matched the first snapshot. All return pages returned 200 with the expected title/notice; both admin entry routes redirected anonymous requests to `/login`; deliberately invalid POST returned 401 and a rejected, unlinked event was correlated in the shared database, with zero MP attempts before/after. Provider remained sandbox with binary=false and unsigned=false.
- Final admin-fix deployment: `dpl_3sQWEGdwXwDYHkf3dwHskEY5esET` reached READY. Vercel API confirmed project `prj_VW5NrkjpGuOXDnrF2At6ZTz6ZAQB`, both production aliases including `coco-kappa-ashy.vercel.app`, and source SHA256 `92e93cbd505e0bdf6d812a112a0cbac1ffd2a2ee6f0fc036896ae922af7fdf89`. Final smoke is recorded below.
- Authenticated sandbox UAT: pending. Isolated checks do not constitute human acceptance or a real provider purchase.


## Isolated admin and operations validation

Browser tests used an additional empty database, `coco_mp_validation_20261113`, on the existing local PostgreSQL container. The app was served only on localhost:3012. Demo data and disposable authenticated sessions were created only there; no shared financial state was synthesized and no provider payment API was called. This is automated implementation evidence, not target-environment UAT or human acceptance.

All 11 final browser checks pass in `07-admin-validation.json`. Six selected screenshots contain only fictitious local data and are supporting rendered evidence under `screenshots/`:

- Payment tabs, populated attempt detail and minimum input guards.
- Customer receipt declaration leaves the attempt/order pending and the cart at checkout, with no submission.
- Admin settlement yields completed attempt, processing order and submitted cart; audit written once and settle/reject controls disappear.
- Rejection yields a failed attempt/order while items remain unsubmitted.
- MP reconciliation remains disabled with its explanation when no payment id exists (MP is a local fixture; no provider claim).
- Invalid event ignore requires a sufficient reason and persists ignored status.
- Admin configuration mutation is forbidden; superadmin must type CONFIRMAR and can save without changing the settings.
- External configuration saves independently and retains the discount.
- An operation includes the paid transfer and excludes rejected/pending attempts; below supplier MOQ it creates a rollover.
- Global dashboard values match real mixed-provider database counts.
- A second paid transfer meeting MOQ creates a completed operation, one lot, one supplier order and allocation of all 50 requested units. There is exactly one submission fact for that order.

Two defects were corrected within the requested admin verification: global statistics retained a Mercado Pago-only filter despite listing transfers, and blank configuration confirmation exposed technical validation output. The statistics now include all providers; the client confirmation guard uses the existing message and leaves server authorization/validation intact. The incremental independent code review passes both standards and specification axes. The incremental comments review passes with no added/changed comments.

Harness limitations and corrections: the pre-existing fulfillment script passed 12 of 13 steps, but its draft window (June 10–15) no longer matches the seeded draft demand (July 22–28). This stale harness failure is not presented as a passing test and was not changed in production source. The isolated browser checks directly exercised the draft/review/execute boundaries using current test payments. Initial disposable browser assertions were corrected for table text, the external-config toast, and destination-loading/date-window timing; only the final assertions and database-verified outcomes are marked passed.

Remaining acceptance requires a real sandbox buyer purchase and signed provider delivery, rejected/pending scenarios, replay/reconciliation and the authenticated target admin regression. Concurrency and overlapping external payments remain unverified; the sequential isolated checks do not settle compensation policy.


## Final deployed smoke

The final alias was inspected after READY and resolves to `dpl_3sQWEGdwXwDYHkf3dwHskEY5esET`. At the timestamp in `07-public-smoke.json`, all three public return routes returned HTTP 200 with the expected informational content; anonymous admin payments/operations requests returned 307 to `/login`. A deliberately invalid payment webhook returned 401 and a rejected, unlinked event in the configured database. Mercado Pago attempt count remained zero. Configuration remains enabled sandbox, binary=false and unsigned=false. The operational event/request identifiers are retained in QA #25 rather than this release record.

Deployment is complete. Full sandbox integration and human acceptance remain pending; no delivery manifest or acceptance verdict is authored here. No rollback, migration, seed or reset was executed against the shared environment. Local fixtures and their seed were confined to the isolated database.


## Deployed return-page browser check

On the final deployment, Chromium verified all three return pages: HTTP200, expected title and badge, reconciliation notice, both navigation links, and zero non-GET/HEAD requests during each page load. Evidence is `07-public-return-validation.json` and the three `screenshots/deployed-return-*.png` images. This completes the technical execution of QA #22; it does not confirm a provider payment.
