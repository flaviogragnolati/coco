---
name: grill-to-plan
description: Convert a grilling/discovery session into a structured handoff document for another agent to prepare an execution plan.
argument-hint: "What execution plan should the next agent prepare?"
---

Analyze the current grilling/discovery session and create a structured handoff document for another agent whose next task will be to prepare an execution plan.

Save the handoff document inside a `tmp` folder within the current workspace, not in the user's OS temporary directory and not outside the workspace.

Use a clear filename such as:

`./tmp/grilling-handoff-<topic>.md`

If the `tmp` folder does not exist, create it before saving the document.

The handoff document must be concise but operationally complete. It should capture the outcome of the grilling session, not reproduce the full conversation.

Include the following sections:

## 1. Purpose of the next execution plan

Summarize what the next agent is expected to plan, including the target outcome, scope, and intended use of the execution plan.

## 2. Context gathered during the grilling session

Summarize the relevant background, system context, business context, technical context, product context, constraints, and assumptions discovered during the session.

Do not include irrelevant conversation details.

## 3. Decisions already made

List confirmed decisions from the grilling session.

For each decision, include:

* Decision
* Rationale
* Any known implications for execution

## 4. Open questions and unresolved points

List any questions that remain unanswered or any areas where the next agent must make assumptions, request clarification, or define options.

Clearly distinguish between:

* Blocking questions
* Non-blocking questions
* Optional refinements

## 5. Requirements extracted

List the requirements that the execution plan must satisfy.

Group them where useful, for example:

* Functional requirements
* Technical requirements
* Operational requirements
* Data/model requirements
* Security or compliance requirements
* UX/product requirements
* Delivery/process requirements

## 6. Constraints and non-goals

Capture explicit constraints, forbidden approaches, boundaries, and anything that should not be included in the execution plan.

Include architectural, technical, business, time, process, or tooling constraints.

## 7. Risks, tradeoffs, and sensitive areas

Summarize the main risks surfaced during the grilling session.

For each risk, include:

* Risk
* Why it matters
* Possible mitigation or consideration for the execution plan

## 8. Relevant artifacts and references

Reference existing artifacts by path, URL, issue number, PR, commit, document name, or other stable identifier.

Do not duplicate content already captured in PRDs, ADRs, plans, tickets, issues, commits, diffs, schemas, or technical documents. Reference them instead.

## 9. Suggested structure for the execution plan

Give the next agent a recommended outline for the execution plan.

The outline should be specific to the subject of the grilling session and should help the next agent produce a useful plan directly.

## 10. Suggested skills

Suggest the skills the next agent should invoke.

For each suggested skill, include:

* Skill name
* Why it is relevant
* When to invoke it

## 11. Redactions and sensitivity notes

Redact any sensitive information, including API keys, passwords, secrets, tokens, private credentials, personally identifiable information, or confidential business data.

Where redaction is necessary, replace the sensitive value with a clear placeholder such as:

`[REDACTED_SECRET]`

`[REDACTED_TOKEN]`

`[REDACTED_PERSONAL_DATA]`

## 12. Agent instructions for the next step

End the handoff document with explicit instructions to the next agent.

The instructions should state that the next agent must use this handoff document to prepare an execution plan, avoid re-litigating already-settled decisions unless necessary, and clearly call out any assumptions it introduces.

If the user passed arguments to this skill, treat them as the intended focus of the future execution plan and tailor the handoff accordingly.
