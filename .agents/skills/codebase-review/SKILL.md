---
name: codebase-review
description: "Standards-and-quality review of a web-app codebase, module, or feature, producing a Markdown audit report. Use when the user wants a written quality assessment — 'review', 'audit', 'assess', 'check the quality of', 'find issues in', 'evaluate', 'how healthy is', or 'what's wrong with' a codebase/module/feature/service/router — and wants ranked findings, not an inline patch. Covers generic web-app best practices (security, data integrity, errors, performance, maintainability, testing, a11y), the TypeScript/Next.js/tRPC/Prisma stack, and the project's libraries. Findings are ranked by risk (severity × frequency) and tagged by strength (antipattern/critical/strong/preferable/optional/commendation), each citing file:line, the standard, why it matters, a fix, and references. Trigger even without the word 'review'. Do NOT use for: a GitHub PR diff or pending-branch changes (use PR-review/security-review); fixing, refactoring, or building code in place; planning a new feature; or just explaining/summarizing code."
---

# Codebase Review

Produce a rigorous, evidence-based standards review of a target codebase, module, or feature, and write it up as a Markdown audit report. The value of this skill is not opinions — it is *specific, located, justified* findings that an engineer can act on, prioritized so they fix the right things first.

## What makes a review good

A weak review lists generic advice ("add more tests", "improve error handling"). A strong review points at an exact line, names the standard it violates, explains the concrete failure mode *in this codebase*, proposes a fix that fits the surrounding patterns, and links to authority (a repo ADR, a doc, or an external reference). Every finding must be falsifiable: a reader can open the file and see the thing.

Two commitments keep the review honest:

- **Ground findings in the real code.** Read the actual files. Where the environment allows, run the project's own tooling (type-check, lint, tests) so findings rest on real signals, not guesses. Prefer "this `tsc` error on line 42" over "there might be type issues".
- **No false positives.** A review that cries wolf gets ignored. If you are not confident something is a real problem, either verify it or leave it out. It is better to report five solid findings than twenty speculative ones.

## Workflow

### 1. Establish scope

Determine and state explicitly what is being reviewed — the review is only as good as its boundaries.

- **Codebase**: the whole repo (or a large slice). Sample breadth; you cannot read everything, so prioritize entry points, shared infrastructure, and the highest-traffic domains.
- **Module**: a bounded area (a router tree, a DAL group, a route folder, a service).
- **Feature**: a vertical slice — usually UI + router + schema + DAL + tests for one capability.

**When the scope or depth is fuzzy, align with the user before diving in — don't guess.** A review aimed at the wrong boundary, or pitched at the wrong depth, wastes the entire effort and produces a report the user didn't want. So if any of these is genuinely unclear, ask a short, concrete question first and wait for the answer:

- **Boundary** — the target names a vague area rather than concrete files ("review the OR stuff", "look at the billing code", "is the backend okay?"). Propose the specific folders/files you'd cover and ask the user to confirm or narrow, rather than silently picking a boundary.
- **Depth** — it's unclear whether they want a fast high-level triage (top risks only) or an exhaustive line-by-line audit; whether tooling (type-check/lint/tests) should be run; and whether the whole scope is in play or just one concern (e.g. "only security", "only the data layer").
- **For a whole codebase especially**, "review the codebase" is almost always underspecified — confirm whether they want a broad health scan hitting entry points and the riskiest domains, or a deep review of a particular area, since you can't read everything with equal care.

Keep the question tight and offer sensible defaults (e.g. "I'll cover `src/server/api/routers/or` and `src/app/app/or` at a standard depth, running type-checks — sound right, or do you want it narrower/deeper?"). When the ambiguity is minor and a reasonable default clearly fits, it's fine to proceed on a stated assumption instead of blocking — but make that assumption explicit in the report's Scope section. Either way, once resolved, record the exact file/folder list and the chosen depth in the Scope section so the boundaries are unambiguous in the final report.

### 2. Profile the project

Before reviewing, understand what you're reviewing against:

