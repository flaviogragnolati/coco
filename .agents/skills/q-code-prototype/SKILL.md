---
name: q-code-prototype
description: Build an isolated throwaway prototype to answer one design question. Use when the user wants to sanity-check whether a state model or logic feels right, or compare what a UI should look like, and authorizes a new prototype branch and worktree. Do not use for production implementation, edits in the current worktree, changes to existing data or services, or promotion without q-code-implement. Requires the q-core-contract companion. Part of the Quasar AI delivery skills.
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

Read the `q-core-contract` companion, its Git operations policy, and `references/git-worktrees.md` for the worktree mechanics that policy governs; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Build only in an authorized prototype branch and isolated worktree, newly created unless the current checkout is already a disposable workspace for this prototype. Never modify, stash, reset, stage, or clean the original worktree.

## Isolate before building

1. Inspect the repository root, base branch, existing branches and worktrees, and the original worktree's dirty, staged, and untracked state without changing them. Resolve whether the current checkout is already a linked worktree rather than a submodule, per `references/git-worktrees.md`; if it is, reuse it only when it is already a disposable workspace for this prototype, and otherwise place the new worktree outside it instead of nesting.
2. Propose one `prototype/<slug>` branch and one explicit temporary worktree path, following that reference's priority order — outside the repository, or an in-repository path already verified as ignored, never by editing `.gitignore` — and prefer the harness's native worktree mechanism when one exists. Obtain authorization for `git-create-branch` and `git-create-worktree`, naming the repository, base, branch, and path. Editing permission alone is insufficient.
3. Create only the authorized branch and worktree. Recheck that every prototype write resolves inside the new worktree and that the original dirty, staged, untracked, and data state is unchanged.
4. If isolation is unauthorized, technically denied, or impossible, return a prototype plan or analysis without writing code, naming which of the three occurred with the exact pending effect or error.

## Pick a branch

Identify which question is being answered — from the user's prompt, the surrounding code, or by asking if the user is around:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Build a tiny interactive terminal app that pushes the state machine through cases that are hard to reason about on paper.
- **"What should this look like?"** → [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar. When the project has a `design_system_ref`, load that exact version and vary within its contracts — unless the question is deliberately whether one of those contracts should change, which is worth stating at the top of the prototype.

The two branches produce very different artifacts — getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, default to whichever branch better matches the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked as such.** Locate the prototype code close to where it will actually be used (next to the module or page it's prototyping for) so context is obvious — but name it so a casual reader can see it's a prototype, not production. For throwaway UI routes, obey whatever routing convention the project already uses; don't invent a new top-level structure.
2. **One command to run.** Whatever the project's existing task runner supports — `pnpm <name>`, `python <path>`, `bun <path>`, etc. The user must be able to start it without thinking.
3. **No persistence by default.** State lives in memory. Persistence is the thing the prototype is _checking_, not something it should depend on. If the question explicitly involves persistence, obtain separate authorization and use a new disposable database or local file with a clear "PROTOTYPE — wipe me" name. Never touch an existing database, service, fixture store, or user data.
4. **Skip the polish.** Do not require an automated suite or production hardening. Run one reproducible smoke check that exercises the question, record its command and limitations, and add only the error handling needed to make that check runnable.
5. **Surface the state.** After every action (logic) or on every variant switch (UI), print or render the full relevant state so the user can see what changed.
6. **Capture it when done.** Record the question, smoke command, observations, verdict, limitations, and owner routes. Reusable visual or interaction language returns to `q-plan-design-system`, per-feature behavior to `q-plan-features`, boundaries to `q-plan-architecture`, and production implementation to `q-code-implement`; the prototype never edits a canonical artifact or promotes itself. If the user explicitly authorizes `git-stage` and `git-commit` for the named prototype branch, stage only prototype paths and commit only there. Otherwise leave the isolated worktree uncommitted and report the pending effects.

Push, pull request, merge, publication, worktree removal, and branch deletion always require separate authorization. Complete when the isolated prototype answers the stated question through a reproducible smoke check, original repository state remains unchanged, and promotion or cleanup has one explicit owner-routed next action.
