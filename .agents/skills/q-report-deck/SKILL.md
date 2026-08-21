---
name: q-report-deck
description: "Plan, create, edit, or review branded Quasar presentations for reports, results, proposals, training, consulting, and project decisions. Use when a Marp source deck, HTML presentation, deck PDF, image set, or PowerPoint file must preserve source traceability, speaker notes, visual identity, explicit plan approval, render-based QA, and optional project artifact registration. Use q-tool-marp directly for caller-approved neutral Marp mechanics without Quasar narrative or brand decisions, and q-tool-pptx when editable PowerPoint objects are required. Requires the q-core-contract companion."
---

# Generate a Quasar deck

Own the presentation plan, narrative, brand, release, and source traceability here. Use only presentation mechanics whose creation, rendering, and inspection capabilities are verified in the current environment. `q-tool-marp` is the optional Marp source and render collaborator; `q-tool-pptx` is the optional native PowerPoint mechanics collaborator; `q-tool-pdf` is the optional exported-PDF mechanics and validation collaborator. None proves that a required renderer exists or acquires presentation meaning. `q-tool-document` does not own presentation files. Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Use `references/identidad-visual.md` and the assets in this skill for Quasar narrative and brand rules.

## Authority and inputs

When running as a reporting channel, require one schema-valid, `Baselined` report source and consume the same version used by every requested channel. In broader standalone use, consume only approved or baselined sources. An explicitly marked draft may be used for planning, but not for a released PPTX or PDF. Record source IDs, versions, and authority. Do not turn a chart, summary, simulation, or speaker note into a new upstream commitment. A proposal deck is this same channel over the exact approved proposal source version delegated by `q-proposal-workflow`; it never becomes a proposal channel or a commercial release, and its semantic edits return to `q-proposal-design`.

The presentation plan is authored and supporting. The Marp Markdown, exact theme CSS, local assets, HTML, PPTX, PDF, and image outputs are presentation artifacts derived from approved report meaning with `semantic_authority: none`. Preserve Markdown, CSS, assets, render command, hashes, and versions as the editable and regenerable Marp source bundle.

## Mandatory flow

### 1. Align

Confirm audience, decision, presentation type, duration, language, tone, delivery mode, required sources, confidentiality, and output formats. Distinguish a Marp channel from a native object-editable PPTX channel: standard Marp PPTX is derived and visually reproducible, while object-level PowerPoint editing requires `q-tool-pptx`. Distinguish facts, source-backed interpretation, and direction or recommendation.

### 2. Plan

Create a concise plan containing:

- identification and source hierarchy;
- audience, decision, and communication outcome;
- coverage and exclusions;
- narrative arc and key evidence;
- slide-by-slide purpose, message, evidence, visual, and speaker-note intent;
- time budget;
- data, diagram, and media inventory;
- assumptions, blockers, and unresolved items;
- traceability and validation approach.

### 3. Obtain explicit approval

Do not generate or substantially revise the deck until the user approves the plan. Approval to generate is not approval to publish or send externally.

### 4. Generate or edit

Apply Quasar brand assets consistently. Prefer assertion-led slide titles, readable visuals, restrained text, and useful speaker notes. Preserve source IDs in notes or the agreed traceability mechanism.

When `approved-deck-plan-needs-a-mermaid-derived-asset` and `q-tool-mermaid` is installed, pass only the approved visual intent and a presentation profile. Keep slide composition, brand, and visual QA here. If the tool is absent, `continue-with-the-approved-textual-visual-intent-or-block-a-required-slide-asset`.

When `approved-deck-visual-intent-references-an-exact-c4-source-or-view` and `q-tool-c4` is installed, request validation or rendering of the exact C4 source version and view ID with a presentation profile. Own slide composition, crop, build, caption, brand, and visual QA only. If the tool is absent, `use-the-approved-c4-render-or-textual-intent-and-block-any-required-missing-asset`. Never redraw or reconstruct the C4 model from a derived image.

When `requested-deck-channel-includes-pptx-mechanics-creation-editing-inspection-or-validation` and `q-tool-pptx` is installed, pass one schema-valid `pptx_request` containing the approved plan and exact source versions, preservation and forbidden-change rules, authorized distinct output, runtime policy, security flags, and structural/rendered validation demand. Keep narrative, claims, slide purpose and order, visual identity, release approval, and artifact deltas here; the tool owns only bounded local package mechanics and returns a derived `pptx_result` with no semantic authority. If the tool is absent, `use-only-a-separately-verified-local-pptx-route-or-block-the-deck-and-require-explicit-partial-release`.

When `requested-deck-channel-includes-marp-source-html-pdf-pptx-or-image-rendering` and `q-tool-marp` is installed, build the approved source from `assets/marp/template-quasar.md` and the exact brand rules in `references/identidad-visual.md`, resolve the theme and asset paths into authorized roots, and pass one schema-valid `marp_request`. Keep content, slide order, Quasar identity, citations, notes intent, release approval, and artifact deltas here; the tool validates Marp mechanics and returns `marp_result` with the same owner. If the tool is absent, `use-only-a-separately-verified-local-marp-route-or-block-the-marp-channel-and-require-explicit-partial-release`. Do not use Marp's experimental editable-PPTX mode.

When `client-facing-prose-is-drafted-and-the-user-requests-a-clarity-or-ai-pattern-pass-before-the-gate` and `q-tool-humanizer` is installed, pass only the copy this skill authors itself — the slide titles, messages, and speaker notes of the presentation plan — with their language and a meaning lock naming every claim, number, name, price, date, citation, and commitment that must not change; never pass a sentence reproduced from the approved source, which the channel must render exactly, and adopt a revision only into the authored plan, never into a generated output. If it is absent, `keep-the-prose-as-authored-and-record-that-no-humanization-pass-ran`.

### 5. Verify and deliver

Render every slide and inspect layout, overflow, contrast, consistency, data fidelity, traceability, and notes. Correct defects and rerender. For Marp, require a validated source bundle and inspect each requested browser-backed output; reconcile note-preservation diagnostics per format rather than assuming parity. Use `q-tool-pptx` for the same request's native PPTX structural and rendered evidence when delegated. If the verified runtime cannot create or inspect a requested HTML, PDF, PPTX, or image set, block that format and offer the validated editable source or another supported partial result for explicit approval; never claim the missing output. Deliver only verified requested derivatives.

When `requested-deck-channel-includes-pdf-export-inspection-or-validation` and `q-tool-pdf` is installed, pass its `pdf_request` the exact plan and source versions, exported deck PDF path, required page and text checks, and a distinct validation-output directory. Keep slide meaning, PPTX export, brand, release approval, and artifact deltas here. If the tool is absent, `use-only-a-separately-verified-local-pdf-route-or-block-the-deck-pdf-and-require-explicit-partial-release`.

When invoked inside a project, register the deck and its provenance in the artifact index through the owning orchestrator. If a source inconsistency appears, report it or create a change request; do not rewrite upstream meaning.

Keep the Marp source bundle technically editable and the native PPTX object-editable when requested, but keep both non-authoritative. Return semantic edits to `q-report-source` when the deck is a reporting channel, or to the applicable upstream owner in broader standalone use. Regenerate every affected channel after approval.

Return a valid `stage_result` containing the plan, Marp source bundle and requested renders, native PPTX when applicable, exact sources, validation evidence, known limitations, release and publication status, stale artifacts, blockers, and one next action. Standalone execution never updates global state or the artifact index.