- Read `package.json` to learn the framework versions and the **actual dependencies** — this drives the library lens (step 4c). A review that flags a pattern the installed version made obsolete is noise.
- Skim `README`, `CONTEXT.md`, `docs/`, and any `docs/architecture/` or ADR files. Repo conventions and ADRs are first-class standards: code that contradicts a documented decision is a real finding, and code that follows one should not be flagged as if the convention didn't exist.
- Identify the layering (e.g. UI → tRPC router → Zod schema → DAL/service → ORM → DB) so you can judge whether responsibilities sit in the right place.

### 3. Gather signals from tooling

Where the environment permits and the commands are known, run the project's own checks and fold the results into findings. Use the project's actual scripts (check `package.json` scripts) rather than assuming. Typical signals:

- **Type-check** — `pnpm typecheck` (tsgo, the TypeScript-native preview compiler; this project has **not** migrated to TS v7 and deliberately stays on tsgo). Type holes, unsafe casts, missing null handling.
- **Lint & format** — `pnpm check` (**Biome**, not ESLint/Prettier); `pnpm check:write` applies safe fixes. Treat lint noise proportionally; a thousand formatting warnings is one finding ("lint not enforced"), not a thousand.
- **Unit tests** — `pnpm test` (**vitest**, `src/**/*.test.ts`). Failing or absent coverage on business rules.
- **E2E tests** — `pnpm test:e2e` (**Playwright**, headless Chromium, specs in `e2e/`). Slower; run only when the review touches user-facing flows.
- **Build** if quick and relevant (`pnpm build` — note it runs `prisma generate` first).

If tooling can't run (no install, read-only sandbox, unknown commands), say so in the report's Methodology section and rely on static reading. Don't fabricate command output. Respect project conventions — if the repo says "don't run lint by default", note lint gaps from reading instead of forcing a run.

### 4. Review across the three lenses

Read the code against each lens. The detailed checklists live in reference files — load the one you need rather than reviewing from memory, so you catch the non-obvious items:

- **4a. Generic web-app lens** — see `references/generic-standards.md`. Security & authz, data integrity & correctness, error handling & resilience, performance & scalability, maintainability & structure, testing, accessibility & UX states, observability & ops, consistency with conventions/ADRs.
- **4b. TS / Next / tRPC / Prisma lens** — see `references/t3-stack.md`. TypeScript rigor, tRPC router/procedure/validation patterns, Next.js App Router server/client boundaries and caching, React hooks/effects/rendering, Prisma schema-type-Zod sync and transactions, boundary validation, client/server state separation.
- **4c. Library lens** — see `references/libraries.md`. Idiomatic usage and known pitfalls for the specific libraries in `package.json` (TanStack Query, Zod, Prisma, shadcn/Radix + Tailwind, react-hook-form, Zustand, better-auth, Mercado Pago, dayjs, SuperJSON, Vitest/Playwright, etc.). Only review libraries the project actually uses; if it depends on a library not covered in the reference, apply the same rigor using your knowledge of that library's documented best practices and cite its docs.

As you go, keep a running list of candidate findings with enough context (file, line, snippet, the standard, why) to score and write up later. Note things done *well* too — a few commendations make the review trustworthy and tell the team what to preserve.

### 5. Score and tag every finding

Apply both axes to each finding (definitions below). Compute the risk score, assign the recommendation tag. This is what lets the report be sorted by risk and grouped by recommendation.

### 6. Write the report

Use the structure in `assets/report-template.md`. Save it as a Markdown file (default name `code-review-<scope>-<date>.md`) in the user's working folder. Then present it.

## The two axes

Every finding carries **both** a risk score and a recommendation tag. They are independent: risk answers "how much does this hurt?", the tag answers "how strongly, and what kind of action?". A once-off antipattern is low risk but still an antipattern; a pervasive-but-minor issue can out-rank a rare-but-nasty one on frequency alone.

### Axis 1 — Risk = Severity × Frequency

**Severity** (impact if the issue is triggered):

- **S4 Catastrophic** — data loss/corruption, security breach, auth bypass, wrong operational/medical data reaching a user.
- **S3 Major** — a broken or silently-incorrect feature, meaningful data inconsistency.
- **S2 Moderate** — degraded UX, real maintainability debt that will slow the team.
- **S1 Minor** — cosmetic, stylistic, or nit.

**Frequency** (how widespread the pattern is / how likely it is hit):

