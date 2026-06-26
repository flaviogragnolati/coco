---
name: debug
description: Default first stop for everyday bugs in a T3-stack codebase (TypeScript, tRPC, Next.js, vitest, Drizzle). Use whenever the user reports a bug, says something is broken / throwing / failing / not working, gets wrong output, or has a failing test they want fixed — even if they never say the word "debug". Drives a lightweight loop that pins the symptom, gets a fast pass/fail signal from a focused vitest run or a throwaway sandbox script, maps the triggering cases, forms a couple of ranked hypotheses, then validates and applies the fix. Escalate to the `diagnose` skill when the bug is a performance regression, is flaky / non-deterministic / a heisenbug, or needs an elaborate reproduction harness — that is diagnose's territory, not this one.
---

# debug

The default first stop for everyday bugs. Pin the symptom, get a fast pass/fail signal in a controlled sandbox, find what triggers it, form a couple of hypotheses, fix it, and prove the fix with that same signal.

This is the **low tier** of debugging. Its heavy-tier counterpart is the `diagnose` skill, for hard bugs and performance regressions that need aggressive feedback-loop engineering. Start here; escalate to `diagnose` when the bug turns out to be more than this skill is for (see "When to escalate"). The relationship mirrors the grilling skills: you don't open `design-grill` for a one-line change, and you don't reach for `diagnose` for a missing `await`.

These instructions are in English. Conduct the debugging dialogue with the user — and write the closing root-cause summary — in the project's working language (Spanish).

This skill assumes a **T3-stack** codebase (TypeScript, tRPC, Next.js, **vitest**, Drizzle). The commands and seams below are written for that stack; adapt the specifics where a project differs, but keep the loop the same.

## When to use this vs `diagnose`

| | **debug** (this skill) | **diagnose** |
| --- | --- | --- |
| Use when | A bug you can reproduce — or quickly make reproducible — with a focused test or a small sandbox run | Hard bugs and performance regressions that resist a clean repro |
| Signal | One focused `vitest` run, or a throwaway sandbox script | Whatever it takes — bisection harness, fuzz loop, replayed traces, deep instrumentation |
| Depth | A couple of ranked hypotheses, one probe, fix | 3–5 hypotheses, formal instrumentation, full post-mortem |

**When to escalate to `diagnose`** — stop and switch the moment any of these is true:

- It's a **performance regression** — logs lie about timing; you need baselines, profiling, and bisection, not this loop.
- It's **flaky / non-deterministic / a heisenbug** — you can't get a signal that fails reliably enough to debug against.
- Reproducing it needs an **elaborate harness** — multi-service orchestration, captured production traffic, a bisection rig.

If you hit one of these, say so plainly and hand off to `diagnose` rather than forcing this lighter format onto a problem it doesn't fit.

## Before you start — pin the symptom

Don't fix a bug that's merely *near* the one reported. First nail down:

- The **exact** failure mode the user is seeing — the real error text, the wrong value (expected vs actual), or the specific failing case. Wrong symptom → wrong fix.
- **One concrete way to trigger it** — an input, a route, a click path, or a test that's already red.

Then glance at `CONTEXT.md` (the glossary) and any ADRs in the area you're touching, so your mental model matches the project's language and its settled decisions. Cheap, and it keeps you from "fixing" behavior that's actually working as designed.

## 1. Get a pass/fail signal in the sandbox

**This is the skill.** Everything after is mechanical once you have a fast, deterministic, agent-runnable signal that goes red on the bug. Spend your effort here.

Reach for these in roughly this order:

1. **A focused `vitest` run.** Narrow it hard — a single file, or `vitest run path/to/file.test.ts`, `-t "<name>"`, `test.only` — so the loop is seconds, not minutes. If a test that reaches the bug doesn't exist yet, write a quick failing one at the nearest seam: a pure function directly, a tRPC procedure through a caller, a Drizzle query against a test DB.
2. **A throwaway sandbox script** when there's no clean test seam. Spin up a minimal subset — one procedure or function, dependencies mocked — and exercise the buggy path with a single call. Replaying a captured payload (the real tRPC input, the row that breaks) through the code path in isolation is often the fastest route.

Then **sharpen the loop**: make it faster (skip unrelated setup), make the assertion specific to the actual symptom (not "didn't throw"), and make it deterministic (seed RNG, pin time/clock, isolate the DB). A 2-second deterministic loop is a debugging superpower; a 30-second flaky one barely helps.

Don't move on until you have a signal that fails on the bug and that you believe. If you can't get one *because* the bug is flaky, perf-related, or needs a big harness, that's the escalation cue above — hand off to `diagnose`.

## 2. Reproduce and map the triggering cases

Run the signal. Watch it go red, and confirm it's the **user's** failure — not a different one that happens to live nearby.

Then map what actually triggers it. This is where a vague report becomes a precise one:

- Which inputs / states / code paths make it fail, and which closely-related ones **don't**? The boundary between "fails" and "passes" usually points straight at the cause.
- Narrow toward the **smallest** trigger. A one-line input that reproduces it beats a full request payload.

## 3. Hypothesize

Write down **2–3 ranked hypotheses** before testing any of them — generating only one anchors you on the first idea that came to mind.

Each must be **falsifiable**: state its prediction. *"If the cause is X, then changing Y will make the bug disappear."* If you can't state the prediction, it's a vibe — sharpen it or drop it.

If the user is around, a quick sanity check of the ranked list is a cheap, big time-saver — they often re-rank it instantly ("we changed exactly that yesterday"). Don't block on it; proceed on your own ranking if they're AFK.

## 4. Fix and validate

Confirm the cause with **one targeted probe** before changing anything — a breakpoint / REPL inspection beats ten scattered logs. If you do log, tag each line with a unique prefix like `[DEBUG-a4f2]` so cleanup is a single grep, and change **one variable at a time** so the signal stays interpretable.

Once you know the cause, **validate before you apply** — never ship a fix blind:

- **Trivial / obvious fix** (a typo, an off-by-one, a missing `await`, a wrong import): apply it, and show the signal going green as the evidence.
- **Anything more involved**: propose a short plan **in the session first** — root cause, the change you intend, and why — and get a quick OK before touching the real code. This is a conversation, not a document.

Either way, prove it: the sandbox signal must go from red to green, and then re-run it against the original (un-narrowed) scenario to confirm the real bug is gone.

**Regression test.** If there's a **correct seam** — one where the test exercises the real bug pattern *as it occurs at the call site* — turn the repro into a lightweight test that now stays green. If the only available seam is too shallow to capture the real pattern (a single-caller test when the bug needs several callers, a unit test that can't replicate the chain that triggered it), **don't** write a false-confidence test there. Note that the absence of a good seam is itself the finding.

## 5. Close out

Before declaring done:

- [ ] The original repro no longer reproduces (re-run the Phase 1 signal).
- [ ] The regression test passes — or the absence of a good seam is documented.
- [ ] All `[DEBUG-...]` instrumentation is removed (grep the prefix).
- [ ] Throwaway sandbox scripts are deleted.
- [ ] State the root cause in 2–3 lines — the hypothesis that proved correct — for the commit / PR message, so the next person learns from it.

Then ask: **what would have prevented this?** If the honest answer is architectural (no test seam, tangled callers, hidden coupling), flag it — and treat it as a sign the problem may have belonged in `diagnose`'s heavier loop. Make that call *after* the fix is in, when you know the most.