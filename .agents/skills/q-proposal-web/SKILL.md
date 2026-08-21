---
name: q-proposal-web
description: "Create or revise a professional interactive web proposal from the canonical commercial proposal source while preserving scope, price, schedule, terms, and traceability. Use for the optional web channel after proposal design, including narrative, diagrams, comparisons, simulations, accessibility, and visual QA. Requires the q-core-contract companion. Part of the Quasar AI delivery skills."
---

# Interactive web proposal

Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. The canonical commercial source owns meaning; this skill owns the web channel.

## Inputs

Require a versioned `02-proposal-source.yaml`, applicable approval state, presentation requirements, brand assets, and deployment constraints. Use only approved or explicitly marked draft sources.

## Outputs and authority

Create:

- a web presentation plan or mapping: authored and supporting;
- web source and configuration: authored and supporting for channel behavior;
- built or deployed presentation: derived with no semantic authority;
- validation evidence and source provenance.

Publication is a separate side effect and requires explicit authorization.

## Procedure

1. Map every commercial section and ID to a web representation.
2. Ask only presentation-specific questions that sources cannot answer.
3. Design narrative, navigation, charts, diagrams, comparisons, and simulations.
4. Label assumptions and interactive scenarios so they cannot be mistaken for contractual commitments.
5. Implement responsive, accessible behavior.
6. Validate content fidelity, calculation logic, links, performance, and visual quality.
7. Regenerate from the corrected canonical source after semantic changes.

When `approved-web-visual-intent-needs-a-structural-diagram` and `q-tool-mermaid` is installed, delegate only approved commercial meaning and treat its SVG as a derived web asset. This skill retains web layout, brand, accessibility, and QA. If the tool is absent, `continue-with-an-accessible-textual-or-native-web-representation`.

When `client-facing-prose-is-drafted-and-the-user-requests-a-clarity-or-ai-pattern-pass-before-the-gate` and `q-tool-humanizer` is installed, pass only the copy this skill authors itself — the headings, navigation, and section introductions of the web presentation plan — with their language and a meaning lock naming every claim, number, name, price, date, citation, and commitment that must not change; never pass a sentence reproduced from the approved source, which the channel must render exactly, and adopt a revision only into the authored plan, never into a generated output. If it is absent, `keep-the-prose-as-authored-and-record-that-no-humanization-pass-ran`.

## Error routing

Return scope, price, schedule, commitment, or source contradictions to `q-proposal-design`. Fix layout, interaction, accessibility, or presentation defects here.

Return a valid `stage_result`; standalone execution requires later reconciliation.
