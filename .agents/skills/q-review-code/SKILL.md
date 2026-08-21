---
name: q-review-code
description: "Review a branch, pull request, working tree, or change since a fixed baseline along two separate axes: repository standards and originating specification. Use as the change-scoped technical mini review after implementation. Report findings without applying fixes. Part of the Quasar AI delivery skills."
---

# Code review

Review one change, not the whole codebase. Do not modify code.

## Inputs

Require:

- a fixed comparison baseline;
- the changed files or diff;
- repository instructions and standards;
- the exact technical foundation version and adopted guidance when they apply;
- the exact `design_system_ref` version when the change touches a user interface;
- the originating backlog item, issue, ticket, plan, specification, or acceptance criteria.

If the baseline or specification is missing, state the limitation instead of inventing it. If the technical profile is missing or stale, keep generic findings separate and declare the stack-specific coverage gap.

## Two-axis review

Keep results separate:

1. **Standards axis:** correctness, security, data integrity, failure handling, maintainability, tests, architecture, repository conventions, applicable adopted technology guidance, and conformance to the referenced design system for interface changes.
2. **Specification axis:** requested behavior, scope, acceptance criteria, non-goals, migration, and unintended changes.

Use independent reviewers or parallel passes when that capability is available. Otherwise run two sequential passes with separate notes and context. Do not require a particular tool or agent name.

Keep exactly these two axes. Design-system conformance is a standards criterion and may be reported as its own subsection, but it never becomes a third authority axis and never justifies reviewing beyond the changed surface. Report a missing or stale design-system reference as a coverage gap and route it to `q-plan-design-system`.

## Optional database schema review

When `changed-surface-includes-relational-schema-document-model-or-migration` and `q-tool-database-schema` is installed, use `schema-review`, `document-model-review`, or `migration-design` against the fixed diff, observed current state, originating specification, and confirmed profile. Reconcile its transient findings into the applicable standards or specification axis; do not add a third authority axis or let the specialist apply fixes. If it is absent, `apply-project-and-generic-data-integrity-criteria-and-declare-specialist-coverage-unavailable`.

## Finding format

For each finding include priority, axis, exact location, evidence, impact, and recommended correction. Merge only true duplicates while preserving both axes.

Distinguish blockers from suggestions. Do not report pre-existing issues outside the changed surface unless the change makes them newly relevant.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Silencing corroborating observations | A second axis finds the same defect for a different reason and the observation is discarded as duplicate. | Merge only the finding record while preserving evidence and impact from both axes. |
| 2 | Collapsing both review axes | Repository standards are treated as proof that the requested behavior was implemented. | Evaluate standards and originating specification separately, then reconcile outcomes. |
| 3 | Expanding into a codebase audit | Unrelated pre-existing issues dominate a change-scoped review. | Report only changed-surface issues or pre-existing defects made newly relevant by the change. |

## Close

Return:

- baseline and scope;
- standards findings;
- specification findings;
- verification gaps;
- outcome: pass, pass with findings, or fail;
- recommended next action.

The implementer records the result in the original durable ticket or execution record.
