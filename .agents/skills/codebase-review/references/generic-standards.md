# Generic Web-App Standards Checklist

Universal standards that apply to any web application regardless of stack. Each item has a stable **catalog ID** — cite it in findings (e.g. `SEC-2`). These are review *prompts*, not a form to fill: use them to notice things, then report only real, located issues.

## Contents
- [SEC — Security & Authorization](#sec--security--authorization)
- [DATA — Data Integrity & Correctness](#data--data-integrity--correctness)
- [ERR — Error Handling & Resilience](#err--error-handling--resilience)
- [PERF — Performance & Scalability](#perf--performance--scalability)
- [MAINT — Maintainability & Structure](#maint--maintainability--structure)
- [TEST — Testing & Verification](#test--testing--verification)
- [A11Y — Accessibility & UX States](#a11y--accessibility--ux-states)
- [OPS — Observability & Operations](#ops--observability--operations)
- [CONV — Consistency & Conventions](#conv--consistency--conventions)

---

## SEC — Security & Authorization

- **SEC-1 Authentication integrity** — sessions/tokens validated on every protected path; no trust in client-supplied identity; token expiry and refresh handled.
- **SEC-2 Server-side authorization** — every mutation and sensitive read checks permission/ownership/scope on the server. Hidden UI buttons are not authorization. Enforce twice (UI for affordance, server for truth), never only in the UI.
- **SEC-3 Input validation & sanitization** — all external input validated at the boundary; never trust client-derived values for security decisions.
- **SEC-4 Injection** — parameterized queries (no string-built SQL); output encoding to prevent XSS; no `dangerouslySetInnerHTML`/`eval` on untrusted data; command/path injection avoided.
- **SEC-5 Secrets & config** — no secrets in client bundles, source, or logs; secrets from env/secret store; server-only env not leaked to the client.
- **SEC-6 Sensitive data exposure** — PII/PHI minimized in responses, logs, and errors; no stack traces or DB errors surfaced to users; least-privilege on data returned.
- **SEC-7 Abuse resistance** — rate limiting/throttling on expensive or auth endpoints; CSRF protection where relevant; SSRF guards on server-side fetches of user-supplied URLs.
- **SEC-8 Dependency & supply chain** — no known-vulnerable dependencies; lockfile committed; no unvetted dynamic code loading.

## DATA — Data Integrity & Correctness

- **DATA-1 Atomicity** — multi-write operations that must succeed/fail together run in a transaction; no partial-write windows.
- **DATA-2 Concurrency & races** — check-then-write races guarded (unique constraints, optimistic locking, or transactional recompute); no lost updates on concurrent edits.
- **DATA-3 Idempotency** — retryable operations (webhooks, jobs, payment-like actions) are idempotent; no duplicate side effects on retry.
- **DATA-4 Server-authoritative decisions** — critical derived decisions (pricing, eligibility, scheduling, permissions) are recomputed/revalidated server-side, never trusted from the client.
- **DATA-5 Deletion semantics** — soft-delete/status transitions preferred over hard deletes for records with history or references; cascades understood and intentional.
- **DATA-6 Auditability & traceability** — state-changing actions preserve who/when/why where the domain needs it; existing audit/history mechanisms extended rather than duplicated.
- **DATA-7 Migration safety** — schema changes are backward-compatible / staged; no destructive migration without a plan. (Report as risk even if you don't run migrations.)

## ERR — Error Handling & Resilience

- **ERR-1 No swallowed errors** — no empty `catch`, no `catch` that logs and continues into an invalid state; errors either handled meaningfully or propagated.
- **ERR-2 Typed, mapped errors** — expected failures use a structured error type; internal errors mapped to safe, user-appropriate messages; no raw infra/DB/stack detail to the UI.
- **ERR-3 External-call resilience** — timeouts, retries with backoff, and fallbacks on network/3rd-party calls; failures degrade gracefully.
- **ERR-4 UI failure states** — loading, empty, error, and (where relevant) warning/success states are all handled explicitly, not just the happy path.
- **ERR-5 Boundaries** — error boundaries / top-level handlers prevent a single failure from blanking the app; unhandled promise rejections addressed.

## PERF — Performance & Scalability

- **PERF-1 Query efficiency** — no N+1 query patterns; appropriate indexing assumptions; only needed columns/rows fetched; pagination on unbounded lists.
- **PERF-2 Payload & bundle** — response and bundle sizes reasonable; heavy deps code-split/lazy-loaded; no shipping server-only or huge libs to the client.
- **PERF-3 Rendering** — no needless re-renders (unstable props/keys, missing memoization where it matters); expensive work off the render path; no layout thrash.
- **PERF-4 Caching & invalidation** — caches used where valuable and invalidated correctly; no stale-data bugs; no over-broad refetching that kills performance.
- **PERF-5 Blocking & concurrency** — no blocking of the event loop / main thread with heavy sync work; parallelizable I/O not needlessly serialized.

## MAINT — Maintainability & Structure

- **MAINT-1 Separation of concerns / layering** — business logic in the right layer (not in components or bloating controllers/routers); presentation, orchestration, and persistence separated.
- **MAINT-2 Unit size & complexity** — functions and components are focused; no god-objects/behemoth components; deeply nested or high-cyclomatic logic refactored.
- **MAINT-3 Naming & clarity** — names reveal intent; consistent vocabulary across layers; no misleading names.
- **MAINT-4 DRY vs premature abstraction** — real duplication factored out; but no speculative/over-engineered abstraction for a single use. Local helpers stay local until reuse is real.
- **MAINT-5 Dead & commented-out code** — no unused exports, unreachable branches, or large commented-out blocks left behind.
- **MAINT-6 Type/contract clarity** — public interfaces are explicit and documented where non-obvious; magic numbers/strings named as constants.
- **MAINT-7 Comments & docs** — comments explain *why* not *what*; non-obvious decisions captured; docs/ADRs updated when behavior changes.

## TEST — Testing & Verification

- **TEST-1 Coverage of what matters** — business rules, edge cases, validation, and error paths are tested; not just trivial getters.
- **TEST-2 Meaningful assertions** — tests assert real behavior, not tautologies; would actually fail if the code broke.
- **TEST-3 Isolation & determinism** — tests don't depend on order, real network, or wall-clock; flakiness addressed.
- **TEST-4 Type & lint gates** — the project type-checks and lints cleanly (or gaps are known and tracked); CI enforces them.

## A11Y — Accessibility & UX States

- **A11Y-1 Semantics** — semantic HTML/roles; interactive elements are real buttons/links or have proper ARIA.
- **A11Y-2 Keyboard & focus** — everything operable by keyboard; focus managed in dialogs/menus; no focus traps.
- **A11Y-3 Labels & feedback** — form fields labelled; errors announced; images have alt text.
- **A11Y-4 Perceivable** — sufficient contrast; not relying on color alone; respects reduced-motion where relevant.
- **A11Y-5 i18n/copy** — user-facing copy follows the project's language/locale rules consistently.

## OPS — Observability & Operations

- **OPS-1 Logging** — meaningful, structured logs at the right level; no logging of secrets/PII; no noisy console logging left in production paths.
- **OPS-2 Monitoring hooks** — errors reported to monitoring where the project supports it; key operations observable.
- **OPS-3 Config & environments** — configuration via env, not hardcoded; environment differences handled; feature flags used where the pattern exists.
- **OPS-4 Deployment assumptions** — no assumption of a single process/instance when the deploy model is multi-instance; background work placed in the proper infrastructure.

## CONV — Consistency & Conventions

- **CONV-1 Follows repo patterns** — uses the nearest existing route/router/schema/DAL/test pattern instead of inventing a parallel one.
- **CONV-2 ADR/decision adherence** — code aligns with documented architecture decisions; contradictions are findings.
- **CONV-3 Import & structure conventions** — path aliases, file placement, and naming match the project's established style.
- **CONV-4 No unrelated drift** — a change/feature doesn't smuggle in unrelated refactors that raise its risk and review cost.