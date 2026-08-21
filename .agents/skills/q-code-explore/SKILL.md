---
name: q-code-explore
description: "Explore a codebase, targeted module or feature, or document and return a transient high-level summary grounded in inspected evidence. Use for orientation in unfamiliar material, to answer a question by tracing relevant code or text, to zoom out one abstraction level above a named code location (its modules, callers, dependencies, and responsibilities), or to build context before planning, implementation, review, or explanation. Part of the Quasar AI delivery skills; requires the q-code-grill-design companion for architecture vocabulary."
---

# Explore

Build a useful mental model without changing the source material. Treat the user's prompt as the reference for scope, emphasis, and useful depth.

## 1. Set scope and vocabulary

1. Read the nearest repository or workspace instructions before inspecting the target.
2. For a codebase, read `CONTEXT.md` when it exists and use its domain language. When modules, interfaces, seams, adapters, depth, leverage, or locality matter, read [`../q-code-grill-design/GLOSSARY.md`](../q-code-grill-design/GLOSSARY.md) and use that architecture vocabulary precisely; if that companion is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-code-grill-design`.
3. For a document, preserve its terminology and consult any nearby glossary, context file, index, or companion document needed to interpret it.
4. Accept a whole codebase or document, or a user-named module, feature, section, or concept. Start with the named target and widen only enough to explain its role and relationships.
5. Treat an optional user question as the exploration lens and starting point. Test its assumptions against the evidence and foreground the answer, while including adjacent context needed to avoid a misleading summary.
6. Treat "one abstraction level up" as a lens: when the user asks for the modules, callers, dependencies, ownership, and main data or control flow exactly one level above a named code location, keep the target to that ring, name the level you are describing, and return the map without widening to the whole codebase.

Complete this step when the target, exploration lens, governing instructions, and applicable vocabulary are explicit or any material ambiguity is reported.

## 2. Build the evidence-grounded model

1. Orient before drilling down. Inspect the repository tree, manifests, entry points, navigation, table of contents, headings, metadata, or other structural signals appropriate to the source.
2. Trace representative evidence. For code, follow ownership, main callers and dependencies, primary data or control flow, and relevant tests or docs. For documents, follow the thesis, structure, key concepts, supporting sections, and important relationships.
3. Cross-check the emerging model against more than one relevant source when available. Separate observed facts, reasonable inferences, and unresolved gaps.
4. Stop when the high-level model explains what the target is, how it fits together, and how it relates to the user's question. Keep this an orientation pass rather than an exhaustive audit or implementation plan.

Complete this step when every important claim is grounded in inspected evidence, the main relationships answer the user's lens, and remaining uncertainty is explicit.

## 3. Return transient context

Return the summary in the conversation as transient context. Do not create a file, register an artifact, or update workflow state unless the user separately requests a durable deliverable through an appropriate workflow.

Do not force a fixed template. Shape the response around the user's prompt and the material. As a rough guide:

- lead with the high-level description or direct answer;
- explain the important parts and how they relate;
- name the most useful files, entry points, sections, or other lightweight evidence;
- surface uncertainty, missing context, or assumptions that materially affect the picture;
- end with a natural next place to inspect only when it would help.

Complete this step when the user has a concise mental model, lightweight evidence pointers, explicit limitations, and no durable or source mutation from the exploration itself.

When `user-requests-a-transient-code-structure-diagram` and `q-tool-mermaid` is installed, pass the evidence-grounded map to it and return the diagram as transient context. Do not let the diagram add unobserved modules or calls. If the tool is absent, `return-the-evidence-grounded-textual-map-and-state-the-visual-capability-gap`.

## Boundaries

Use `q-code-research` for external primary-source investigation and a durable cited report, `q-review-codebase` for a formal quality audit, and `q-code-explain` to re-pitch technical content already presented.
