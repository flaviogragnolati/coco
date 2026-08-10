# Generic Software Engineering Standards Checklist

Stack-independent standards for software systems. Apply only sections supported by the product's capabilities: UI and accessibility items do not apply to a headless process, while persistence and distributed-operation items require those capabilities to exist. Each item has a stable **catalog ID** — cite it in findings (e.g. `SEC-2`). These are review prompts, not a form to fill: report only real, located issues.

## Contents
- [SEC — Security & Authorization](#sec--security--authorization)
- [DATA — Data Integrity & Correctness](#data--data-integrity--correctness)
- [ERR — Error Handling & Resilience](#err--error-handling--resilience)
- [PERF — Performance & Scalability](#perf--performance--scalability)
- [MAINT — Maintainability & Structure](#maint--maintainability--structure)
- [ARCH — Module Depth & Interface Design](#arch--module-depth--interface-design)
- [TEST — Testing & Verification](#test--testing--verification)
- [A11Y — Accessibility & UX States](#a11y--accessibility--ux-states)
- [OPS — Observability & Operations](#ops--observability--operations)
- [CONV — Consistency & Conventions](#conv--consistency--conventions)

---

## SEC — Security & Authorization

- **SEC-1 Authentication integrity** — sessions/tokens validated on every protected path; no trust in client-supplied identity; token expiry and refresh handled.
- **SEC-2 Authoritative authorization** — every mutation and sensitive read checks permission, ownership, and scope at the trusted execution boundary. UI visibility is an affordance, never the authority.
- **SEC-3 Input validation & sanitization** — all external input is validated at the boundary; no caller-supplied value is trusted for a security decision.
- **SEC-4 Injection** — database, template, expression, command, and path inputs use the platform's safe parameterization or encoding primitives; untrusted data never becomes executable code or raw markup.
- **SEC-5 Secrets & config** — no secrets in distributable clients, source, artifacts, or logs; secrets come from an approved configuration or secret store and stay within their trust boundary.
- **SEC-6 Sensitive data exposure** — PII/PHI minimized in responses, logs, and errors; no stack traces or DB errors surfaced to users; least-privilege on data returned.
- **SEC-7 Abuse resistance** — rate limiting/throttling on expensive or auth endpoints; CSRF protection where relevant; SSRF guards on server-side fetches of user-supplied URLs.
- **SEC-8 Dependency & supply chain** — no known-vulnerable dependencies; lockfile committed; no unvetted dynamic code loading.

## DATA — Data Integrity & Correctness

- **DATA-1 Atomicity** — multi-write operations that must succeed/fail together run in a transaction; no partial-write windows.
- **DATA-2 Concurrency & races** — check-then-write races guarded (unique constraints, optimistic locking, or transactional recompute); no lost updates on concurrent edits.
- **DATA-3 Idempotency** — retryable operations (webhooks, jobs, payment-like actions) are idempotent; no duplicate side effects on retry.
- **DATA-4 Trusted-boundary decisions** — critical derived decisions such as pricing, eligibility, scheduling, and permissions are recomputed or revalidated at the authoritative boundary, never trusted from an untrusted caller.
- **DATA-5 Deletion semantics** — soft-delete/status transitions preferred over hard deletes for records with history or references; cascades understood and intentional.
- **DATA-6 Auditability & traceability** — state-changing actions preserve who/when/why where the domain needs it; existing audit/history mechanisms extended rather than duplicated.
- **DATA-7 Migration safety** — schema changes are backward-compatible / staged; no destructive migration without a plan. (Report as risk even if you don't run migrations.)

## ERR — Error Handling & Resilience

- **ERR-1 No swallowed errors** — no empty `catch`, no `catch` that logs and continues into an invalid state; errors either handled meaningfully or propagated.
- **ERR-2 Structured, mapped errors** — expected failures use a structured error contract; internal failures map to safe caller-appropriate messages without leaking infrastructure, database, or stack detail.
- **ERR-3 External-call resilience** — timeouts, retries with backoff, and fallbacks on network/3rd-party calls; failures degrade gracefully.
- **ERR-4 User-facing failure states** — when a user interface exists, loading, empty, error, and relevant warning or success states are handled explicitly.
- **ERR-5 Failure containment** — top-level handlers and isolation boundaries prevent one failure from taking down unrelated work; unhandled asynchronous failures are addressed.

## PERF — Performance & Scalability

- **PERF-1 Query efficiency** — no N+1 query patterns; appropriate indexing assumptions; only needed columns/rows fetched; pagination on unbounded lists.
- **PERF-2 Payload & distribution size** — responses, binaries, bundles, and images stay appropriate to the product and delivery channel; optional heavy capabilities load only when needed.
- **PERF-3 Presentation work** — when a UI exists, avoid needless redraws or renders, unstable identity, expensive work on the interaction path, and layout churn.
- **PERF-4 Caching & invalidation** — caches used where valuable and invalidated correctly; no stale-data bugs; no over-broad refetching that kills performance.
- **PERF-5 Blocking & concurrency** — expensive synchronous work does not block latency-sensitive loops or threads; parallelizable I/O is not needlessly serialized.

## MAINT — Maintainability & Structure

- **MAINT-1 Separation of concerns / layering** — business logic stays out of presentation and transport glue; presentation, orchestration, domain behavior, and persistence have explicit ownership.
- **MAINT-2 Unit size & complexity** — functions, modules, and UI elements are focused; no god objects or oversized units; deeply nested or high-cyclomatic logic is simplified.
- **MAINT-3 Naming & clarity** — names reveal intent; consistent vocabulary across layers; no misleading names.
- **MAINT-4 DRY vs premature abstraction** — real duplication factored out; but no speculative/over-engineered abstraction for a single use. Local helpers stay local until reuse is real. An abstraction or port with a single real adapter behind it is the architectural case of this — see `ARCH-2`.
- **MAINT-5 Dead & commented-out code** — no unused exports, unreachable branches, or large commented-out blocks left behind.
- **MAINT-6 Type/contract clarity** — public interfaces are explicit and documented where non-obvious; an interface is everything a caller must know — invariants, ordering constraints, error modes, required configuration, performance characteristics — not just the type signature (see `ARCH-6`); magic numbers/strings named as constants.
- **MAINT-7 Comments & docs** — comments explain *why* not *what*; non-obvious decisions captured; docs/ADRs updated when behavior changes.

## ARCH — Module Depth & Interface Design

Architecture-level review through the deep-module lens: does each module hide real complexity behind a small, honest interface, placed at a seam that earns its keep?

**Vocabulary.** ARCH findings and deepening candidates use the architecture vocabulary exactly — **module, interface, implementation, depth (deep/shallow), seam, adapter, leverage, locality** — and avoid "component", "service", "API", "boundary" *within ARCH findings*. This glossary is defined in the **`q-code-grill-design` skill** (`GLOSSARY.md`): treat it as an **extension of the project's domain language in `CONTEXT.md`** — domain terms name the modules, while the glossary names the architecture. Outside this lens, keep the selected stack's literal terminology.

Working definitions: a module's **interface** is everything a caller must know to use it correctly — types, but also invariants, ordering constraints, error modes, required configuration, performance characteristics. A module is **deep** when a lot of behaviour sits behind a small interface, **shallow** when the interface is nearly as complex as the implementation. A **seam** is where an interface lives; an **adapter** is a concrete thing satisfying it there. Depth buys **leverage** for callers and **locality** for maintainers.

- **ARCH-1 Shallow modules & pass-throughs** — modules whose interface is nearly as complex as their implementation: thin wrappers, one-call delegators, layers that only rename. Apply the **deletion test**: if deleting the module makes the complexity vanish, it was a pass-through (finding); if the complexity would reappear across N callers, it is earning its keep (not a finding).
- **ARCH-2 Single-adapter seams** — a port/abstraction introduced "for testability" or "for the future" with only one real thing behind it. *One adapter means a hypothetical seam; two adapters (typically production + test) mean a real one.* Indirection without variation is cost with no leverage.
- **ARCH-3 Seam leakage** — implementation details escape through the interface: raw ORM row shapes handed to callers, transport/retry semantics the caller must know, internal call ordering the caller must respect. A caller that must understand a module's inside to use it correctly is not behind a seam.
- **ARCH-4 Testing past the interface** — tests that assert internal state, mock the module's own internals, or must change whenever the implementation changes. **The interface is the test surface**: tests describe behaviour through it and survive internal refactors. Extracting pure logic and unit-testing it is appropriate when the logic is genuinely independent; it becomes a finding when the extracted pieces are tested but the real wiring where bugs live is not, or when the extraction scatters one concept across callers (see `ARCH-5`).
- **ARCH-5 Lost locality** — knowledge of one concept spread across many callers: fixing a bug in the concept means touching N files; change never concentrates in one place. The inverse of depth — instead of one module absorbing the complexity, every caller re-implements a piece of it.
- **ARCH-6 Undocumented interface contract** — callers must know invariants, ordering, error modes, configuration, or performance characteristics that neither the types nor the docs state. The contract exists; it just isn't written anywhere a caller can find it (ties to `MAINT-6`).

### Writing fixes for ARCH and testability findings — dependency categories

The right fix shape depends on what the module depends on. Classify before proposing:

1. **In-process** (pure computation, in-memory state, no I/O) — merge the shallow modules and test directly through the new interface; no adapter needed.
2. **Local-substitutable** (a local test stand-in exists, such as an in-memory filesystem or isolated database) — test with the stand-in running in the suite; no port at the module's external interface.
3. **Remote but owned** (your own services across a network) — define a port at the seam: HTTP/queue adapter in production, in-memory adapter in tests.
4. **True external** (third-party services you don't control) — inject the dependency as a port; tests provide a mock adapter.

Do not propose a port unless at least two adapters are justified (`ARCH-2`).

### Confidence routing for ARCH observations

ARCH observations are often lower-confidence than the rest of this catalog. Only *verifiable* instances — an evident pass-through that fails the deletion test, tests demonstrably coupled to internals — enter the findings list with a normal Severity × Frequency score. Broader **deepening candidates** (restructures worth exploring, not defects you can point at) go to the report's *Themes & Systemic Observations* section as unscored opportunities — see the report template. Never present a speculative restructure as a scored finding.

## TEST — Testing & Verification

- **TEST-1 Coverage of what matters** — business rules, edge cases, validation, and error paths are tested; not just trivial getters.
- **TEST-2 Meaningful assertions** — tests assert real behavior, not tautologies; would actually fail if the code broke.
- **TEST-3 Isolation & determinism** — tests don't depend on order, real network, or wall-clock; flakiness addressed.
- **TEST-4 Static and consistency gates** — applicable type, static-analysis, lint, formatting, or compiler checks pass, or their gaps are known and tracked; CI enforces the selected signals.
- **TEST-5 Refactor-safe tests** — tests describe behaviour through the module's interface and survive internal refactors; a test that must change whenever the implementation changes is testing past the interface (see `ARCH-4`).

## A11Y — Accessibility & UX States

Apply this section only when the product exposes a user interface. Translate web-specific semantics to the platform's native accessibility model.

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
- **CONV-2 ADR/decision adherence** — code aligns with documented architecture decisions; contradictions are findings. This cuts both ways: if a **fix you recommend** would contradict an ADR, never propose it silently — mark it explicitly (e.g. *"contradicts ADR-0007 — worth reopening because …"*) or drop it.
- **CONV-3 Import & structure conventions** — path aliases, file placement, and naming match the project's established style.
- **CONV-4 No unrelated drift** — a change/feature doesn't smuggle in unrelated refactors that raise its risk and review cost.
