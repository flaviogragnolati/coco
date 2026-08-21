---
name: q-code-tdd
description: Test-driven development through a red → green loop and the rules that make it produce tests worth keeping. Use when building new behavior test-first, when the user asks for red-green or integration tests, and as the opt-in testing mode inside `q-code-implement`. Covers good behavioral tests, agreed seams, test anti-patterns, and one vertical slice at a time. Do not use it for a later refactoring pass or as the defect owner. Part of the Quasar AI delivery skills.
---

# Test-Driven Development

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle — consult them before and during the loop, not after.

**Where this fits.** Inside `q-code-implement` this is the opt-in mode: the user turns it on at the start of the run, and from then on every task is built test-first. It also runs standalone whenever behavior is being built. It is not the skill for a bug: a failing test that captures a defect comes from `q-code-debug` or `q-code-fix`, which own the regression-test rule. Here you are building new behavior, not proving an old one wrong.

When exploring the codebase, read `CONTEXT.md` (if it exists), the applicable technical foundation, and repository test configuration so test names, interface vocabulary, seams, and commands match the project. Respect ADRs in the area you're touching.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists — and survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams — where tests go

A **seam** is the public interface you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** No test is written at an unconfirmed seam. You can't test everything — agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

**Read before you ask.** A plan from the grill family already names its seams in its testing section; a ticket names the behavior its acceptance criteria check. Take the seams from there and confirm them in one line. Ask the open question — "what's the public interface, and which seams should we test?" — only when no artifact answers it.

**When there is no honest seam, that's the finding.** If the behavior can only be observed by reaching inside, don't invent a test that pretends otherwise — say so. A one-off gets recorded as a gap; a pattern of it is an interface problem, and interface depth and seam placement are what `q-code-grill-feature` (vocabulary in `q-code-grill-design/GLOSSARY.md`) exists to redesign.

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological** — the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth — a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead — one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **A green test that asserts old behavior is debt.** When a cycle's change makes an existing test wrong, update its expectation knowingly and say so — never delete it to get green, and never mechanically re-record a snapshot.
- **Refactoring is not part of the loop.** A later refactoring is separate `q-code-implement` work with its own authorized scope and proportional verification; `q-review-code` may identify the need but remains read-only.

## Inside `q-code-implement`

When `q-code-implement` drives, the loop nests inside its task loop rather than replacing it:

- **One task, one or a few slices.** The task's **acceptance criterion is the target** of the last test in the task — when it passes, the task is provable.
- **Seams are the run's, not the task's.** They were agreed once at Load. A task that seems to need a new seam is either testing internals or a sign the plan's testing section missed something — surface it instead of quietly adding one.
- **Green means the focused tests plus the project's required fast static or compiler signal when one exists.** `q-code-implement` owns command discovery and the phase gate; this loop owns the red and the green.
