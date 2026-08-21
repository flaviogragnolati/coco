---
name: q-code-handoff
description: "Create a structured, redacted workspace handoff that lets a fresh agent continue without conversation history. Use when pausing work, changing sessions, or transferring a task with decisions, evidence, current state, risks, blockers, artifacts, and next steps. Part of the Quasar AI delivery skills."
---

# Handoff

Create the handoff under the workspace `tmp/` directory unless the user names another in-workspace location. Do not write to the operating-system temporary directory.

Include:

1. purpose of the next session;
2. concise conversation and project context;
3. current state and completed work, including any parked branch or isolated worktree path;
4. decisions already made and their evidence;
5. requirements, constraints, and non-goals;
6. unresolved questions, risks, and blockers;
7. relevant artifacts with exact paths and versions;
8. validations already run and their results;
9. ordered next steps;
10. explicit instructions not to reopen settled decisions without new evidence.

Redact secrets and unnecessary personal information. Make the document self-contained but concise.
