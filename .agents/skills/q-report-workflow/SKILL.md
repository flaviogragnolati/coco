---
name: q-report-workflow
description: "Orchestrate sequential Quasar reporting from versioned project artifacts into an approved structured source and requested Markdown, DOCX, Marp, HTML, PDF, image, or PowerPoint channels. Use for progress, feature, milestone, release, completion, consulting, executive, or custom report types, including a market-research content profile with typed evidence refs, cross-workflow traceability, root-writer reconciliation, channel QA, and explicit release approval. Requires the q-core-contract companion."
---

# Reporting workflow

Coordinate one reporting run from an approved source snapshot through requested channel releases. Keep `q-report-source` as the single semantic source; do not author report meaning inside this orchestrator or a renderer.

Reporting is optional and does not change the completion criteria of the workflow that supplies its sources.

Read the `q-core-contract` companion for shared governance and its `references/routing.md` for workflow routes before routing; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Root orchestration

Identify the root orchestrator before writing project state:

- When another workflow delegates reporting, inherit its `root_orchestrator`, `global_state_writer`, and `return_to`, and write under the caller's artifact root in `reporting/`. Return a composite delta with `global_state_updated: false`; the root validates and reconciles it.
- When reporting is the directly invoked project workflow, act as root and remain the only writer of `00-workflow-state.yaml` and `00-artifact-index.yaml`; this run's artifacts and both files live under `docs/reporting-workflow/`.

Never let a delegated reporting run replace or discard the caller's stage state.

## Inputs

Require or align:

- `reporting_request`: report ID, type, content profile, project, audience, purpose, reporting period, `as_of`, scope, confidentiality, language, and requested channels and formats;
- `source_bundle`: explicit artifact IDs, versions, owners, lifecycles, authority scopes, intended uses, and any reporting-snapshot approval;
- `orchestration_context`: root workflow, root orchestrator, global state writer, and return target;
- current workflow state and artifact index when the run belongs to a project.

Resolve paths through the artifact index. Treat IDs and versions, not paths, as source identity. Load only the sources needed for the requested report scope.

## Report types and source patterns

Use these report types to select candidate sources, then obtain explicit source-bundle approval:

| Type | Typical sources |
|---|---|
| Progress | workflow state, backlog, feature index, durable execution records, decisions, risks, and available validation |
| Feature | feature definition, plan or ticket, implementation evidence, verification, and reviews |
| Milestone | backlog, milestone deliverables, validation, dependencies, and risks |
| Release | release candidate, release evidence, integral validation, delivery manifest, and release notes |
| Completion | accepted proposal commitments, deliverables, acceptance evidence, and delivery manifest |
| Consulting | discovery brief, accepted proposal, engagement plan, current-state assessment, intervention design, acceptance record, and the `execution-release` (approved execution results) |
| Executive or custom | the smallest approved source set supporting the stated decision or communication objective |

## Content profiles

`general` preserves the existing source pattern. `market-research` organizes approved Research Baseline, Findings Register, Market Analysis `published_results`, and synthesis refs without changing `report_type`. It may include an executive synopsis, market definition, evidence and methodology, sizing and reconciliation, demand and customers, market dynamics, competition, forecast and sensitivity, regulation, risks/implications/options, limitations, and auditable appendices only when requested and supported.

For `market-research`, require exact typed evidence refs and approved snapshot versions. Reporting communicates qualifiers and unresolved reconciliation; it never searches, processes raw survey responses, recalculates market values, or treats a derived export as sole support.

## Sequential flow

1. Align the reporting request and orchestration context.
2. Resolve candidate artifacts and obtain explicit approval of the source bundle and reporting cutoff.
3. Validate source versions, lifecycle, authority, coverage, and contradictions.
4. Route semantic work to `q-report-source` and validate its `stage_result`.
5. Obtain explicit approval before treating the report source as `Baselined`.
6. Run the requested renderers sequentially against that exact source version:
   - `q-report-document` for Markdown, DOCX, and report PDF;
   - `q-report-deck` for an editable Marp source bundle and requested HTML, PDF, standard Marp PPTX, image-set, or native object-editable PPTX outputs.
7. Validate each renderer result and its content, provenance, and render-based QA evidence.
8. Obtain release approval, create an immutable `reporting-release.yaml` referencing exact source and output versions, and keep publication or external sending separately approval-gated.
9. Reconcile state and index when root; otherwise return the composite delta to the root orchestrator and preserve `return_to`.

Complete the flow only when every requested channel has a truthful released, partial, or blocked status and all completed channels reference the same baselined report source.

## Source and change rules

Use a `Working` source only for planning until its exact version is baselined or explicitly approved as a reporting snapshot. Mark progress reports with their reporting period and `as_of`; never imply completion from an in-progress snapshot.

If canonical sources conflict, block the affected claim and return the inconsistency to the owning skill. Reporting may communicate recommendations, but an accepted change to scope, commitments, priority, or project truth returns to the upstream owner through change control.

When an upstream version changes after rendering, mark affected report channels stale and regenerate them from a newly approved report source version.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Authoring report meaning in the orchestrator | The coordinator writes conclusions instead of routing `q-report-source`. | Delegate semantic synthesis and reconcile its approved version. |
| 2 | Rewriting upstream truth through reporting | A report correction silently changes project status, commitments, or accepted scope. | Return the change to the upstream owner and regenerate from a new approved source. |
| 3 | Treating a renderer as a semantic editor | A slide or DOCX edit becomes the report's new meaning. | Route semantic edits to `q-report-source` and mark affected channels stale. |
| 4 | Calling a partial channel set complete | A requested DOCX, PDF, Marp source, HTML, image, or deck output is hidden because one renderer succeeded. | Preserve completed channels and require explicit partial-release approval or report the blocker. |
| 5 | Reporting recalculates research | The orchestrator derives a new market result from a CSV export. | Return the calculation to Market Analysis and report only promoted `published_results`. |

## Fallback and completion

Return a transient source-gap diagnostic when required evidence is missing. If one requested renderer is unavailable, preserve the approved report source and completed channels, but do not call the run complete without explicit approval of a partial release.

Finish with report and source IDs, requested and produced channels, validation evidence, release and publication status, blockers, reconciled state or composite delta, `return_to`, and one next action.
