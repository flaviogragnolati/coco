---
name: q-report-source
description: "Create or revise the structured, versioned, and traceable semantic source for a Quasar report. Use when approved artifacts from discovery, delivery, implementation, validation, or consulting must be synthesized into progress, feature, milestone, release, completion, executive, or custom reporting content before document or deck rendering. Requires the q-core-contract companion."
---

# Reporting source design

Create the versioned `report-source.yaml` consumed by every report channel. Treat it as the single semantic source for the reporting run. Preserve upstream authority: the report source owns only its selected narrative, reporting scope, and approved interpretation, never the underlying project facts or commitments.

Read the `q-core-contract` companion for shared governance and its `references/report-source.schema.yaml`; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Inputs and source gate

Require an aligned reporting request and an approved source bundle containing artifact IDs, versions, owners, lifecycles, semantic authority, authority scopes, intended uses, and reporting-snapshot approvals when applicable.

Apply this precedence:

1. Use the canonical artifact for the relevant authority scope.
2. Use supporting artifacts only with their provenance.
3. Use derived artifacts only as presentation or visual references, never as the sole support for a semantic claim.
4. Exclude transient and unregistered material.
5. Use `Superseded` or `Archived` material only for an explicit historical comparison.

A `Working` artifact may inform planning. Before baselining the report source, require that exact version to be `Baselined`, `Released`, or explicitly approved as a reporting snapshot by the owning or root orchestrator.

Complete the source gate when every material content block has eligible evidence or a visible gap and no unresolved conflict is hidden.

## Build the source

1. Record report identity, type, audience, purpose, period, `as_of`, confidentiality, scope, and requested channels.
2. Freeze the source snapshot with artifact IDs, versions, owners, authority, lifecycle, use, and approval references.
3. Record included and excluded coverage and unresolved gaps.
4. Organize sections and stable content-block IDs.
5. Classify each block as `fact`, `metric`, `estimate`, `interpretation`, `recommendation`, `projection`, `decision-request`, `risk`, or `next-action`.
6. Add source references to facts, metrics, estimates, interpretations, recommendations, and projections. Ensure at least one cited source has semantic authority and an eligible lifecycle or snapshot approval.
7. Record channel-neutral visual intent only when evidence benefits from a chart, table, diagram, or other visual. Leave pagination, slide structure, and layout to renderers.
8. Validate `report-source.yaml` against the schema and reconcile duplicate or unresolved IDs.
9. Obtain explicit semantic approval before changing lifecycle from `Working` to `Baselined`.

Do not render Markdown, DOCX, PDF, or PPTX here. Do not let a summary or recommendation silently become an upstream decision.

## Conflict and revision handling

When sources disagree, identify the affected block, artifact IDs, versions, authority scopes, and owners. Block that block or the full baseline according to materiality, and route correction to the source owner.

When a renderer or manual edit reveals a semantic change, revise this source through a new version, obtain approval, mark previous derivatives stale, and regenerate them. Reuse stable IDs for unchanged meaning.

## Result

Return a valid `stage_result` containing the report-source artifact, source and traceability deltas, stale derivatives, blockers, warnings, required approvals, and the requested renderer as the next action. Standalone execution never updates global state or the artifact index.
