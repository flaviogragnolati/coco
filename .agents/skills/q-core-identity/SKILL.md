---
name: q-core-identity
description: "Shared Quasar identity and editorial companion for proposal, report, consulting, document, and deck skills. Read it when a Quasar-owned client-facing artifact needs the canonical company name, logo and palette rules, document or deck system, editorial standards, document-kind skeleton, or identity asset paths. It governs Quasar materials, never a client's product UI, and is a companion rather than a user entry point."
---

# Quasar identity companion

Provide one read-only source for Quasar's own brand, document, deck, and editorial rules. Inherit the caller's authority and write scope; author no project artifact, choose no client-product design decision, and expose no invocation surface.

## Read the narrow reference

| Need | Read |
|---|---|
| Company name, logos, palette, or non-negotiable brand treatment | [`references/identity.md`](references/identity.md) |
| Document geometry, typography, generation-font resolution, or provenance | [`references/document-system.md`](references/document-system.md) |
| Presentation composition, slide patterns, or deck QA | [`references/deck-system.md`](references/deck-system.md) |
| Voice, dates, units, visible IDs, estimate labels, confidentiality, or accessibility | [`references/editorial-standards.md`](references/editorial-standards.md) |
| Structure for a consulting deliverable | The matching file under [`references/document-kinds/`](references/document-kinds/) |

Use assets from `assets/`: eight official logos, document cover and header art, the regenerated DOCX reference, and the Marp theme and template. Resolve those paths from this companion; do not copy them into a consuming skill.

## Boundaries

- Keep canonical meaning with the proposal, report source, consulting artifact, or other caller. Identity changes presentation and editorial treatment only.
- Apply these rules to Quasar-owned client-facing materials. `q-plan-design-system` owns a client's product UI and never inherits this palette or typeface.
- Treat generated DOCX, PPTX, PDF, HTML, image, and Marp outputs as derivatives with the authority declared by their caller.
- If this companion is absent, the consuming skill stops and installs it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-identity`; never invent a substitute identity.

Complete use of this companion when the caller loaded only the references needed for its channel, resolved exact local assets, preserved source meaning and classification, and recorded the identity and generation provenance its output requires.

