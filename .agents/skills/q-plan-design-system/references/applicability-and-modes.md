# Applicability and modes

Load this when the design-system route is unclear, when the stage runs standalone, or when an existing system must be classified. It refines the disposition; it does not change the ownership boundary in `SKILL.md`.

## Decide applicability

The stage needs one durable visual interface plus at least one reusable-design pressure. Test both.

| Signal | Applies |
|---|---|
| Several screens, modules, or features repeat layout, state, or interaction patterns | Yes |
| Roles, permissions, or lifecycle produce differentiated visual states | Yes |
| More than one builder, team, product, brand, or platform consumes the interface | Yes |
| An internal or third-party system must be adopted or reconciled | Yes |
| Legacy UI is visibly fragmented or inconsistent | Yes |
| Theming, white-label, responsive, accessibility, or localization cuts across features | Yes |
| Components, tokens, or patterns need versioning and migration | Yes |
| Headless API, worker, batch job, infrastructure, or a library with no visual surface | No |
| CLI or another non-visual interface | No |
| Throwaway prototype whose output is discarded | No |
| An interface small enough that `04-application-standards.md` already covers it | No |

A `No` product needs an explicit record, not silence: return the assessment, its deciding signal, and `q-plan-backlog` as the next action.

Distinguish three outcomes and never merge them:

- **not applicable** — the criteria exclude the product; `design_system_ref` stays null.
- **accepted omission** — the criteria apply and the user declines; the orchestrator records a decision and, when the interface is large or shared, a risk.
- **executed** — the stage ran and authored both artifacts.

When the criteria are genuinely borderline, scale the work instead of skipping it: a small interface can be served by a short specification and a minimal token set, and that remains an execution.

## Select the mode

Classify from observed evidence, not from ambition.

### initial-definition

No prior tokens, components, or brand system exist. Define the first contract from product intent, confirmed brand sources, and evidenced feature needs. Keep the first version deliberately small: the inventory covers what features already require, and later rounds extend it.

### adopt-and-reconcile

An internal system or a third-party library such as a component kit or a published design language is already selected or in use. The technical foundation owns that selection; this stage maps it.

Record for each area: what the external system already decides, what the product overrides, what it extends, and which exceptions were accepted and why. Do not restate the upstream system's documentation, and do not silently fork its semantics — an override without a recorded reason is drift.

### evolve-and-migrate

Tokens, components, or patterns exist but are fragmented, duplicated, or inconsistent. Audit the current state first, then define the target contract, then define the migration.

Record the observed inventory with locations, the consolidation decisions, the deprecations with replacements, and the migration sequence. Migration work leaves as downstream needs for `q-plan-backlog`; it never carries priority or dates from here.

## Complete the assessment

The assessment is finished when the disposition, its deciding signal, the selected mode, and the evidence behind that mode are explicit, and when a `No` outcome names the next action rather than leaving the route open.
