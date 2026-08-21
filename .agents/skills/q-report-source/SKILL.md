---
name: q-report-source
description: "Create or revise the structured, versioned, and traceable semantic source for a Quasar report. Use when approved artifacts from discovery, research, delivery, implementation, validation, or consulting must be synthesized into general or market-research content for progress, feature, milestone, release, completion, consulting, executive, or custom report types before rendering. Market-research blocks require typed evidence refs and promoted analysis results; this skill never investigates or recalculates. Requires the q-core-contract companion."
---

# Reporting source design

Create the versioned `report-source.yaml` consumed by every report channel. Treat it as the single semantic source for the reporting run. Preserve upstream authority: the report source owns only its selected narrative, reporting scope, and approved interpretation, never the underlying project facts or commitments.

Read the `q-core-contract` companion for shared governance and its `references/report-source.schema.yaml`; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

Load [the market-research content profile](references/market-research-profile.md) only when `report.content_profile: market-research`.

## Inputs and source gate

Require an aligned reporting request and an approved source bundle containing artifact IDs, versions, owners, lifecycles, semantic authority, authority scopes, intended uses, and reporting-snapshot approvals when applicable.

Apply this precedence:

1. Use the canonical artifact for the relevant authority scope.
2. Use supporting artifacts only with their provenance.
3. Use derived artifacts only as presentation or visual references, never as the sole support for a semantic claim.
4. Exclude transient and unregistered material.
5. Use `Superseded` or `Archived` material only for an explicit historical comparison.

A `Working` artifact may inform planning. Before baselining the report source, require that exact version to be `Baselined`, `Released`, or explicitly approved as a reporting snapshot by the owning or root orchestrator.

An approved ideation snapshot qualifies under that rule and is canonical only for its dispositions, applied criteria and gates, retained dissent, and authorized handoff. Report its candidates as `recommendation`, `decision-request`, or `risk` blocks with their unresolved assumptions; never as `fact`, `metric`, or accepted scope.

Complete the source gate when every material content block has eligible evidence or a visible gap and no unresolved conflict is hidden.

For `market-research`, require each material block to carry typed `evidence_refs` with exact `artifact_id`, `version`, `ref_type`, and `ref_id`, and require that artifact version in `source_snapshot`. Accept Market Analysis values only from `published_results`; a persisted JSON/CSV export with `semantic_authority: none` cannot be the only support. Preserve the result's scenario, assumptions, qualifiers, reconciliation status, and limitations. Do not search sources, process raw responses, or recalculate.

## Build the source

1. Record report identity, type, audience, purpose, period, `as_of`, confidentiality, scope, and requested channels.
2. Freeze the source snapshot with artifact IDs, versions, owners, authority, lifecycle, use, and approval references.
3. Record included and excluded coverage and unresolved gaps.
4. Organize sections and stable content-block IDs.
5. Classify each block as `fact`, `metric`, `estimate`, `interpretation`, `recommendation`, `projection`, `decision-request`, `risk`, or `next-action`.
6. Add source references to facts, metrics, estimates, interpretations, recommendations, and projections. Ensure at least one cited source has semantic authority and an eligible lifecycle or snapshot approval. For `market-research`, also add typed evidence refs that resolve to the exact source-snapshot version.
7. Record channel-neutral visual intent only when evidence benefits from a chart, table, diagram, or other visual. For C4, reference the exact approved source artifact/version and view ID, audience, purpose, required elements, and allowed crop or emphasis; never reconstruct a model from a derived render. Leave backend mechanics, pagination, slide structure, and layout to renderers.
8. Validate `report-source.yaml` against the schema and reconcile duplicate or unresolved IDs.
9. Obtain explicit semantic approval before changing lifecycle from `Working` to `Baselined`.

Do not render Markdown, DOCX, PDF, or PPTX here. Do not let a summary or recommendation silently become an upstream decision.
Do not use a derived export as the only semantic support or derive a new market calculation here.

When `client-facing-prose-is-drafted-and-the-user-requests-a-clarity-or-ai-pattern-pass-before-the-gate` and `q-tool-humanizer` is installed, pass the exact prose sections, their language, and a meaning lock — every claim, number, name, price, date, citation, and commitment that must not change — for `detect` and, if requested, `rewrite` or `improve`; adopt a revision into this owned artifact only after checking the lock, and keep the pass out of any derived render. If it is absent, `keep-the-prose-as-authored-and-record-that-no-humanization-pass-ran`.

## Conflict and revision handling

When sources disagree, identify the affected block, artifact IDs, versions, authority scopes, and owners. Block that block or the full baseline according to materiality, and route correction to the source owner.

When a renderer or manual edit reveals a semantic change, revise this source through a new version, obtain approval, mark previous derivatives stale, and regenerate them. Reuse stable IDs for unchanged meaning.

## Result

Return a valid `stage_result` containing the report-source artifact, source and traceability deltas, stale derivatives, blockers, warnings, required approvals, and the requested renderer as the next action. Standalone execution never updates global state or the artifact index.
