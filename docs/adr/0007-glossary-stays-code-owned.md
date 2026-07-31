# The glossary stays code-owned; a proposal is a change request, not an edit

**Status:** accepted — 2026-07-31

The admin glossary gains a way to question its own vocabulary: any admin can propose a new name, definition or identifier for an entry, and a superadmin accepts, applies or rejects it. The proposals live in Postgres (`GlossaryProposal`); **the entries do not**. They stay where they are — hand-authored in `src/features/admin/glossary/data/*.ts`, importing their Spanish labels from the live `*LabelMap`s and held to `prisma/schema.prisma` by `glossary.data.test.ts`. Accepting a proposal therefore changes nothing on screen: it commits someone to editing `glossary.data.ts` and `CONTEXT.md`, and the separate `applied` state records that the edit happened.

## Considered options

- **Database-backed entries, editable in the app** — the obvious shape for "propose and accept a change", and the one that makes accepting self-applying. Rejected because it severs the two ties that make the glossary trustworthy: the drift test, which can only assert against a dataset it can import, and the `*LabelMap` imports, which guarantee the glossary shows the label production actually renders. A DB-backed glossary drifts silently from both the schema and the UI, which is the failure the glossary was built to prevent.
- **Hybrid: entries in code, overrides in the database** — keeps the drift test and allows in-app fixes. Rejected as the worst of both: the label a reader sees would depend on a row nobody reviews, and `CONTEXT.md` — the canonical language — would still need the same manual edit.
- **No persistence at all** (propose by opening a GitHub issue or a QA ticket) — zero new schema. Rejected because the proposal has to be reachable from the term itself, in the moment of confusion, by someone who is not in the codebase.

## Consequences

- `accepted` and `applied` are two different facts, and the gap between them is manual. A superadmin marks `applied` after the code lands; nothing detects it. The tab groups `accepted` first so the gap stays visible.
- The proposal stores a **snapshot** of the entry it targets (slug, label, and the current value of the questioned field). The server never imports `~/features/admin/glossary` — the server layer imports nothing from `~/features` today, and the dataset transitively pulls in React-side modules — so a slug that later disappears from the code cannot be detected server-side. The snapshot is what keeps such a proposal readable, and the UI renders it as an entry that no longer exists rather than as an error.
- Language changes stay reviewable in git. A rename shows up as a diff across `CONTEXT.md`, the dataset and the `*LabelMap`, with the proposal as its stated motive.
- The glossary dialog stops being purely static: it now issues one tRPC query when it opens. It stays lazily loaded (`next/dynamic`), so no admin page pays for it until the floating button is used.
