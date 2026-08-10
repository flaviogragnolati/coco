---
name: q-review-docs
description: "Audit persistent project documentation and durable workflow artifacts for drift, contradictions, broken references, lifecycle or authority errors, traceability gaps, and divergence from authoritative sources or observable implementation. Use for targeted, collection, or extended active-docset QA before a baseline or release, after upstream change, or whenever documentation health is in question; return a read-only transient diagnostic and route remediation to the owning workflow. Do not use for the Quasar workflow package itself; route package documentation to q-maint-ai-workflow. Requires the q-core-contract companion."
---

# Audit docs

Diagnose durable project documentation without changing source artifacts, creating a report file, or writing workflow state or the artifact index. Return findings as transient QA context; keep document ownership and change history with the workflow that owns each artifact.

Read the `q-core-contract` companion for shared governance; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`. Before inspecting the requested material, determine whether the target is this workflow package's documentation, contracts, skills, or metadata. If it is, stop and route the request to `q-maint-ai-workflow`; do not produce an `q-review-docs` diagnostic for the package.

## 1. Lock scope and baseline

1. Confirm that the target belongs to a project rather than this workflow package, then read the nearest repository instructions and the user's review objective.
2. Load `00-artifact-index.yaml`, `00-workflow-state.yaml`, and applicable decisions, risks, change requests, and baselines when they exist. If no artifact index exists, accept explicit durable paths and report the resulting coverage limitation.
3. Choose one scope:
   - **targeted:** one artifact plus its direct sources and consumers;
   - **collection:** one related document family or workflow slice;
   - **integral:** every active durable documentation artifact in the requested project scope.
4. Include authored Markdown, structured sources, ADRs, plans, proposals, mappings, acceptance records, and other durable artifacts whose job is to preserve meaning for people or agents. Use state and index files as coordination evidence rather than documentation targets.
5. Exclude transient notes, previous audit diagnostics, and `Superseded` or `Archived` artifacts unless they are needed to validate an active reference or the user explicitly includes them.

Complete this step when the target IDs or paths, exact versions or repository baseline, review mode, inclusions, exclusions, and evidence limitations are explicit.

## 2. Map authority and dependencies

For every target, resolve its artifact ID, owner workflow and skill, creation mode, semantic authority and scope, lifecycle, version, source references, and direct downstream consumers. Reconcile these declarations with the workspace rather than assuming that an index entry is current.

Distinguish product or commercial meaning from observable implementation facts. Use code, configuration, tests, schemas, and generated outputs to verify claims about implemented behavior, but do not let implementation silently redefine canonical intent.

Complete this step when every target has a traceable owner and source chain or a named governance gap, and the dependency slice is sufficient to detect downstream drift.

## 3. Run the extended diagnostic

Apply every relevant lens across the declared scope:

- **Structural integrity:** missing files, invalid syntax or schema, broken links or anchors, unresolved references, malformed diagrams, and unusable generated mappings.
- **Identity and inventory:** conflicting IDs, paths, owners, versions, lifecycle states, source references, or unregistered durable artifacts.
- **Authority and provenance:** duplicated truth, derived material acting as canonical, unsupported claims, missing generation provenance, or authority that exceeds its declared scope.
- **Semantic consistency:** contradictions, mismatched terminology, units, enumerations, status, commitments, requirements, decisions, or assumptions across connected artifacts.
- **Freshness and implementation alignment:** upstream changes not reflected downstream, stale descriptions of observable behavior, obsolete aliases, placeholders, unresolved TODOs, or documentation for removed capabilities.
- **Coverage and usability:** missing invariants, decisions, risks, acceptance criteria, operational constraints, or handoff information that a named downstream consumer needs to act safely.
- **Lifecycle and change control:** in-place mutation of baselined or released meaning, missing version transitions, stale derivatives, or material changes absent from the owning workflow's history.

Run repository-provided parsers, schema checks, link checks, or documentation linters when they apply. Inspect rendered deliverables only for source fidelity and provenance; route layout and visual-quality defects to the renderer that owns that format.

Complete this step when every applicable lens has either inspected evidence or an explicit coverage gap, and no claim relies only on absence, intuition, or a stale summary.

## 4. Qualify findings

For every finding provide:

- a stable finding ID and category;
- severity (`blocker`, `high`, `medium`, or `low`) and confidence;
- exact target and authoritative evidence locations;
- the contradiction, breakage, or failure mode;
- concrete downstream impact;
- owning workflow or skill and the fitting remediation route;
- affected artifact IDs, including stale candidates.

Separate confirmed defects from risks and optional improvements. Report style only when it makes meaning ambiguous, breaks navigation, or raises a concrete maintenance risk. Deduplicate symptoms under their common cause and do not inflate severity to reward breadth.

Complete this step when every retained finding is reproducible, owner-routable, impact-ranked, and supported by the authority chain established above.

## 5. Return transient diagnostic

Return the diagnostic in the conversation as transient context. Include:

1. outcome and executive summary;
2. scope, baseline, exclusions, and coverage limitations;
3. findings ordered by severity;
4. cross-artifact themes and stale candidates;
5. checks completed without findings;
6. remediation order grouped by owning workflow or skill;
7. one next recommended action.

Do not create or register an audit artifact, update source documentation, change workflow state or the artifact index, or claim stage or release completion. In orchestrated use, the caller may use the transient findings to choose the next route but must not present them as durable acceptance evidence.

Route each approved remediation as a separate task to the artifact owner. Record any later implemented documentation change through the owning workflow's existing changelog or change-control record; when none exists, use the authoritative artifact's version history rather than creating an audit-owned log.

Complete the audit when the declared scope is exhausted, remaining uncertainty is explicit, each actionable finding has one owner, and the user has one truthful next action.

## Boundaries

Use `q-code-explore` for document orientation, `q-review-comments` for comments and docstrings, `q-review-codebase` for integral technical quality, and the owning renderer for visual QA. Use this skill only for extended QA of durable project documentation and its authority graph.
