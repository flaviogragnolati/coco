---
name: q-code-debug
description: "Diagnose and fix reproducible or hard failures in a codebase using evidence, ranked hypotheses, focused tests, and proportional project validation. Use when behavior is broken, failing, slow, flaky, or incorrect and the cause is not already confirmed. Part of the Quasar AI delivery skills."
---

# Debug

Load repository instructions, the current technical foundation when available, and the project's actual commands. Read `HARD-BUGS.md` when the failure is flaky, non-deterministic, performance-sensitive, or requires a substantial reproduction harness.

## Procedure

1. Pin the expected and observed behavior, environment, frequency, and smallest known trigger.
2. Establish a fast pass/fail signal with a focused test or disposable reproduction.
3. Trace the relevant flow, data, boundaries, and recent changes.
4. Form a small ranked hypothesis set; state evidence that would falsify each.
5. Test hypotheses before editing.
6. Apply the smallest correction that resolves the verified cause.
7. Add or update regression coverage.
8. Run the focused and broader checks discovered from project configuration; do not assume a language, test runner, or static-analysis tool.
9. Run the mini review required by the workflow.
10. Update the original durable execution record.

Use `q-code-fix` when the cause and correction are already confirmed. Escalate to refinement when the change alters product behavior, architecture, or a cross-module contract.

Do not treat a throwaway reproduction, scratchpad, or internal plan as a durable artifact.
