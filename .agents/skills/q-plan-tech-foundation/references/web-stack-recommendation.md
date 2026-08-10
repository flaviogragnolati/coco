# Recommended stack for suitable web applications

Use this advisory branch only for a greenfield web application that has no mandated stack and whose requirements do not call for a materially different runtime or architecture. This reference owns the package recommendation, not the project's final decision. The technical foundation becomes authoritative only after the user confirms its selections.

## Primary recommendation

Recommend T3 Core as the first candidate for a conventional full-stack web product where delivery speed, maintainability, end-to-end type safety, ecosystem maturity, and established engineering practices matter.

| Capability | Preferred candidate | Recommendation strength | Applicability |
|---|---|---|---|
| Language | TypeScript | preferred | Web client and server can share a typed ecosystem. |
| Web framework | Next.js App Router | preferred | The product benefits from an integrated React web runtime and its deployment model fits the NFRs. |
| Application API | tRPC | preferred | Primary consumers are TypeScript clients under coordinated ownership and a public language-neutral contract is not required. |

Treat this as T3 Core, not as a mandate to adopt every library commonly shipped by a T3 starter. Resolve versions from current official documentation and repository compatibility during the project run.

## Secondary recommendations

Evaluate each option independently. Record `selected`, `rejected`, `not_applicable`, or `existing_alternative` with rationale; do not install or require a library merely because it appears here.

| Capability | Candidate | Default posture | Applicability and guardrail |
|---|---|---|---|
| Runtime validation | Zod | preferred | Use when TypeScript boundaries need runtime validation and schema-derived types. Preserve an established equivalent when it already owns this role. |
| Client state | Zustand | optional | Use only for genuine cross-cutting client state that does not belong in component state, the URL, a form, or the server-data cache. Its absence is never a defect by itself. |
| UI components | shadcn/ui | preferred candidate | Use when the product needs a React UI, vendored component ownership, and the approach fits accessibility and design-system needs. Treat generated components as project source. |
| Forms | React Hook Form | conditional | Use for sufficiently complex client-side forms. Prefer simpler native, server-driven, or existing project patterns when they meet the requirement. |
| Relational data access | Drizzle or Prisma | choose one when an ORM is useful | Compare database support, query control, migrations, operational constraints, team familiarity, and existing code. Do not adopt both by default and do not force an ORM when direct database access is the better fit. |

Database, authentication, background work, messaging, observability, deployment, and test tooling remain requirements-driven choices even when T3 Core is selected.

## Route away from the default

Research alternatives when evidence points to a public or headless API with heterogeneous consumers, independently deployed distributed services, embedded or resource-constrained software, native mobile or desktop, hard real-time behavior, unusually strict latency or throughput goals, data or ML workloads, platform mandates, or a healthy existing stack whose migration cost exceeds the benefit.

For every route, compare against the same accepted requirements and NFRs. Present T3 only when it is a credible candidate, present the user's proposal fairly, and ask the user to confirm the final selection and material trade-offs.
