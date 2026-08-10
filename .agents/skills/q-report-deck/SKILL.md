---
name: q-report-deck
description: "Plan, create, edit, or review branded Quasar presentations for reports, results, proposals, training, consulting, and project decisions. Use when a PowerPoint deck must preserve source traceability, speaker notes, visual identity, explicit plan approval, render-based QA, and optional project artifact registration. Requires the q-core-contract companion."
---

# Generate a Quasar deck

Use the installed presentation skill for PowerPoint inspection, generation, rendering, and visual QA. Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Use `references/identidad-visual.md` and the assets in this skill for Quasar narrative and brand rules.

## Authority and inputs

When running as a reporting channel, require one schema-valid, `Baselined` report source and consume the same version used by every requested channel. In broader standalone use, consume only approved or baselined sources. An explicitly marked draft may be used for planning, but not for a released PPTX or PDF. Record source IDs, versions, and authority. Do not turn a chart, summary, simulation, or speaker note into a new upstream commitment.

The presentation plan is authored and supporting. The PPTX and exported PDF are separate derived artifacts with `semantic_authority: none`.

## Mandatory flow

### 1. Align

Confirm audience, decision, presentation type, duration, language, tone, delivery mode, required sources, confidentiality, and output formats. Distinguish facts, source-backed interpretation, and direction or recommendation.

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

### 5. Verify and deliver

Render every slide and inspect layout, overflow, contrast, consistency, data fidelity, traceability, and notes. Correct defects and rerender. Deliver the editable PPTX and requested derivatives.

When invoked inside a project, register the deck and its provenance in the artifact index through the owning orchestrator. If a source inconsistency appears, report it or create a change request; do not rewrite upstream meaning.

Keep PPTX editable but not authoritative. Return semantic edits to `q-report-source` when the deck is a reporting channel, or to the applicable upstream owner in broader standalone use. Regenerate every affected channel after approval.

Return a valid `stage_result` containing the plan, PPTX and PDF outputs, exact sources, validation evidence, known limitations, release and publication status, stale artifacts, blockers, and one next action. Standalone execution never updates global state or the artifact index.
