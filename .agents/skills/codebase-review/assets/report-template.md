# Code Review Report — {SCOPE_NAME}

> **Scope type:** {Codebase | Module | Feature}
> **Reviewed:** {date}  ·  **Reviewer:** Codebase Review skill
> **Target:** {repo / branch / commit if known}

Fill this template from the review. Keep the section order. Delete a section only if it is genuinely empty (and say so — e.g. "No security findings"). Every finding uses the finding block format below.

---

## 1. Executive Summary

Three to six sentences a lead can read in under a minute: what was reviewed, the overall health, and the single most important thing to do next. State the headline counts: `N Critical · N High · N Medium · N Low`, plus how many commendations. If there is one thing that must be fixed before shipping, say it here in one line.

## 2. Scope & Methodology

- **What was reviewed** — the exact files/folders/modules (list them). Note what was explicitly *out* of scope.
- **How** — lenses applied (generic / T3 / library), which reference checklists were used.
- **Tooling signals** — commands actually run and their results (e.g. `pnpm typecheck` → 3 errors; `pnpm check` → 12 diagnostics; `pnpm test` → 2 failing). If tooling couldn't be run, say so and note the review is static-only.
- **Limitations** — sampling (for large codebases), anything not verifiable, assumptions made.

## 3. Risk-Ranked Findings (Overview)

The triage table — sorted by **Risk score descending**. This is the "read this first" section. The **⚡** column flags findings whose real-world urgency exceeds their computed risk band (directly exploitable, or a single occurrence that is still a breach / still corrupts money) — see the Urgency note in the finding detail. Keep the Risk cell as the honest computed band; never write hybrid values like `Medium → Critical`.

| # | Finding | Area (ID) | Location | Severity | Freq | Risk | ⚡ | Recommendation |
|---|---------|-----------|----------|----------|------|------|----|----------------|
| 1 | {short title} | {e.g. SEC-2} | `file.ts:42` | S4 | F4 | 🔴 Critical (16) |  | 🔴 Must-fix |
| 2 | {short title} | {e.g. SEC-4} | `router.ts:83` | S4 | F1 | 🟡 Medium (4) | ⚡ | 🔴 Must-fix |
| … | | | | | | | | |

## 4. Findings by Recommendation Category

Group the same findings by their recommendation tag so the reader can scan "what must I fix" vs "what's nice to have". List each finding's number + title under its tag (full detail is in Section 5).

**⛔ Antipatterns** — {#, title} …
**🔴 Critical / Must-fix** — …
**🟠 Strong** — …
**🟡 Preferable** — …
**🔵 Optional / Nit** — …
**🟢 Commendations** — …

## 5. Detailed Findings

Ordered by risk score descending; secondary-grouped by area. One block per finding, using this exact format:

---

### {N}. {Concise finding title}

- **Recommendation:** {⛔ Antipattern | 🔴 Must-fix | 🟠 Strong | 🟡 Preferable | 🔵 Optional | 🟢 Commendation}
- **Risk:** {🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low} ({score}) — S{n} × F{n}  *(honest computed band — do not inflate)*
- **Urgency:** {⚡ only when needed} one line on why real urgency exceeds the computed band (e.g. "directly exploitable by any untrusted caller; fix before ship despite F1"). Omit this line entirely when the risk band already reflects the urgency.
- **Standard:** `{CATALOG-ID}` {Standard name}
- **Location:** `path/to/file.ext:line` ({function/component name})

**What** — the issue, with the offending snippet quoted if short:

```ts
// the actual code
```

**Why it matters** — the concrete failure mode *in this codebase* (what breaks, when, for whom). Not a textbook definition.

**Fix** — a specific change that fits the surrounding patterns; short code sketch if it clarifies:

```ts
// the suggested shape
```

**References** — {repo ADR/doc/CONTEXT.md link} · {external authority — official docs / OWASP / web.dev / MDN, precise page}

---

*(repeat for each finding; commendations use the same block but Why/Fix become "why it's good" / "keep doing this")*

## 6. Themes & Systemic Observations

Patterns that span multiple findings — the root causes worth a broader fix (e.g. "server-side authorization is inconsistent across the OR routers", "no shared error-mapping helper, so each router leaks differently"). This is where you help the team fix classes of problems, not just instances.

## 7. Suggested Remediation Order

A short, sequenced action list: what to fix first and why (usually Critical/High risk and quick-win antipatterns first), grouped into sensible batches. Reference finding numbers.