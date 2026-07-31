# Legal documents live in the database and are versioned; unlike the glossary, they are not code-owned

**Status:** accepted — 2026-07-31

Terms and conditions, and the legal texts beside them, are rows in `legal_document`: one row per published version, carrying its kind, its version number, its Markdown body and an `active` flag, with at most one active version per kind. An admin edits and publishes them from the admin panel; the public page is statically rendered and revalidated on demand when a version is published. This is the deliberate opposite of the glossary, which stays hand-authored in code (ADR 0007), and the reason for the difference is worth stating: the glossary is held to the schema by a drift test that can only assert against a dataset it can import, while a legal text has nothing in the codebase to be consistent with and everything to do with when it was published and who accepted it.

## Considered options

- **Markdown files in the repository, deployed with the app** — free versioning through git, reviewable in a pull request, and consistent with how the glossary is treated. Rejected because publishing a legal correction would require a deploy, and because the checkout must be able to name the exact version a customer accepted; a git SHA is not a fact the order table can reference.
- **One mutable row per document, no version history** — the smallest possible schema. Rejected because `UserOrder.termsSnapshot` has to stay truthful after an edit: without versions, the only defence is the frozen text, and there is no way to answer "which version was live in March" or "who is still on the old one".
- **A generic key/value settings table shared with the home offers configuration** — one model instead of two. Rejected because the version history, the active flag and the one-active-per-kind invariant would all have to be reimplemented inside JSON, unenforced by Prisma.

## Consequences

- Publishing is a transaction: deactivate the current active version of that kind, activate the new one, then revalidate the public path. A failed revalidation must not roll back the publish — the text is correct in the database and the page catches up on the next revalidation.
- On-demand revalidation is the first use of Next's cache in this repository. There is no existing `revalidate`, `unstable_cache` or `force-static` anywhere in `src/`, so this establishes the pattern rather than following one.
- `UserOrder.termsSnapshot` keeps storing the full accepted text *and* gains the version id. The text stays because an order must remain readable if the row is ever deleted; the id is what makes "which version" answerable without string comparison.
- The `kind` enum ships with `terms` alone in use. Privacy and returns are enabled by the model at no cost, but nothing renders them until someone builds the pages.
- The body is Markdown, not HTML. It renders through a Markdown component rather than `dangerouslySetInnerHTML`, and it stays legible in the raw snapshot the order keeps.
