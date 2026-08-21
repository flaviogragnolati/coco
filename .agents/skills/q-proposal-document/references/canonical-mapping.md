# Canonical proposal to document mapping

## Contents

1. Authority
2. Mapping rules
3. Supported canonical fields
4. Presentation decisions
5. Missing information
6. Terms authorization

## 1. Authority

Use `02-proposal-source.yaml` as the only semantic source. A narrative or review view may be consulted only through its exact artifact ID and version and never supplies a fact missing from the source. Treat the mapping, render model, DOCX, PDF, and validation report as non-canonical.

Do not map from a prior DOCX, PDF, email, or the bundled visual reference.

## 2. Mapping rules

- Preserve canonical object IDs in the derived render model and validation report.
- Prefer explicit fields over inferred formatting.
- Convert object lists into document sections without rewriting their meaning.
- Join a title and description only when both exist and are not duplicates.
- Preserve amounts, currencies, percentages, dates, durations, limits, and acceptance criteria verbatim.
- Omit an optional module when the source contains no applicable content.
- Record section inclusion and layout choices in `04-document-mapping.md`.
- Return semantic gaps or contradictions to `q-proposal-design`.

## 3. Supported canonical fields

The renderer accepts the schema required by Skill 2 and tolerates additional fields. Prefer these field names when authoring the canonical source:

| Document content | Canonical location |
|---|---|
| Client, project, dates, status, language | `proposal` |
| Problems, needs, objectives, scope, exclusions, deliverables | `objects` |
| Capabilities and requirements | `objects` |
| Alternatives, prices, payments, validity, terms, signatures | `commercial` |
| Methodology, stages, team, milestones, quality, acceptance | `delivery` |
| Document object selection | `downstream_interfaces.document.object_refs` |

The scripts recognize common aliases inside open `proposal`, `commercial`, and `delivery` objects, but aliases do not create authority. When an issued document cannot map a required field unambiguously, normalize the canonical source through `q-proposal-design`.

## 4. Presentation decisions

Allow the mapping to decide only:

- Draft or issued mode.
- Internal or client audience.
- Inclusion of optional alternatives and technical detail.
- Inclusion of signature controls.
- Inclusion of an authorized general-terms asset.
- Inclusion of canonical change-control content.
- Whether PDF is required.
- Output basename and mapping history.

Do not put copied proposal paragraphs, replacement amounts, alternative names, or override values in the mapping.

## 5. Missing information

For `draft`, record missing source information as warnings and keep the output internal. A draft may use localized `PENDING` markers only when the user explicitly requests a draft.

For `issued`, block on missing identity, version, issue date, validity, executive summary, objectives, scope, exclusions, assumptions, methodology, stages, deliverables with acceptance, team, schedule, investment, payments, or required terms.

## 6. Terms authorization

The bundled Spanish terms have identifier `quasar-general-terms-ar-es-v1`.

Include them only when both values match:

```yaml
# 02-proposal-source.yaml
commercial:
  terms:
    general_terms_ref: quasar-general-terms-ar-es-v1
```

```yaml
# Front matter of 04-document-mapping.md
document:
  include:
    general_terms: true
  general_terms_ref: quasar-general-terms-ar-es-v1
```

Treat a mismatch as a blocker. Keep particular clauses in the canonical source, not in the mapping.
