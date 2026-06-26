---

name: handoff
description: Compact the current conversation into a structured handoff document for another agent to continue the work with full operational context.
argument-hint: "What should the next session focus on?"
---

Write a structured handoff document summarizing the current conversation so a fresh agent can continue the work effectively.

Save the handoff document inside a `tmp` folder within the current workspace, not in the user's OS temporary directory and not outside the workspace.

Use a clear filename such as:

`./tmp/handoff-<topic>.md`

If the `tmp` folder does not exist, create it before saving the document.

The handoff document must be concise but operationally complete. It should capture the useful outcome of the session, not reproduce the full conversation.

Do not duplicate content already captured in other artifacts, including PRDs, plans, ADRs, issues, commits, diffs, schemas, tickets, generated documents, or technical references. Reference those artifacts by path, URL, issue number, PR, commit, document name, or other stable identifier instead.

Redact any sensitive information, including API keys, passwords, secrets, tokens, private credentials, personally identifiable information, or confidential business data.

Where redaction is necessary, replace the sensitive value with a clear placeholder such as:

`[REDACTED_SECRET]`

`[REDACTED_TOKEN]`

`[REDACTED_PERSONAL_DATA]`

If the user passed arguments to this skill, treat them as the intended focus of the next session and tailor the handoff accordingly.

Include the following sections:

## 1. Purpose of the next session

Summarize what the next agent is expected to do.

Include:

* Target outcome
* Scope of the continuation work
* Intended use of the next response or artifact
* Any specific focus provided by the user as arguments

## 2. Conversation context

Summarize the relevant context gathered during the session.

Include only information that helps the next agent continue the work, such as:

* Business or policy context
* Product context
* Technical context
* Architectural context
* Data or model context
* User goals and preferences
* Relevant assumptions
* Constraints discovered during the session

Do not include irrelevant side discussion or conversational filler.

## 3. Current state of the work

Describe what has already been done.

Include:

* Documents, files, plans, drafts, code, or artifacts already generated
* Important changes already applied
* Partial progress
* What remains incomplete
* Any known mismatch between the user's requested outcome and the current artifact state

## 4. Decisions already made

List confirmed decisions from the conversation.

For each decision, include:

* Decision
* Rationale
* Known implications for the next step

Do not reopen settled decisions unless there is a clear contradiction, missing dependency, or risk.

## 5. Requirements extracted

List requirements that the continuation work must satisfy.

Group requirements where useful, for example:

* Functional requirements
* Technical requirements
* Operational requirements
* Data or model requirements
* Security or compliance requirements
* UX or product requirements
* Documentation requirements
* Delivery or process requirements

## 6. Constraints and non-goals

Capture explicit boundaries and forbidden approaches.

Include:

* Technical constraints
* Architectural constraints
* Tooling constraints
* Business or policy constraints
* Time or delivery constraints
* Things the next agent must not include
* Approaches the user explicitly rejected

## 7. Open questions and unresolved points

List questions or ambiguities that remain unresolved.

Clearly distinguish between:

* Blocking questions
* Non-blocking questions
* Optional refinements

For each item, briefly explain why it matters and what the next agent should do with it.

## 8. Risks, tradeoffs, and sensitive areas

Summarize risks surfaced during the conversation.

For each risk, include:

* Risk
* Why it matters
* Possible mitigation or consideration for the next step

Include technical, operational, business, legal, security, delivery, or stakeholder risks where relevant.

## 9. Relevant artifacts and references

Reference existing artifacts instead of duplicating their contents.

Include, where available:

* File paths
* Document names
* URLs
* Issue numbers
* PRs
* Commits
* Schemas
* Plans
* ADRs
* Generated outputs
* Uploaded files used as source material

For each reference, briefly state why it matters.

## 10. Suggested next steps

Provide a concrete continuation path for the next agent.

Include:

* Immediate next actions
* Recommended order of execution
* Any checks or validations needed before proceeding
* Expected deliverables
* Criteria for considering the next step complete

## 11. Suggested structure for the next output

Give the next agent a recommended outline for the next artifact or response.

Tailor the outline to the user's intended next step.

For example, if the next session should produce an implementation plan, include a suggested implementation plan structure. If the next session should continue drafting a document, include a suggested document structure.

## 12. Suggested skills

Suggest skills the next agent should invoke.

For each suggested skill, include:

* Skill name
* Why it is relevant
* When to invoke it

Only suggest skills that are actually useful for the next step.

## 13. Redactions and sensitivity notes

Document any redactions made.

Include:

* What type of information was redacted
* Placeholder used
* Whether the next agent should request the original value from the user if needed

Do not expose secrets, tokens, credentials, or unnecessary personal information.

## 14. Agent instructions for the next step

End the handoff document with explicit instructions to the next agent.

The instructions must state that the next agent should:

* Use this handoff document as the source of continuity
* Avoid re-litigating settled decisions unless necessary
* Clearly call out any assumptions it introduces
* Prefer referencing existing artifacts instead of duplicating them
* Preserve the user's stated constraints and preferences
* Produce the requested next output directly when enough information is available
