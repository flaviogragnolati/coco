---
name: q-code-merge-conflicts
description: "Resolve an in-progress Git merge or rebase conflict by preserving compatible intent, validating the merged result, and stopping before any unauthorized staging, continuation, commit, abort, push, or cleanup. Use when a Quasar project has actual unmerged paths or a paused merge/rebase; do not use for ordinary code review, speculative merge planning, or a semantic conflict that requires the user to choose behavior. Requires the q-core-contract companion."
---

# Resolve merge conflicts

Resolve only conflicts whose intents can coexist or whose governing source already determines the result. Preserve the repository's dirty, staged, and untracked state outside the exact conflict paths.

Read the `q-core-contract` companion and its Git operations policy; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Editing a conflict does not authorize staging, continuing, committing, aborting, pushing, or cleanup.

## Procedure

1. Inspect the repository root, current branch or detached state, merge/rebase state, unmerged paths, existing staged paths, dirty paths, untracked files, and relevant history without mutating them.
2. Trace each side to its primary sources: commits, issue or plan, accepted artifact, tests, and surrounding implementation. Do not let the merge goal override a more authoritative requirement.
3. Classify every conflict:

   - `mechanical`: formatting, imports, generated ordering, or another change with one evidence-determined result and no behavior choice;
   - `semantically-compatible`: both intents can be preserved without inventing a third behavior;
   - `semantically-incompatible`: satisfying one intent breaks, removes, or materially changes the other and no governing source resolves the choice.

4. For `mechanical` and `semantically-compatible` conflicts, edit only the named conflict paths and preserve both intents. For `semantically-incompatible`, stop with the files, incompatible intents, supporting evidence, consequences, and available owner decisions; do not choose for the user.
5. Run change-scoped checks using the repository's existing commands. Correct only defects introduced by the resolution and keep unrelated failures separate.
6. Show the resolved paths, remaining unmerged paths, staged set, dirty set, checks, and classification. Do not use `git add .` or another broad stage.
7. If the user explicitly authorizes `git-stage`, stage only the listed resolved paths. Otherwise leave them unstaged and report the exact pending effect.
8. Before `merge --continue` or `rebase --continue`, obtain explicit authorization for `git-continue-operation` and `git-commit`, because continuation may create a commit. Stop again if the next rebase step introduces a new semantic conflict or needs another operation beyond the approved scope.

Never commit separately, abort, push, open a pull request, delete a branch or worktree, or clean files automatically. Complete when all compatible conflicts in scope are resolved and checked, every incompatible conflict is owner-routed, repository state is preserved outside named paths, and the next Git effect is either explicitly authorized and completed or reported as pending.
