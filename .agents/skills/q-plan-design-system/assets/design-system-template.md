# Design system specification

Use this structure for `docs/development-workflow/experience/05b-design-system.md`. Remove instructional text from the project artifact. Keep only the sections the product actually needs, and never copy a token value into this file.

## Artifact control

Record artifact ID, lifecycle, version, `as_of`, owner skill, selected mode, the exact source artifact versions loaded, and the prior version or supersession relationship.

## Applicability and scope

State the applicability disposition and the deciding signal, the selected mode and its evidence, the platforms and surfaces in scope, and the explicit exclusions. Name what this artifact does not decide and which owner does.

## Brand, existing system, and art direction

Record the authorized brand and art sources with their exact versions or locations, what each one already decides, and what remains undecided. For `adopt-and-reconcile`, record the adopted system, its version, and the overrides and extensions accepted.

| Source ref | Kind | Authority | Applies to | Accepted overrides or exceptions |
|---|---|---|---|---|

Absent brand authority is an open decision, not a licence to choose. Record it and continue with what the confirmed sources support.

## Design principles

State each principle, what it means for a concrete design choice, and the product intent, user evidence, or brand source behind it. Drop any principle that would not change a real decision.

## Platforms, themes, and modes

Record the confirmed platforms, themes, modes, and variants, what triggers each one, and which contracts vary across them. Do not declare a theme the product has not confirmed.

## Token architecture

Describe the primitive, semantic, and component tiers, the naming convention, the alias rules, and the set or context structure. Describe the taxonomy only; the values live in the token set.

## Token set reference

| Field | Value |
|---|---|
| Token set artifact ID and version | |
| Path | `docs/development-workflow/experience/05b-design-tokens.json` |
| Format target and version | |
| Validation command and tool version | |
| Validation result | `validated` or `unverified` with the exact reason |
| Coverage summary | Groups and contexts present, and known gaps |

## Component and pattern inventory

Give every entry a stable ID and trace it to the need that justifies it. Do not list a component no evidenced need requires.

| ID | Name | Kind | Purpose | Derived from | Status |
|---|---|---|---|---|---|

Use `component` or `pattern` for kind and `defined`, `adopted`, `extended`, `deprecated`, or `proposed` for status.

## Contracts per entry

For each inventory entry record purpose and usage boundary, variants, states, composition and slots, content and copy rules, interaction behaviour, applicable accessibility contracts, the semantic tokens it consumes, and accepted exceptions. Reference feature specs for per-feature behaviour instead of restating it.

## Accessibility contracts

Record the selected target and its source, then the reusable requirements and the evidence expected later with its owner. State no conformance claim.

| Contract ID | Requirement | Applies to | Expected evidence | Evidence owner |
|---|---|---|---|---|

## Responsive, content, and localization

Record breakpoints and density rules, layout and overflow behaviour, iconography and illustration and media rules, tone and content conventions, and localization constraints such as text expansion, direction, and formatting. Keep only what is genuinely reusable.

## Coverage

Map every relevant journey, requirement, or feature surface to a contract, a recorded exception, or a deliberate open issue. An unmapped surface is an open issue, not an omission.

| Journey, requirement, or feature ref | Surface | Covering contract IDs | Exception or open issue |
|---|---|---|---|

## Documentation and governance

Record where the system is documented, who owns each area, how a change is proposed and accepted, how an exception is requested, and the review cadence. Keep it proportional to the number of builders and consumers.

## Versioning, deprecation, and migration

Record the change classification in use, the deprecation policy with replacements, the adoption expectation for consumers, and the migration path for any breaking change. Assign no priority or date.

## Decisions, risks, exceptions, and open issues

List stable IDs, evidence, owner, consequence, required approval, and the stage that must resolve each open item.

## Downstream needs for backlog

State the build, adoption, and migration work this system implies, with its dependencies and the surfaces it unblocks. `q-plan-backlog` owns priority, sequence, and dates.

## Change history

For each version, record the trigger, changed contract or token IDs, approval reference, the token-set version it pairs with, affected downstream artifacts, and superseded versions. Do not use this section as a work diary.
