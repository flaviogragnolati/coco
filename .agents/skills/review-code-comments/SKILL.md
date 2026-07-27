---
name: review-code-comments
description: Review source-code comments and docstrings for accuracy, relevance, usefulness, clarity, and maintainability. Use when auditing a repository, pull request, diff, module, or code snippet for comment quality; identifying stale, redundant, misleading, or missing comments; evaluating TODOs and workarounds; or proposing better comments without changing program behavior.
---

# Review Code Comments

Evaluate comments in the context of the code they describe. Separate whether a
comment makes sense from whether it is useful: an accurate comment can still be
redundant, while a potentially useful comment can still be wrong or stale.

## Review Workflow

1. Establish the requested scope: repository, files, diff, module, or snippet.
2. Inspect enough surrounding code to understand each comment. Follow directly
   relevant definitions or call sites when needed to validate its claims.
3. Review:
   - Line and block comments
   - Public API documentation and docstrings
   - `TODO`, `FIXME`, `HACK`, and `NOTE` annotations
   - Linter, type-checker, validation, and security suppressions
   - Commented-out code
   - Links to issues, documentation, policies, or algorithms
4. Ignore license headers and generated comments unless they are incorrect,
   obsolete, or part of the user's requested scope.
5. Report only actionable findings unless the user requests a complete inventory.
6. Do not edit code or comments unless the user explicitly requests changes.

## Core Principle

Prefer self-documenting code. A valuable comment usually explains information
that the code cannot express clearly:

- Why a decision was made
- Which business rule or external constraint applies
- Why an apparently simpler implementation is unsafe
- Which side effect, invariant, compatibility issue, or operational risk matters
- When a workaround can be removed
- How a public API must be used correctly

Do not require every comment to explain only "why." Public API docs may need to
describe contracts, parameters, return values, exceptions, preconditions, and
side effects. Mathematical expressions, binary formats, protocols, and complex
algorithms may also need concise explanations of "what" or "how."

## Evaluation Rubric

### 1. Sense and Accuracy

Classify each reviewed comment as:

- **Makes sense**: Accurate, current, unambiguous, and correctly scoped.
- **Partially makes sense**: Contains useful truth but is incomplete, imprecise,
  misplaced, or ambiguous.
- **Does not make sense**: Contradicts the implementation, describes obsolete
  behavior, or is materially misleading.
- **Cannot verify**: Requires unavailable business, historical, or external context.

Check whether the comment:

- Matches the current implementation and identifiers
- Applies to the exact code beside it
- Remains true across the relevant branches and edge cases
- Avoids unsupported claims or contradictions
- Would lead a maintainer to the correct conclusion

Never infer that a comment is wrong solely because its rationale is not visible
in local code. Use **Cannot verify** and state what evidence is missing.

### 2. Usefulness

Classify each reviewed comment as:

- **Useful**: Adds important, non-obvious context.
- **Useful but improvable**: Adds value but is vague, incomplete, too long, or
  difficult to maintain.
- **Redundant**: Restates code that is already clear.
- **Unnecessary**: Adds no practical value even if technically correct.
- **Harmful**: Misleads maintainers, encourages unsafe changes, or hides obsolete
  behavior.

Check whether the comment:

- Explains intent rather than merely translating syntax
- Preserves business or architectural knowledge
- Warns about non-obvious risks, invariants, or side effects
- Provides a useful reference or removal condition
- Helps a caller use a public API correctly
- Prevents a plausible maintenance mistake

### 3. Quality Score

Assign one score:

- **5 — Excellent**: Correct, concise, durable, and supplies essential context.
- **4 — Good**: Useful and correct, with only minor improvement possible.
- **3 — Acceptable**: Adds value but is ambiguous, verbose, or incomplete.
- **2 — Weak**: Mostly redundant, vague, or difficult to maintain.
- **1 — Poor**: Confusing, unnecessary, or structurally inappropriate.
- **0 — Harmful**: False, stale, contradictory, or likely to cause errors.

Do not calculate the score mechanically. Base it on the comment's likely effect
on future maintenance.

## High-Value Comment Patterns

Treat comments as valuable when they:

- Explain non-obvious business rules or policy decisions
- Document workarounds, compatibility constraints, or temporary fixes
- Record the source or assumptions of a non-trivial algorithm
- Link to a stable, relevant issue, policy, specification, or document
- Describe security, concurrency, performance, data-integrity, or operational risks
- Define a public API contract beyond what types and names already communicate
- Record actionable missing work with a concrete `TODO` and, when appropriate,
  an issue identifier or removal condition

## Problem Patterns

Flag comments that:

- Translate an obvious statement or expression into prose
- Describe mechanics without adding intent or context
- Are stale, false, contradictory, or attached to the wrong scope
- Use vague claims such as "needed for some reason" or "temporary fix" without
  explaining the constraint
- Hide confusing design behind a long explanation when clearer code is feasible
- Preserve dead code instead of relying on version control
- Contain unactionable or permanently stale TODOs
- Suppress a warning, validation, or security control without explaining why
- Duplicate information likely to drift independently from its source of truth
- Expose secrets or sensitive operational details

Recommend clearer code instead of a new comment when renaming, extraction,
simplification, or stronger types would communicate the same idea more reliably.

## Recommendation Labels

Assign one action:

- **Keep**
- **Improve**
- **Update**
- **Remove**
- **Replace with clearer code**
- **Needs additional context**

When recommending **Improve** or **Update**, propose exact replacement text only
when the evidence supports it. Never invent business rules, tickets, constraints,
or historical rationale. Use an explicit placeholder when necessary, such as:

```text
[Explain the constraint that prevents the usual implementation.]
```

## Examples

Redundant:

```javascript
// Increment the active user counter by one.
activeUserCount += 1;
```

Useful:

```javascript
// "Active" includes users authenticated within the last 30 days.
// Defined by product policy issue #4092.
if (user.status === "active") {
  activeUserCount += 1;
}
```

The second example preserves business context that cannot be derived from the
statement itself. Verify that the referenced policy and the code still agree.

## Output Format

Start with:

- Scope reviewed
- Total comments examined
- Counts by usefulness category
- Overall comment-quality score from 0 to 10
- Up to three recurring problems
- A concise maintainability assessment

Then list only comments requiring attention:

| Location | Current comment | Sense | Usefulness | Score | Action | Reason | Suggested replacement |
|---|---|---|---|---:|---|---|---|

Use file paths and line numbers when available. Keep reasons specific and concise.
Use `N/A` for a replacement when deletion or code refactoring is the better fix.

Finish with:

1. Up to five especially strong comments and why they help, if any exist.
2. Prioritized recommendations in this order:
   - Correct false, contradictory, or stale comments.
   - Review comments involving security, data integrity, concurrency, or side effects.
   - Improve workarounds, suppressions, and non-obvious decisions.
   - Remove redundant comments and commented-out code.
   - Refactor code that depends on excessive explanation.

If no actionable problems exist, state that clearly instead of manufacturing
findings. Distinguish observed facts from inferences throughout the review.
