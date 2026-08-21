# Accessibility and governance contracts

Load this when defining or evolving the accessibility contracts, the documentation and ownership model, or the versioning, deprecation, and migration rules of the design system.

## Turn the target into contracts

`q-plan-tech-foundation` owns the selected accessibility target. `WCAG 2.2 Level AA` is the default for a web product; a contract, regulation, or platform may require another level, and a non-web product adds its own platform standards instead of inheriting WCAG as universal coverage. Record the target and its source, then express it as reusable requirements that a component contract can actually carry:

| Contract | Define |
|---|---|
| Semantics | Which native element or role each pattern uses, and when a composite pattern is permitted. |
| Keyboard | Reachability, activation, and traversal order for every interactive pattern. |
| Focus | Where focus starts, moves, returns, and is trapped, and how the indicator remains visible against every theme. |
| Contrast and signalling | Minimum ratios by role, and the non-colour signal that accompanies any state carried by colour. |
| Motion | The reduced-motion behaviour of each animated pattern. |
| Target size | The minimum interactive size and the spacing exception that applies. |
| Alternative content | Requirements for images, icons, media, and decorative assets. |
| Errors and help | Where messages appear, how they are announced, and how they associate with their control. |

Bind each contract to the token set where the values live — contrast pairs and focus indicators are token decisions, not prose. Attach the applicable contracts to each component and pattern rather than keeping one detached list.

## Declare the evidence, not the outcome

Name the evidence expected later and its owner: which automated checks run, which manual checks a human performs, and which assistive-technology paths matter for this product. Planning never states that the product is conformant, accessible, or compliant. Implementation and QA gather conformance evidence against running software; this artifact only makes the requirement checkable.

## Size the governance to the product

Governance that nobody executes is worse than none. Scale it to the number of builders, consumers, and platforms.

| Product shape | Proportional governance |
|---|---|
| One team, one product | Contribution and change recorded in the specification's own version history; an owner named for the system. |
| Several teams or products | A named owner per area, a documented proposal and acceptance path, and a defined review cadence. |
| Shared library, multiple brands, or external consumers | The above plus a published release and deprecation policy, consumer notification, and a supported-version window. |

Record documentation location and ownership, who accepts a change, and how an exception is requested and recorded. An exception that was accepted is part of the contract; an exception that was merely tolerated is drift and belongs in open issues.

## Version, deprecate, migrate

Version the specification and the token set independently but reference them together. Classify each change so consumers know what it costs them:

- **Additive** — a new token, component, pattern, or optional variant. Consumers adopt it when ready.
- **Behavioural** — a changed state, contract, default, or accessibility requirement. Consumers must review the affected surfaces.
- **Breaking** — a removed or renamed token or component, or a changed value semantic. Consumers must migrate.

Every deprecation carries a replacement, a reason, and the affected surfaces; a deprecation without a replacement is a removal in disguise. Every breaking change carries a migration path: what changes, where it applies, and how a consumer verifies it is done.

Migration and adoption work leaves this stage as downstream needs. `q-plan-backlog` assigns priority, sequence, and dates; this artifact never does.

## Complete the governance definition

The governance definition is finished when the accessibility target and its source are explicit, every contract is bound to a component or pattern and to the tokens carrying its values, the expected evidence has an owner, the change classification and deprecation rules are stated, and every migration need has left as a downstream item without priority attached.
