---
name: q-review-comments
description: "Review the comments and docstrings a change added, edited, or invalidated for necessity, accuracy, brevity, and maintainability without changing program behavior. Use as the comment axis of the post-implementation mini review, or alone when code is over-commented, comments narrate the obvious or the task, or docstrings need an audit. Returns remove, rewrite, add, or keep findings with severity and a pass/fail outcome that the owning skill applies. Not for pull-request or document review comments. Part of the Quasar AI delivery skills."
---

# Review code comments

The workspace copy of this skill is the source of truth for this package. Do not modify a globally installed copy to reconcile differences.

## Scope

Inspect the comments and docstrings the current work added or changed, plus nearby comments whose meaning the change invalidates. Judge both directions: a comment the code does not need is a defect, as a missing comment on a hazard is. Do not demand comments for self-explanatory code, and do not accept comments that restate it.

## Baseline

Before judging any comment, establish the standard it is held to:

1. the code it describes, read first;
2. the originating specification or relevant history, when the comment makes a claim about them;
3. the repository convention: `04-application-standards.md` or repository instructions when they exist, a documentation linter or public-API docstring rule when one is configured, and the comment density of the surrounding unchanged code.

Calibrate to that convention. When none exists, apply the rubric default: few comments, each short. The reviewer's taste is never the standard.

## Rubric

A comment earns its place by saying what the code cannot: intent, a constraint or invariant, a trade-off, an external dependency, non-obvious failure behavior, or a justified workaround — the *why*, in the fewest words that preserve it. A public-interface docstring states the contract, the parameters and failure modes that are not self-evident, and nothing the signature already says.

Classify each comment:

| Disposition | Applies to |
|---|---|
| **remove** | Narration of what the code visibly does — syntax, control flow, a step-by-step of the body. Section banners or numbered step markers standing in for structure. Change history, task, ticket, or reviewer context ("added for", "changed from", "as requested", "new implementation"), which belongs in the durable record or commit. Planning or reasoning residue ("we could also", option comparisons, self-assurance). A docstring that restates the name, signature, or types with no added contract. Commented-out code without a stated reason and removal condition. |
| **rewrite** | A comment that is factually wrong, stale, or disconnected from current behavior. A correct comment longer than its point — a paragraph where a sentence carries the why. Vague or misleading wording. A TODO without owner, condition, or useful context. |
| **add** | A non-obvious invariant, hazard, workaround, or external dependency that nothing protects. |
| **keep** | Everything else. |

## Severity and outcome

Give each finding one severity:

- `blocker`: a comment that is wrong, stale, misleading, or disconnected from the code it annotates.
- `suggestion`: a remove or rewrite that is individually harmless — narration, a step marker, task residue, a restated signature, a correct but over-long comment.

Return one outcome: `pass`, `pass with findings`, or `fail`. Fail when any blocker exists, or when the suggestions together leave the changed surface materially noisier than its baseline; state that volume judgment once, as the pattern finding of step 5, not as a severity on each instance. Remove and rewrite findings never change behavior: the owning skill applies them before its close and reruns formatting or documentation checks; they are not carried as follow-ups.

## Procedure

1. Lock the change scope and its fixed baseline.
2. Establish the repository convention as the Baseline section requires.
3. Read the code, then the comment; contrast each claim with the implementation and, when the comment cites it, the specification or history. Mark a claim you cannot verify within scope — an unread file, unavailable history — as unverified in the finding; do not accept or reject it on plausibility.
4. Record each finding with disposition, severity, exact location, current text, proposed text for a rewrite, and the maintenance risk.
5. Count the comments the work added or changed against those kept. When most are remove or rewrite, name the pattern once — narration, task residue, restated signatures — so the implementer corrects the habit, not only the instances.
6. Change no behavior; route a behavior mismatch a comment reveals to an authorized implementation task.
7. Return the findings, the counts, the outcome, and the next action separately from the technical `q-review-code` axis.

After `q-code-implement`, `q-code-fix`, or `q-code-debug`, the implementer applies the findings and records the outcome in the original durable execution record. Standalone, return the review in the conversation as a transient result and create no file.

Complete when every added, changed, or invalidated comment in scope has a disposition, every finding has a severity and location, and the outcome is stated.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Validating intention without code | A comment sounds plausible, so it passes without checking current behavior. | Contrast it with the implementation, specification, and relevant history. |
| 2 | Demanding narration | Self-explanatory statements are flagged for lacking comments. | Ask for comments only where intent, constraints, invariants, or hazards are not evident. |
| 3 | Accepting narration | Comments that restate the code, mark steps, or describe the task pass because each is individually harmless. | Flag them as remove; their volume is the maintenance cost this gate exists to stop. |
| 4 | Reviewer's taste as the standard | A repository that requires public docstrings, or keeps code bare, is judged by the reviewer's own preference. | Calibrate to the repository convention and surrounding code; apply the default only when no convention exists. |
| 5 | Fixing behavior during comment review | A misleading comment triggers an unrequested code change. | Report the mismatch and route any behavior fix through an authorized implementation task. |
