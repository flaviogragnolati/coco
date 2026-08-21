---
name: q-ask-project
description: "Answer factual or explanatory questions about a project's intent, documentation, workflow state, decisions, and observable implementation by reconciling the smallest relevant evidence slice. Use when the user asks what is true now, how something works, why it exists, where it is defined, or whether a bounded project claim matches reality; run a conditional mini-grill before investigation when the question is materially ambiguous. Read-only part of the Quasar AI delivery skills; requires q-core-contract."
---

# Ask the project

Answer the user's question from project evidence and stop. Keep the result transient and read-only; do not turn a bounded question into a general audit, plan, or change.

Read the `q-core-contract` companion for shared authority, lifecycle, and state rules. If it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## 1. Align before investigation

1. Read the nearest repository instructions, but do not begin broad evidence gathering yet.
2. Form a working interpretation of the question: the target concept or claim, requested answer, project scope, relevant baseline or time, and important exclusions.
3. Test the interpretation with one concrete example when a term, boundary, or expected answer has more than one plausible meaning.
4. When the interpretation is clear, proceed without asking for confirmation and state only assumptions that could affect the answer.
5. When ambiguity is material, present the working interpretation and example, then ask the smallest useful set of questions in one short mini-grill. Ask only when the ambiguity would change the evidence inspected or could reverse the answer. Do not use alignment as routine ceremony.
6. If the user is unavailable, proceed with an explicit narrow assumption only when it is reversible and unlikely to mislead; otherwise stop with the unresolved question.

Complete alignment when one answerable question, scope, baseline, and expected depth are explicit, or a material ambiguity is waiting on the user.

## 2. Build the evidence slice

1. Start with the named target and search outward only as needed. Load `00-workflow-state.yaml`, `00-artifact-index.yaml`, and the exact artifact versions they reference when the question concerns workflow status, ownership, lifecycle, or accepted meaning.
2. Match the source to the claim:
   - use canonical authored artifacts, requirements, decisions, and baselines for intent or commitments;
   - use workflow state and the artifact index for coordination status and ownership;
   - use code, configuration, schemas, tests, commands, logs, and generated behavior for observable implementation;
   - use current primary external sources only when the answer depends on facts the project does not own.
3. Cross-check material claims against a second relevant source when one exists. Separate observed fact, project-declared intent, inference, and unknown.
4. Do not flatten disagreement. When documentation, state, and implementation diverge, name each claim, its authority scope, and the practical consequence.
5. Stop expanding the search when the collected evidence can answer the aligned question at the requested depth. Report inaccessible or stale sources as coverage limits instead of filling gaps from memory.

Complete investigation when every conclusion has a project or primary-source basis, relevant conflicts are visible, and remaining uncertainty cannot be resolved inside the agreed scope.

## 3. Answer and stop

Return the answer in the conversation as transient context. Lead with the direct answer, then provide only the evidence, reconciliation, and caveats needed to trust it. Point to useful files, artifact IDs and versions, observable behavior, or external primary sources without dumping the search trail.

Calibrate confidence to the evidence. Clearly label inferences and unknowns, and say what missing evidence could materially change the answer. Do not create a file, update project sources or workflow state, produce a plan, or begin remediation.

Complete the skill when the aligned question is answered, its evidence and limitations are inspectable, and no project or external state has changed.

## Boundaries

Use `q-ask-analyze` when the user proposes a change or option and wants fit, compatibility, benefits, risks, problems, downsides, or trade-offs. Use `q-code-explore` for a broad orientation pass, `q-review-docs` for a systematic documentation audit, `q-review-codebase` for a formal quality audit, and `q-code-research` when durable external research is the requested deliverable.