- **F4 Pervasive** — throughout the reviewed scope.
- **F3 Common** — recurs in several places.
- **F2 Occasional** — a handful of spots.
- **F1 Isolated** — a single occurrence.

**Risk score = Severity × Frequency (1–16)**, mapped to bands:

- **🔴 Critical** — 12–16
- **🟠 High** — 8–11
- **🟡 Medium** — 4–7
- **🟢 Low** — 1–3

Always show the arithmetic in the finding, e.g. `Risk: High (8) — S4 × F2`. It makes the ranking auditable and lets the reader disagree with your inputs rather than your conclusion.

**Never fudge the band.** The risk score is a pure function of Severity × Frequency — do not bump a finding into a higher band because it "feels" urgent, and do not write hybrid cells like `Medium → Critical` in the table. A tidy, honest number is more useful than a massaged one. The score is deliberately mechanical so the reader trusts it.

**The exploitability / urgency note — the escape hatch for rare-but-catastrophic issues.** Frequency-based scoring under-ranks the classic case of a *single, directly exploitable* defect: a lone SQL-injection line or one place that trusts client-supplied money is `S4 × F1 = 4` (Medium band by the formula), yet it obviously must be fixed before shipping. Do not distort the number to fix this. Instead:

- Keep the honest computed band (e.g. `🟡 Medium (4) — S4 × F1`).
- Add a one-line **Urgency note** explaining why real-world urgency exceeds the raw score — typically "directly exploitable by an untrusted caller" or "a single occurrence is still a breach / still corrupts money".
- Set the **recommendation tag to 🔴 Must-fix** (or ⛔ Antipattern), which is where urgency actually lives.
- Mark the finding with a **⚡ Exploitable** flag in the overview table so it's visible at a glance, and in the "Suggested Remediation Order" put it in the first batch regardless of its numeric band.

This keeps two clean signals rather than one muddy one: the risk *number* answers "how much aggregate damage across the codebase", and the ⚡/Must-fix pairing answers "how urgently must this specific instance be fixed". A reviewer scanning the table sees both and is never misled by a low number next to a security hole.

### Axis 2 — Recommendation strength

The directive tag. Pick the one that best captures the *kind* of action advised:

- **⛔ Antipattern** — a recognized bad pattern; replace it with the established alternative.
- **🔴 Critical / Must-fix** — correctness, security, or data-integrity risk; fix before shipping.
- **🟠 Strong** — a clear best-practice violation; fix soon.
- **🟡 Preferable** — a better approach exists; worth adopting.
- **🔵 Optional / Nit** — minor polish; discretionary.
- **🟢 Commendation** — done well; called out to reinforce and preserve. Keep these sparse and specific.

## Citations — every finding must be traceable

A finding without a location is an opinion. Each one includes:

1. **Where** — `path/to/file.ts:line` (a range or function name when a single line undersells it). Quote the offending snippet when short.
2. **Which standard** — the catalog ID and name it violates (e.g. `SEC-2 Server-side authorization`, `TRPC-3 Output validation`, `LIB-QUERY-1 Cache invalidation`).
3. **Why it matters** — the concrete failure mode *in this code*, not a textbook restatement.
4. **Fix** — a specific change that fits the surrounding patterns; a short code sketch when it clarifies.
5. **References** — at least one authority: a repo ADR/doc/CONTEXT.md, and/or an external source (official docs for the framework/library, OWASP, web.dev, MDN). Link precisely; prefer the exact page over a homepage.

## Report principles

- **Lead with the triage.** The report opens with an executive summary and a risk-sorted table so a busy reader gets the top issues in ten seconds, then drills down.
- **Sort the detail by risk, group by area.** Within the detailed findings, order by risk score descending; secondary-group by lens/area so related issues sit together.
- **Be proportional.** Don't pad. If the module is small and clean, a short report with three findings and two commendations is the correct output — inventing issues to look thorough is a failure mode.
- **Write for the engineer who owns the code.** Assume competence; explain the *why* so they can generalize the fix, not just patch the one line.

Keep the SKILL.md guidance in mind, but the checklists in `references/` are where the reviewing rigor lives — consult them during step 4 rather than working from memory.