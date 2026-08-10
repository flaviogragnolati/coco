---
name: q-review-codebase
description: "Audit a codebase, module, feature, or release candidate against generic engineering standards, the project's versioned technical foundation, repository conventions, and applicable official technology guidance. Use for evidence-based integral quality assessment; not for one diff or for applying fixes. Part of the Quasar AI delivery skills."
---

# Codebase review

Produce a broad, evidence-backed quality audit without changing code. Use `q-review-code` for one diff and `q-review-comments` for comment quality alone.

## Establish review authority

Load:

- repository instructions, architecture, ADRs, product requirements, and application standards;
- the exact `technical_foundation_ref` when one exists, including adopted guidance IDs and source versions;
- [`references/generic-standards.md`](references/generic-standards.md);
- [`assets/report-template.md`](assets/report-template.md).

Inspect manifests, lockfiles, configuration, schemas, and executable help to identify technologies and real project commands. Apply only criteria whose capability and version are present. A recommended but unselected library is not a missing dependency or finding.

When a selected technology lacks current adopted guidance and its idiomatic use matters to the requested scope, consult current primary sources such as official documentation, specifications, first-party source, or vendor support policy. Cite the precise source and version in the report. If that evidence cannot be verified, continue with generic and repository-grounded criteria where safe and declare the technology-specific coverage gap; do not issue a full stack-specific approval.

Complete authority setup when every review lens resolves to a generic catalog ID, project guidance ID, repository convention, specification, or explicit coverage gap.

## Coverage

Review applicable evidence across:

- architecture and module boundaries;
- security, authorization, privacy, and data integrity;
- errors, resilience, observability, and operations;
- performance and scalability risks against accepted NFRs;
- maintainability, module depth, and testability;
- testing quality and critical-flow coverage;
- accessibility and user-state behavior when the product exposes a user interface;
- migrations, deployment, and delivery documentation;
- requirement and acceptance coverage for a release candidate;
- selected technology usage against adopted project guidance and current official sources.

Do not force a web, language, framework, ORM, state library, form library, component system, test runner, or package manager onto a project that did not select it.

## Evidence standard

Every finding must cite an exact location or reproducible artifact, describe the concrete failure mode, name the applicable standard or guidance ID, explain impact, propose a fitting remediation, and state confidence. Separate confirmed defects from risks, coverage gaps, and optional improvements.

Rank findings by severity and likelihood. Do not bury blockers under style observations or treat a package recommendation as an accepted project rule.

## Procedure

1. Lock scope, baseline, technical foundation version, and review criteria.
2. Map relevant architecture, flows, data, selected technologies, and verification commands.
3. Inspect evidence across applicable generic, project, and technology-specific lenses.
4. Cross-check findings to remove duplicates, version mismatches, and unsupported claims.
5. Produce the Markdown audit using the report template and record coverage by lens.
6. Summarize release blockers, high-priority findings, accepted risks, and generic or technology-specific coverage gaps.

Complete when every retained finding is reproducible and source-backed, every applicable selected technology is reviewed or named as a coverage gap, and the report identifies one truthful next action.

This report is supporting quality evidence. Integral acceptance remains an orchestrator decision reconciled with tests, UAT, security, deployment, technical-profile freshness, and other evidence.
