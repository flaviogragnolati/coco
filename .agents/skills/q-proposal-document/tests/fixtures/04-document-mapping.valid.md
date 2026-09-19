---
schema_version: "1.0"
artifact:
  artifact_id: commercial-document-mapping
  creation_mode: authored
  semantic_authority: supporting
  version: "1.0"
  lifecycle: Working
source:
  artifact_id: proposal-source
  path: proposal-source.valid.json
  version: "1.0"
  sha256: 4241869b244afb5798a2e23f6df535cf26b430da8b6ffb616c48268d0bdbb60b
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
  output_basename: q-proposal-test
  pdf_required: false
decisions:
  - id: DOC-001
    description: Keep the technical appendix out of the draft.
    source_refs: [DEC-001, DEC-002]
---

# Commercial document mapping

This fixture carries presentation decisions only.
