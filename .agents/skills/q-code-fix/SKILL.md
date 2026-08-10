---
name: q-code-fix
description: "Apply a guarded minimal fix in a codebase when the cause and correction are already confirmed. Use for a narrow defect with a clear diagnosis; escalate to q-code-debug when investigation is needed or to refinement when behavior or architecture must change. Part of the Quasar AI delivery skills."
---

# Simple fix

Load the repository's instructions, applicable technical foundation, and actual verification commands before editing.

## Procedure

1. Confirm the reported cause in the real code.
2. Map the blast radius and must-not-break behavior.
3. Stop if the correction crosses modules, changes a contract, or requires product or architecture decisions.
4. Apply the smallest complete fix.
5. Add or update regression coverage.
6. Run focused tests and other proportional checks discovered from project configuration.
7. Run the required mini review.
8. Update the original durable execution record.

Do not use this path to hide a feature or design change. Use `q-code-debug` when the cause is uncertain. Keep internal notes transient.
