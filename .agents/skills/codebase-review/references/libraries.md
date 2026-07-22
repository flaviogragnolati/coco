# Library-Specific Checklist

Idiomatic usage and known pitfalls for the concrete libraries a project depends on. **Review only libraries that appear in `package.json`.** Cite the **catalog ID** in findings (e.g. `LIB-QUERY-1`). If the project uses a library not listed here, apply the same discipline using that library's official documentation and cite it.

The goal of this lens: catch the subtle misuses that type-checks and generic review miss — the "it compiles and runs but fights the library's design" issues that cause bugs and rewrites later.

## Contents
- [LIB-QUERY — TanStack Query](#lib-query--tanstack-query)
- [LIB-ZOD — Zod](#lib-zod--zod)
- [LIB-PRISMA — Prisma Client](#lib-prisma--prisma-client)
- [LIB-UI — shadcn/ui + Radix + Tailwind](#lib-ui--shadcnui--radix--tailwind)
- [LIB-RHF — react-hook-form](#lib-rhf--react-hook-form)
- [LIB-ZUS — Zustand](#lib-zus--zustand)
- [LIB-AUTH — better-auth](#lib-auth--better-auth)
- [LIB-MP — Mercado Pago](#lib-mp--mercado-pago)
- [LIB-DATE — dayjs / date libraries](#lib-date--dayjs--date-libraries)
- [LIB-MISC — SuperJSON, vitest, Playwright, others](#lib-misc--superjson-vitest-playwright-others)
- [Libraries not listed here](#libraries-not-listed-here)

> **Not in this project (do not flag their absence):** BullMQ/Redis — there is no queue or background-job infrastructure yet; work that would need one is done inline or deferred by design. MUI — the UI layer is shadcn/ui + Radix + Tailwind. Drizzle — the ORM is Prisma.

---

## LIB-QUERY — TanStack Query

- **LIB-QUERY-1 Invalidation over manual mutation** — after mutations, invalidate/refetch affected queries rather than hand-editing the cache incorrectly; optimistic updates have rollback on error.
- **LIB-QUERY-2 Query keys** — keys are structured, stable, and include all inputs that affect the result; no key collisions; no missing input that causes stale reuse.
- **LIB-QUERY-3 Not for local state** — Query manages server state; ephemeral UI state isn't shoved into it.
- **LIB-QUERY-4 Config sanity** — `staleTime`/`gcTime`/`enabled` set intentionally; dependent queries gated with `enabled`; no fetch-on-every-render loops.
- **LIB-QUERY-5 Error/loading handling** — `isLoading`/`isError`/`error` surfaced to the UI; no assuming `data` is defined before it resolves.

## LIB-ZOD — Zod

- **LIB-ZOD-1 Parse at the edge, infer inward** — `z.infer` used for types instead of duplicating; parsed data (not raw) flows into logic.
- **LIB-ZOD-2 safeParse vs parse** — `safeParse` used where failure is expected/handled; `parse` only where a throw is the right behavior.
- **LIB-ZOD-3 Precise schemas** — constraints actually expressed (`.email()`, `.min()`, `.uuid()`, enums, `.refine()` for cross-field rules) rather than a loose `z.string()` that lets bad data through.
- **LIB-ZOD-4 Transforms & coercion** — `.transform()`/`.coerce` used deliberately and consistently; no silent double-coercion; output type matches downstream expectations.
- **LIB-ZOD-5 Schema reuse** — shared shapes composed (`.extend`, `.pick`, `.merge`) instead of copy-pasted divergent schemas.

## LIB-PRISMA — Prisma Client

*(Deep DB items are in `t3-stack.md` under `PRSM`; this section is for library-idiom specifics. Project is on **Prisma v7** with the `@prisma/adapter-pg` driver adapter.)*

- **LIB-PRISMA-1 Generated client import** — the client and its types come from the generated output (`~/prisma/client`), not from `@prisma/client` directly; the `generated/` directory is gitignored and rebuilt by `prisma generate`.
- **LIB-PRISMA-2 Singleton reuse** — the shared `db` from `~/server/db` is used everywhere; the dev-mode `globalThis` guard against hot-reload connection leaks is preserved. No per-request `new PrismaClient()`.
- **LIB-PRISMA-3 Relation loading** — `include`/`select` used to fetch relations in one query instead of awaiting inside a loop; nested `select` used to keep payloads narrow.
- **LIB-PRISMA-4 Raw query safety** — `$queryRaw` tagged templates only; `$queryRawUnsafe` avoided or tightly justified with no user input in the string.
- **LIB-PRISMA-5 Transaction client threading** — inside `db.$transaction(async (tx) => ...)`, `tx` (typed `Prisma.TransactionClient`) is threaded into every helper that writes, not the outer `db`; long-running or external work stays outside the transaction.
- **LIB-PRISMA-6 Decimal arithmetic** — `Prisma.Decimal` used for money/quantity math; no round-tripping through `Number` and no `===` comparison of Decimal instances (use `.equals()`/`.cmp()`).
- **LIB-PRISMA-7 Error handling** — known failures discriminated via `Prisma.PrismaClientKnownRequestError` codes (`P2002` unique, `P2025` not found, `P2003` FK) and mapped to the right `TRPCError`, rather than a blanket 500.
- **LIB-PRISMA-8 Driver adapter awareness** — v7 requires the adapter; connection-string/SSL config lives in the validated env module, not inline. Behavior differences from the old engine (e.g. connection pooling handled by `pg`) are respected.

## LIB-UI — shadcn/ui + Radix + Tailwind

*(Components are vendored into the repo via the shadcn CLI — they are project source, not a node_modules dependency, so they are fair game to review and to fix.)*

- **LIB-UI-1 Tokens over hardcoded values** — colors/spacing/radii come from the Tailwind theme tokens and CSS variables the shadcn theme defines (`bg-background`, `text-muted-foreground`, …), not hardcoded hex/pixel values or a parallel styling system.
- **LIB-UI-2 `cn()` for class composition** — conditional classes composed through the project's `cn()`/`tailwind-merge` helper so later utilities win predictably; no manual string concatenation that produces conflicting classes.
- **LIB-UI-3 Variants via CVA** — component variants declared with `class-variance-authority` and consumed through props, rather than ad-hoc conditional class soup at every call site.
- **LIB-UI-4 Radix primitives kept accessible** — Radix's built-in semantics and a11y (focus management, `aria-*`, keyboard nav, portal/dismiss behavior) are not undone by custom wrappers; icon-only controls have accessible labels; `Dialog`/`Popover`/`Select` use the primitive rather than a hand-rolled div.
- **LIB-UI-5 Correct primitive for the job** — `Dialog` vs `Sheet` vs `Popover` vs `Tooltip` chosen by interaction semantics, not visual similarity; destructive actions use a confirm/`AlertDialog` pattern.
- **LIB-UI-6 Controlled/uncontrolled consistency** — Radix inputs wired through react-hook-form's `Controller` consistently; no mixing a controlled `value` with an uncontrolled default.
- **LIB-UI-7 Large lists** — long tables/lists are paginated or virtualized rather than rendering thousands of rows; server-side filtering preferred over shipping the whole catalog to the client.

## LIB-RHF — react-hook-form

- **LIB-RHF-1 Uncontrolled by design** — leans on RHF registration/`Controller` rather than mirroring every field into `useState`.
- **LIB-RHF-2 Resolver validation** — validation via a schema resolver (e.g. `zodResolver`) tied to the same Zod schema used server-side, not a second hand-written rule set.
- **LIB-RHF-3 Typed forms** — form values typed (ideally inferred from the schema); `handleSubmit` receives typed data.
- **LIB-RHF-4 Submit state** — `isSubmitting`/`isValid` used to disable submit and prevent double-submit; server errors mapped back onto fields where useful.
- **LIB-RHF-5 Controller for custom inputs** — Radix/shadcn inputs (`Select`, `Combobox`, `Checkbox`, date pickers) wired via `Controller` or the project's shadcn `Form`/`Field` bindings, not fragile manual wiring.

## LIB-ZUS — Zustand

- **LIB-ZUS-1 Selector subscriptions** — components subscribe via selectors to the slice they need, not the whole store (avoids over-rendering).
- **LIB-ZUS-2 Focused slices** — store split into cohesive slices; not a monolith holding unrelated concerns or server data.
- **LIB-ZUS-3 No server state** — remote data stays in the query cache, not duplicated into the store.
- **LIB-ZUS-4 Immutable updates** — state updated immutably (or via the middleware the project uses); no direct mutation that breaks change detection.

## LIB-AUTH — better-auth

*(Auth is **better-auth**, not NextAuth/Auth.js. A stale `@auth/prisma-adapter` dependency may still be present in `package.json` — if nothing imports it, that's a legitimate dead-dependency finding, not a signal that the project uses Auth.js.)*

- **LIB-AUTH-1 Server-side session checks** — authorization decisions read the session on the server (tRPC context / server component), never from client-supplied state; `publicProcedure` isn't used where a session is required (ties to `TRPC-4`, `SEC-2`).
- **LIB-AUTH-2 Single source of config** — the server instance and the client instance are configured once and imported; plugin lists on both ends stay in sync (a client plugin without its server counterpart fails at runtime, not compile time).
- **LIB-AUTH-3 Secrets & env** — the auth secret, base URL, and provider credentials come from the validated env module (`~/env`), never inlined or read via bare `process.env`.
- **LIB-AUTH-4 Session freshness vs cost** — session lookups are cached/refreshed deliberately; no per-render refetch of the session in server components, and no stale role/permission data used for an authorization decision.
- **LIB-AUTH-5 Schema alignment** — the Prisma models backing better-auth match what the installed version and its enabled plugins expect; schema drift here surfaces as runtime auth failures.

## LIB-MP — Mercado Pago

*(Payments run through the official `mercadopago` Node SDK. A dedicated `mercadopago` skill exists in this repo — consult it for API specifics before flagging.)*

- **LIB-MP-1 Server-only credentials** — the access token is server-side only, from the validated env module; never bundled into client code or a public env var.
- **LIB-MP-2 Never trust client-reported payment state** — order/payment status is confirmed against the Mercado Pago API or a verified webhook, never from a redirect query param the browser controls.
- **LIB-MP-3 Webhook verification & idempotency** — webhook signatures are validated; handlers are idempotent and safe on redelivery (Mercado Pago retries), keyed on the payment/merchant-order ID so a duplicate notification can't double-apply an effect.
- **LIB-MP-4 External calls outside transactions** — SDK calls don't happen inside a `db.$transaction` boundary; reconcile by persisting intent first, then calling out, then recording the result (ties to `PRSM-2`).
- **LIB-MP-5 Money precision** — amounts derived from `Prisma.Decimal` values are converted to the SDK's expected numeric form at one explicit boundary, with rounding rules stated; no accumulated float drift.
- **LIB-MP-6 Failure surfacing** — SDK/network failures are mapped to a typed `TRPCError` and surfaced to the user in the project's language; a failed payment call never silently leaves an order in an ambiguous state.

## LIB-DATE — dayjs / date libraries

- **LIB-DATE-1 Normalize before use** — date-like values wrapped/normalized (e.g. `dayjs(...)`) before formatting, comparison, or arithmetic instead of assuming a native `Date`.
- **LIB-DATE-2 Timezone correctness** — TZ/UTC handled explicitly where it matters; no naive local-time assumptions on stored timestamps.
- **LIB-DATE-3 Consistent helpers** — the project's date utility used consistently, not a mix of raw `Date`, `dayjs`, and manual math.
- **LIB-DATE-4 Immutability** — no in-place mutation assumptions on immutable date objects; results reassigned.

## LIB-MISC — SuperJSON, vitest, Playwright, others

- **LIB-MISC-1 SuperJSON transformer** — the transformer is configured consistently on both ends so `Date`/`Map`/`Prisma.Decimal` values survive the tRPC boundary; no manual re-serialization fighting it.
- **LIB-MISC-2 vitest isolation** — tests mock external boundaries; no reliance on real network/DB unless it's an intentional integration test; shared setup used correctly. Config lives in `vitest.config.ts` (node environment, `src/**/*.test.ts`, `~/*` aliases resolved from `tsconfig.json` via `resolve.tsconfigPaths`); `e2e/` is excluded because Playwright owns it. Assertions use vitest's `expect` — flag stragglers still importing `node:test`/`node:assert`.
- **LIB-MISC-3 Playwright scope** — `e2e/*.spec.ts` cover real user flows against a booted dev server (`webServer` in `playwright.config.ts`); they don't duplicate logic already covered by fast unit tests. Selectors prefer roles/labels over brittle CSS chains; no fixed `waitForTimeout` sleeps where a web-first assertion would do.
- **LIB-MISC-4 Test-layer fit** — pure business logic is extracted and unit-tested (the project's established pattern: assemblers, diagnostics, filters tested with hand-built fixtures), rather than only reachable through an e2e run. A rule that could be a vitest test but is only covered by Playwright is a finding.
- **LIB-MISC-5 Utility libs (lodash, bluebird, etc.)** — no importing a heavy lib for a one-line native equivalent; no deep imports that bloat the bundle; tree-shaking-friendly imports. `bluebird` in particular is worth questioning where native promise APIs (`Promise.all`, `Promise.allSettled`) now suffice.

## Libraries not listed here

When the project depends on a library not covered above (e.g. a charting lib, an auth provider SDK, an email service, a payments SDK):

1. Note it under a new `LIB-<NAME>` heading in the report.
2. Review its usage against that library's **official documented** best practices and common pitfalls.
3. Cite the library's own docs in the finding's references.

Do not skip a heavily-used dependency just because it isn't pre-listed — the libraries doing the most work are exactly where idiomatic-usage bugs hide.