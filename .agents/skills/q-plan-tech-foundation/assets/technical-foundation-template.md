# Technical foundation

Use this structure for `docs/development-workflow/technical/02-technical-foundation.md`. Remove instructional text from the project artifact. Add detail only where a downstream decision or verification needs it.

## Artifact control

Record artifact ID, lifecycle, version, `as_of`, owner skill, source artifact versions, selected mode, and the prior version or supersession relationship.

## Product shape and evaluation criteria

Describe the product topology and lifecycle. Map every material constraint and NFR to a stable requirement or decision ID and state how it will be evaluated.

| Criterion ID | Requirement or NFR | Target or constraint | Source refs | Status |
|---|---|---|---|---|

## Recommendation and confirmed selection

State the workflow recommendation, the user-confirmed selection, `selection_source` (`workflow-recommendation`, `existing-codebase`, `user-proposed`, or `requirement-driven`), confirmation reference, rationale, and accepted trade-offs.

| Capability | Recommended candidate | Selected technology and version | Selection source | Rationale | Requirement or decision refs | Status |
|---|---|---|---|---|---|---|

Use `selected`, `rejected`, `not_applicable`, `existing_alternative`, `pending`, or `superseded` consistently. Record mutually exclusive choices, such as alternative ORMs, as separate evaluated candidates but only one selected default.

## Architecture drivers and compatibility

Explain how the selected profile satisfies each architecture driver. Record unsupported combinations, interoperability constraints, platform limits, migration consequences, and coverage gaps without restating ADR-owned decisions.

## Adopted technology guidance

Give every retained item a stable ID. Treat external documentation as supporting evidence and the confirmed project guidance as canonical only within this artifact's declared scope.

| Guidance ID | Kind | Applies to | Recommendation, pitfall, or antipattern | Consequence | Adoption status | Source refs |
|---|---|---|---|---|---|---|

Use `recommendation`, `pitfall`, or `antipattern` for kind and `adopted`, `waived`, `not_applicable`, `unverified`, or `superseded` for adoption status. State version applicability and any approved exception.

## Project commands and quality signals

Record only commands verified from repository configuration or executable help.

| Purpose | Command | Evidence source | Required at | Current status |
|---|---|---|---|---|

Cover build, focused and broad tests, static or type analysis when applicable, formatting or linting, migrations, security checks, packaging, and deployment validation in proportion to the project.

## Security, data, testing, and operations

Record the security and privacy baseline, data access and migration model, testing strategy and seams, environments, configuration and secrets, observability, recovery, deployment, scaling assumptions, and operational ownership. Reference canonical domain or architecture artifacts instead of copying their meaning.

## Alternatives, decisions, risks, and unresolved items

List stable IDs, evidence, owner, consequence, required approval, and the stage that must resolve each open item. Distinguish rejected alternatives from deferred evaluation.

## External reference register

| Source ref | Documentation owner | Title and precise URL | Applicable product version | Accessed at | Guidance IDs supported |
|---|---|---|---|---|---|

Prefer official documentation, specifications, first-party source, and vendor support policies. Mark the affected guidance stale when its selected technology version moves outside the recorded applicability.

## Change history

For each version, record the trigger, changed decision or guidance IDs, approval reference, affected artifacts, and stale or superseded versions. Do not use this section as an implementation diary.
