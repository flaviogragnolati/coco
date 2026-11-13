# QA-2026-11-13 execution evidence

Lifecycle: Working. This records deployment preparation and execution, not human acceptance or a delivery manifest. The originating execution record remains `docs/plans/qa-open-tickets-2026-11-orchestration.md` §13.

All actions below were executed by Codex unless explicitly labelled as a user decision. Secret values are excluded.

- **Approval:** in the resumed conversation Flavio explicitly authorized publishing `911bd55`, then saving/merging WP-D/F/E, applying their two additive migrations to the shared production database, publishing main and executing QA seed/triage with his account after joint checks.
- **Fixed code:** `e8937e6`, including merges `38f85c5`, `ad74aae`, `b68fa10` and public-copy/triage verification. Further metadata commits do not alter application behavior.
- **Checks:** typecheck passes; 2197 tests pass, 6 skip; Biome checks 933 source/config files without errors; 44 e2e pass without retries against the disposable local database. The subsequent triage-only change passes its 47 focused tests and formatting. Independent standards, specification and comments reviews pass, including merge resolutions.
- **Global formatting gap:** `check .` reports five pre-existing errors in unrelated `output/product-covers/2026-11-06/` files and the final newline of the user's modified `package.json`. Those files remain untouched.
- **Isolated reset:** 4/4 integration tests in the newly created local `coco_qa_resume_reset_test` database. No shared-data reset or demo seed was run.
- **Rollback drill:** old WP-B application code (`48230e9`) served `/` and `/products` with HTTP 200 against the new local additive schema on port 3001. This demonstrates application compatibility only. Disposition: **partial**; schema additions remain and paid-payment snapshot restoration was not tested or promised.
- **Migrations:** both candidate SQL files executed successfully against the shared database after approval and joint checks; `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` returned `No difference detected`. Existing pinned products were carried to the featured list by the combo migration; no real combo or discount configuration was invented.
- **Previous deploy:** real Vercel project confirmed `911bd55` successful at `2026-11-13T17:10:16Z`. A second connected project (`cocotdfs-projects`) failed independently; its result is not used as production evidence.
- **QA dry-run:** 72 configured transitions, 22 to apply, 50 already applied, zero conflicts; 15 assigned re-test tickets will be freed. Predicted final board: 57 Re-test, 40 Completo OK, 3 Bloqueado, 3 Omitido, 9 Papelera, zero Pendiente.

## Production outcome

- Deployment `2b992f0e2679e31b611e6e0ce73e86a2dae0ffaf` succeeded at `2026-11-13T17:24:55Z` in the real production project (`coco-qq1q93abq-flaviogragnolatigmailcoms-projects.vercel.app`).
- Public smoke on the production alias: `/`, `/products`, `/api/trpc/catalog.categories` and `/api/trpc/catalog.transferDiscount` all HTTP 200; home includes Categories, featured section and illustrative legend.
- QA seed updated 68 definitions, created zero and retired zero. Before/after fingerprints for status, notes, assignee, evidence and deletion matched for every ticket.
- QA triage applied 22 tickets without conflicts and freed 15 assignees. Read-only audit confirmed 22 new `qaTicket.update` events.
- Final board: 57 Re-test, 40 passed, 3 blocked, 3 skipped, 9 trash and zero pending. Read-only repeat dry-run: 72 already applied, zero to apply, zero conflicts.
- Human UAT remains pending. Blocked content belongs to Flavio/Quintal (#82, #91, #92); no human acceptance or financial end-to-end acceptance is inferred.

