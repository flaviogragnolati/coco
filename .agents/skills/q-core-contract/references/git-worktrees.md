# Worktree isolation mechanics

Derived companion of the `Git operations` section in `q-core-contract`. The
contract states the normative rule, this file states the mechanics, and the
calling skill owns its own step order and authorization request. Nothing here
grants a permission.

## When isolation applies

Apply it when creating throwaway or candidate work that must not touch the
original worktree — today, `q-code-prototype`.

Do not apply it to an in-progress merge or rebase: that operation lives in the
worktree that started it, and resolving it elsewhere abandons the operation
state. Do not apply it to in-place implementation, where the user expects the
change in the current checkout.

## Detect an existing linked worktree

Inspect before proposing anything, in this order:

1. `git rev-parse --show-superproject-working-tree` — a non-empty result means
   the current checkout is a submodule. A submodule's Git directory legitimately
   diverges from its superproject's; never read that divergence as a worktree.
2. `git rev-parse --git-dir` and `git rev-parse --git-common-dir`, both resolved
   to absolute paths. If they differ and step 1 was empty, the current checkout
   is already a linked worktree.
3. `git worktree list --porcelain` for the existing set and their branches.

When the current checkout is already a linked worktree, do not nest another one.
Reuse it and skip creation only when it is already the disposable workspace for
this work; otherwise its branch and in-progress state belong to someone else.
In every other case register the new worktree against the common repository and
place it outside the directory tree of every existing worktree.

## Prefer the harness's native mechanism

Probe first for a worktree mechanism the agent platform exposes itself — a
dedicated tool, command, or flag. Use it when it exists, because the harness can
track and clean what it created. Fall back to
`git worktree add -b <branch> <path> <base>` only when no native mechanism is
available. Both routes are the same two effects, `git-create-branch` and
`git-create-worktree`, and need the same authorization.

## Choose the path

Propose the first eligible option:

1. A location the user already declared for this repository. A standing
   preference never replaces the operation-level authorization.
2. A path outside the repository — for example `<temp-root>/<repo-name>/<branch-slug>`,
   an illustrative shape rather than a required convention.
3. A path inside the repository only when `git check-ignore -q <path>` succeeds
   before creation.
4. Nothing eligible — return the blocked precondition to the caller.

Never edit `.gitignore`, stage, or commit to make a path eligible. That mutates
the original worktree the isolation exists to protect.

## Verify after creation

Confirm all three:

- `git worktree list` shows the new path on the intended branch;
- every subsequent write resolves under that path;
- the original worktree's dirty, staged, and untracked state is unchanged.

## Report the outcome

Name which of the three occurred:

| Outcome | Return |
|---|---|
| Unauthorized | Stop before the mutation and return the exact pending effect, target, repository state, and safe next action. |
| Technically denied | The operation was authorized but the sandbox, filesystem, or permission layer refused it. Return the exact error, whether partial state was created, and the alternative path or plan-only route. |
| Impossible | No eligible path exists, or repository state prevents creation. Return the blocked precondition. |

## Non-goals

Dependency installation, builds, and baseline test runs are not part of
isolation. They belong to the calling skill and, when performed, are its own
`execute-local-scripts` effect. Worktree removal and branch deletion are
separate approvals (`git-delete-ref`).
