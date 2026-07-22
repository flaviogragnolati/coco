# TypeScript / Next.js / tRPC / Prisma Checklist

Ecosystem-specific standards for the T3-style stack. Cite the **catalog ID** in findings (e.g. `TRPC-3`). Verify the installed versions in `package.json` first — some items change with major versions (React Server Components, tRPC v10 vs v11, Next Pages vs App Router, Prisma v6 vs v7). Flag against how the project *actually* works, not a generic mental model.

**This project:** Next.js 16 (App Router) · React 19 · tRPC v11 · **Prisma v7** with the `@prisma/adapter-pg` driver adapter over Postgres · Zod 4 · better-auth · TypeScript via **tsgo** (`pnpm typecheck`; not migrated to TS v7) · Biome (`pnpm check`) · vitest + Playwright.

## Contents
- [TS — TypeScript Rigor](#ts--typescript-rigor)
- [TRPC — tRPC Patterns](#trpc--trpc-patterns)
- [NEXT — Next.js App Router](#next--nextjs-app-router)
- [REACT — React Patterns](#react--react-patterns)
- [PRSM — Prisma & Database](#prsm--prisma--database)
- [VAL — Validation & Boundaries](#val--validation--boundaries)
- [STATE — Client/Server State](#state--clientserver-state)

---

## TS — TypeScript Rigor

- **TS-1 No `any` / unsafe casts** — no implicit or explicit `any` leaking through; no `as` casts that paper over a real mismatch; `as unknown as X` is a red flag. Third-party boundaries that force `any` are tightly scoped and commented.
- **TS-2 Strict null handling** — `strictNullChecks` respected; no non-null `!` assertions hiding a real nullable; optional chaining/guards used deliberately.
- **TS-3 Discriminated unions for states** — statuses, roles, modes, and result types modeled as literal unions/discriminated unions, not loose strings or booleans-that-should-be-enums.
- **TS-4 Exhaustiveness** — `switch`/branch over unions is exhaustive (a `never` default guard catches new cases at compile time).
- **TS-5 Inference over duplication** — types inferred from a single source of truth (Zod schema, DB schema, tRPC router) rather than hand-copied and drifting.
- **TS-6 Honest signatures** — function/return types reflect reality (no lying return types); no `@ts-ignore`/`@ts-expect-error` without justification.

## TRPC — tRPC Patterns

- **TRPC-1 Thin routers** — procedures orchestrate (access, validation, error mapping, calling services/DALs); business rules live in services/DALs, not dumped in the router.
- **TRPC-2 Input validation** — every procedure validates input with a Zod schema via `.input(...)`; no unvalidated `ctx`/raw input reaching logic.
- **TRPC-3 Output typing** — where the project uses `.output(...)`, it's preserved; return shapes are typed domain objects, not leaked raw ORM rows when the pattern says otherwise.
- **TRPC-4 Correct procedure/auth helper** — the procedure builder matches the required access level (public vs protected vs role/admin-scoped); no `publicProcedure` where auth is required; scope/tenant/protocol context applied.
- **TRPC-5 Error mapping** — expected failures use `TRPCError` with an appropriate code; internal errors not leaked; user-facing messages follow the project's language/tone rules.
- **TRPC-6 Post-mutation invalidation** — after a mutation, the client invalidates the relevant queries (via the project's `useUtils()`/query-client pattern); no stale UI. Granular invalidation preserved where the codebase uses it (not a blunt invalidate-everything).
- **TRPC-7 No over-fetching in procedures** — procedures don't fetch far more than the caller needs; batching/`useQueries` used appropriately.

## NEXT — Next.js App Router

*(If the project uses the Pages Router, translate these to `getServerSideProps`/`getStaticProps` equivalents.)*

- **NEXT-1 Server/Client boundary** — components are server components by default; `'use client'` is added only where interactivity/hooks/browser APIs require it, and pushed as far down the tree as possible (not slapped on a whole page).
- **NEXT-2 No server secrets in client** — server-only modules/env not imported into client components; `NEXT_PUBLIC_` used only for truly public values; data-access code stays server-side.
- **NEXT-3 Data fetching placement** — fetching happens in server components / route handlers / server actions as appropriate; no waterfall of client fetches for data that could be server-rendered.
- **NEXT-4 Caching & revalidation** — `fetch`/route cache and `revalidate` semantics understood and correct; `revalidatePath`/`revalidateTag` (or the router's cache invalidation) used after mutations that change rendered data; no accidental full-dynamic or over-cached pages.
- **NEXT-5 Route handlers & actions** — API route handlers / server actions validate input and enforce auth just like tRPC procedures; not a validation bypass.
- **NEXT-6 Metadata, loading & error files** — `loading.tsx`/`error.tsx`/`not-found.tsx` used where they improve UX; metadata handled via the framework, not ad hoc.
- **NEXT-7 Image/font/asset handling** — framework `next/image`, `next/font` used where appropriate instead of raw tags that hurt performance.

## REACT — React Patterns

- **REACT-1 Hook rules** — hooks called unconditionally at the top level; no hooks in conditions/loops; custom hooks compose correctly.
- **REACT-2 Effect discipline** — `useEffect` used for genuine side effects, not for derived state (compute during render) or data that belongs in a query; dependency arrays correct and complete; cleanup handled.
- **REACT-3 No duplicated/derived state** — state isn't duplicated from props or server data and left to drift; single source of truth.
- **REACT-4 Keys & lists** — stable, unique keys (not array index for dynamic lists); no key-induced remount bugs.
- **REACT-5 Memoization correctness** — `useMemo`/`useCallback`/`memo` used where they actually prevent expensive work or stabilize deps — not cargo-culted everywhere, and not missing where a heavy child needs a stable prop.
- **REACT-6 Controlled forms & inputs** — inputs controlled/uncontrolled consistently; form state managed through the project's form library, not ad hoc `useState` sprawl.
- **REACT-7 Component responsibility** — components stay focused; data orchestration separated from presentation; no 500-line components mixing fetching, business rules, and rendering.

## PRSM — Prisma & Database

- **PRSM-1 Schema/type/Zod sync** — `prisma/schema.prisma`, the generated client types (imported from `~/prisma/client`), Zod schemas, and shared constants/enums stay in sync; no hand-maintained parallel type that can drift. Types come from the generated client (`Prisma.XGetPayload<...>`, model types) rather than being re-declared by hand.
- **PRSM-2 Transactions** — multi-table writes and state transitions run inside `db.$transaction(...)`; the `Prisma.TransactionClient` is threaded through the `.data.ts` calls it covers (not a mix of `tx` and outer-`db` writes in one logical operation). Interactive transactions keep their work short — no external HTTP calls (Mercado Pago, email) inside the transaction boundary.
- **PRSM-3 Query efficiency** — relations loaded via `include`/`select` in a single query rather than per-row lookups (no N+1); `select` narrowed to the needed columns instead of over-fetching whole rows with deep `include` trees; unbounded queries paginated (`take`/`skip`/cursor).
- **PRSM-4 Parameterization** — queries go through the Prisma Client API; any `$queryRaw`/`$executeRaw` uses the tagged-template form (parameterized) and never `$queryRawUnsafe` with interpolated user input.
- **PRSM-5 Enum & constant sync** — `enum` blocks in the Prisma schema match TS literal unions and Zod enums; a new status added in one place is added in all.
- **PRSM-6 Data-access boundaries** — persistence stays in the `*.data.ts` layer returning typed domain shapes; `*.service.ts` orchestrates business rules; Prisma query objects don't leak into routers or components. The shared `db` singleton from `~/server/db` is used — no ad-hoc `new PrismaClient()`.
- **PRSM-7 Nullable normalization** — optional/nullable text and values normalized consistently before persistence, matching existing data-layer behavior; the difference between `null` (clear the column) and `undefined` (leave untouched) in `update` payloads is used deliberately, not accidentally.
- **PRSM-8 Decimal handling** — monetary and quantity columns typed as `Decimal` are manipulated via `Prisma.Decimal` arithmetic, never coerced through JS `number` (precision loss) or compared with `===`; values are serialized deliberately at the tRPC boundary (SuperJSON carries them — see `LIB-MISC-1`).
- **PRSM-9 Migration hygiene** — schema is the source of truth; migrations are generated (`pnpm db:migrate-dev`) and reviewed, not hand-drifted with `db push` against a shared environment; `prisma generate` runs in `build`/`postinstall` so the client can't go stale. (Report risks; don't run migrations unless asked.)

## VAL — Validation & Boundaries

- **VAL-1 Zod as boundary source of truth** — external input (API, forms, env, webhooks) parsed with Zod at the edge; validated types flow inward; `.parse` vs `.safeParse` chosen deliberately.
- **VAL-2 Env validation** — environment variables validated/typed at startup (e.g. a `t3-env`/Zod env module) rather than raw `process.env` access scattered around.
- **VAL-3 Schema reuse** — form, API input, and DB-facing schemas share/derive from a common Zod definition where appropriate instead of three drifting copies.
- **VAL-4 Trust boundaries** — no security/business decision made from client-provided data without server revalidation (ties to `DATA-4`).

## STATE — Client/Server State

- **STATE-1 Server vs client state separation** — server/remote data lives in the query cache (TanStack Query), not copied into global client state; ephemeral UI state stays local.
- **STATE-2 Store discipline** — global store (e.g. Zustand) holds genuine cross-cutting client state in focused slices; not a dumping ground for server data or one-component state.
- **STATE-3 Transient vs persisted** — draft/confirmation/wizard state kept local unless it must survive reloads; persisted business data written intentionally, not as a side effect of UI state.