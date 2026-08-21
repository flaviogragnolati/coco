# Responsible AI in ideation

An assistant can supply prompts, reframings, counterarguments, and organization. It is not an expert panel, an evidence source, an ethics reviewer, or a decision maker. Multiple samples from one model are correlated products of one system, never independent corroboration.

## Default sequence

1. **Classify the information.** Decide whether the prompt would carry personal, client-confidential, unpublished, proprietary, regulated, or security-sensitive material. Record the classification in the register before any external call.
2. **Freeze the human round.** With human participants, capture and freeze the human-only candidates before showing any AI output.
3. **Define the AI role.** For example: produce orthogonal problem frames, challenge a stated assumption, list search vocabulary for an evidence request, or reformat an approved record.
4. **Use only an approved tool and data class.** A paid or "private" interface is not automatically an authorized environment.
5. **Record provenance.** Tool or model, date, purpose, whether the human-first round was frozen, which outputs were kept, and the human editor. Do not store restricted prompt text in the register.
6. **Verify externally.** Route every factual claim and every suggested source to an evidence request. Never cite the model as evidence.
7. **Run a second human round.** Ask for candidates outside the assistant's frames and for the stakeholders or harms it omitted.

If the material cannot be safely abstracted, use an authorized local environment or run the session without AI. When durable recording itself is not authorized, return the transient result and the governance gap.

## Bounded roles that are safe

Alternative phrasings of a non-sensitive decision statement; dimensions for a morphological matrix followed by human review; counterexamples and alternative explanations for registered candidates; ambiguous terms and missing assumptions; candidate search vocabulary, not references presented as real; format conversion of an approved record; one disclosed adversarial lens after human-first generation.

## Roles to refuse

Deciding which claim is true; certifying novelty, safety, legality, or compliance; inventing missing data or citations; ranking people or protected groups; replacing stakeholder participation or domain expertise; generating operationally harmful detail; reviewing confidential material in a system where confidentiality is not assured.

## Anchoring and homogenization

Assistant output can anchor participants on its examples and compress the diversity of a group's candidate set. A preregistered writing experiment found AI access raised average evaluated creativity while making outputs more similar in aggregate; the task was short creative writing, so treat homogenization as a credible risk to control, not a measured constant for ideation.

Controls: human-only generation first; different participants receiving different frames or none; explicit requests for candidates that contradict the assistant's dominant frame; comparison of assumptions and expected signals rather than wording; preservation of pre-AI candidates and a record of which changed after exposure; non-AI domain, operations, and stakeholder perspectives in the room.

## Automation bias

Fluency, technical detail, and confident formatting are not evidence. Hide model branding during candidate review when feasible, evaluate every candidate against the same predeclared criteria, require a human rationale and uncertainty statement, assign a non-originating human challenger, keep "no decision / insufficient evidence" available, and never advance a candidate on an AI or matrix score alone. Do not ask a model for a probability it cannot calibrate and then treat the number as measured uncertainty.

## `agent-only` sessions

Permitted when no human contributors are available for generation. Then:

- mark every candidate `ai-generated` or `ai-assisted` with tool and purpose;
- record no participant votes, no synthetic panel, and no independence claim;
- keep `participation_mode: agent-only` in the register and the snapshot;
- state in the limitations that no independent human generation occurred;
- keep the decision owner human — a snapshot still requires their approval.

## Confidentiality and integrity

Do not send personal data, unpublished or partner material, proprietary protocols or source code, controlled or export-restricted information, credentials, or community-governed data to an external service without an explicit authorization for that data class. Data minimization still applies with an approved tool.

If sensitive material or unverified AI content entered the session: stop further sharing, preserve the minimum audit information, notify the responsible owner, quarantine the affected candidates and claims, re-review the decisions they touched, and record the event in `deviations`. Do not conceal it by editing provenance.
