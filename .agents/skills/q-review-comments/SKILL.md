---
name: q-review-comments
description: "Review changed or relevant source comments and docstrings for accuracy, usefulness, clarity, and maintainability without changing program behavior. Use alone for comment audits or as the comment axis of the post-implementation mini review. Part of the Quasar AI delivery skills."
---

# Review code comments

The workspace copy of this skill is the source of truth for this package. Do not modify a globally installed copy to reconcile differences.

## Scope

Inspect comments and docstrings changed by the current work plus nearby comments whose meaning the change invalidates. Do not demand comments for self-explanatory code.

## Rubric

A useful comment explains information the code cannot express clearly: intent, constraint, invariant, trade-off, external dependency, non-obvious failure behavior, or a justified workaround.

Flag comments that are:

- factually wrong or stale;
- a narration of obvious syntax;
- disconnected from current behavior;
- vague, redundant, or misleading;
- TODOs without owner, condition, or useful context;
- missing where a non-obvious invariant or hazard needs preservation.

## Procedure

1. Lock the change or target scope.
2. Read the code and relevant history or specification before judging the comment.
3. Classify each finding as remove, rewrite, add, or keep.
4. Cite exact locations and explain the maintenance risk.
5. Avoid behavior changes.
6. Return findings separately from the technical `q-review-code` axis.

When used after `q-code-implement`, the implementer records the result in the original durable execution record.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Validating intention without code | A comment sounds plausible, so it passes without checking current behavior. | Contrast it with the implementation, specification, and relevant history. |
| 2 | Demanding narration | Self-explanatory statements are flagged for lacking comments. | Ask for comments only where intent, constraints, invariants, or hazards are not evident. |
| 3 | Fixing behavior during comment review | A misleading comment triggers an unrequested code change. | Report the mismatch and route any behavior fix through an authorized implementation task. |
