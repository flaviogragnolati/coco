---
schema_version: "1.0"
artifact:
  artifact_id: commercial-document-mapping
  creation_mode: authored
  semantic_authority: supporting
  version: "0.1"
  lifecycle: Working
source:
  artifact_id: proposal-source
  path: docs/proposal-workflow/working/proposal/02-proposal-source.yaml
  version: <proposal-version>
  sha256: <64-character-sha256>
document:
  mode: draft
  audience: internal
  include:
    alternatives: auto
    technical_solution: auto
    general_terms: false
    signatures: auto
    change_control: auto
  general_terms_ref: null
  output_basename: <client>-<project>-v<version>
  pdf_required: false
decisions: []
---

# Commercial document mapping

## Purpose

Record presentation decisions for the DOCX/PDF channel without duplicating or overriding canonical commercial content.

## Audience and use

- Audience:
- Use context:
- Review status:

## Section decisions

Record only decisions that are not already determined by the canonical source.

## Legal and acceptance decisions

- General terms authorization:
- Signature controls:
- Legal review state:

## Visual decisions

- Reference used: `q-proposal-document/assets/reference.docx` (path relative to the skill installation, not to the project repository)
- Exceptions to the standard style:

## History

| Version | Date | Decision | Source references |
|---|---|---|---|
