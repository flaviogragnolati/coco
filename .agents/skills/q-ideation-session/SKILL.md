---
name: q-ideation-session
description: "Facilitate a structured ideation session that turns one decision into a traceable candidate space: independent generation, explicit provenance, assumptions, clustering, predeclared criteria, transparent evaluation, adversarial review, non-compensatory gates, evidence requests, and an approved snapshot with per-candidate dispositions. Use for brainstorming, option generation, problem framing, opportunity and solution exploration, improvement-opportunity discovery over an existing product or service, workshop facilitation, strategic or intervention alternatives, research-direction ideation, and reopening options after new evidence. Supports scientific, product, consulting, and general profiles. It never investigates evidence itself, decides for the owner, or creates scope, requirements, architecture, or commitments; for one already-chosen option use the owning analysis, planning, or research skill instead. Part of the Quasar AI delivery skills; requires the q-core-contract companion."
---

# Structured ideation session

Produce one traceable ideation record for a named decision: what was considered, by whom, under which criteria and gates, what remains uncertain, and what the decision owner approved. Every candidate is a proposal, never evidence, scope, or a commitment.

Read the `q-core-contract` companion for shared governance, artifact authority, snapshot adoption, and `references/ideation-baseline.schema.yaml`; if it is missing, stop and install it with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract`.

## Declare the session

Fix these three dimensions before generating anything; they select the vocabulary, the gates, and the required rigor:

| Dimension | Values |
|---|---|
| `profile` | `scientific`, `product`, `consulting`, `general` |
| `intent` | `frame-problem`, `generate-options`, `stress-test-options`, `reopen-after-evidence` |
| `participation_mode` | `facilitated-human`, `solo-assisted`, `asynchronous`, `agent-only` |

Then record the decision, its owner, formal input artifacts by ID and version, in-scope and out-of-scope topics, constraints classified as real, assumed, negotiable, or unknown, the time horizon, and the information classification. Opportunity Discovery may also record one bounded transient orientation with its producer, inspected files or artifacts, scope, date, and limitations; it has `authority: none` and does not become an artifact.

Refuse to run a full session when the request is already a bounded decision with one credible option and an owner: name the owning skill instead. Refuse to record durable output when the classified information cannot be safely stored or abstracted; return the transient result and the governance gap.

Complete this step when the decision, owner, three dimensions, formal inputs and any allowed transient orientation, boundary, and information classification are explicit.

## Load only the needed route

| Load | When |
|---|---|
| [Method core](references/method-core.md) | Every session: perspectives, independent generation, structured sharing, structuring, and stop conditions. |
| [Scientific profile](references/profile-scientific.md) | `profile: scientific`. |
| [Product profile](references/profile-product.md) | `profile: product`. |
| [Opportunity discovery](references/opportunity-discovery.md) | `profile: product` and the session is an improvement-opportunity sweep over an existing product, service, or area. |
| [Consulting profile](references/profile-consulting.md) | `profile: consulting`. |
| [Evaluation and gates](references/evaluation-and-gates.md) | The session scores, compares, or gates candidates. |
| [Handoffs](references/handoffs.md) | The session disposes candidates, routes evidence requests, or hands a snapshot to another owner. |
| [Responsible AI](references/responsible-ai.md) | Any AI-assisted or `agent-only` generation, or sensitive information in scope. |
| [Sources](references/sources.md) | Someone challenges the method evidence or its limits. |

For `profile: general`, use the method core alone and borrow a profile's candidate kinds only when the session declares it.

## Optional current-state orientation

Inside Opportunity Discovery, call `q-ask-project` when `opportunity-discovery-needs-current-state-answer-from-accessible-project-context`. Treat its answer as transient orientation and `continue-with-user-supplied-current-state-context-or-stop-with-the-specific-orientation-gap` when the collaborator is unavailable.

Call `q-code-explore` when `opportunity-discovery-needs-bounded-code-structure-or-behavior-orientation`. Treat its result as transient orientation and `continue-with-user-supplied-code-orientation-or-stop-with-the-specific-code-context-gap` when unavailable. Either call may follow an explicit user request or an internal route decision, but remains read-only and may not broaden the session into investigation.

Record enough provenance for the durable register to identify the producer (`user`, `q-ask-project`, or `q-code-explore`), bounded question, inspected file, artifact, or session-context refs, observation date, and limitations. Do not invent an artifact ID or version for a conversation result. Reserve `reopen-after-evidence` for formal returned evidence with an exact artifact ID and version.

## Run the session

1. **Frame.** Write the decision statement, controllable levers, and non-controllable factors into the register.
2. **Map perspectives.** Record represented, affected-but-absent, and missing perspectives, conflicts of interest, authority asymmetries, and possible vetoes. Record an AI lens as `synthetic-lens`, never as a consulted stakeholder.
3. **Generate independently.** One candidate per record with a stable ID, at least one assumption and one uncertainty, original wording preserved, and explicit provenance. With human participants, freeze the human-only round before showing any AI candidate.
4. **Share without evaluating.** Round-robin, clarify without advocacy, then run a second independent round. Link every new candidate to what triggered it.
5. **Structure.** Cluster by a declared relation; log every merge and split; keep original candidates and minority formulations intact.
6. **Define criteria and gates.** Select three to seven weighted criteria with anchors and direction before any rating. Keep safety, privacy, legal and regulatory, ethics and equity, commercial authority, confidentiality, minimum capability, and non-negotiable incompatibility outside the score as gates.
7. **Evaluate independently.** Collect per-rater scores with reasons, low/base/high ranges, and explicit abstention or `not-assessable`. Show distributions, divergence, and weight sensitivity.
8. **Review adversarially.** For each finalist record the steelman, the condition that would refute it, alternative explanations, failure modes, harmed stakeholders, adoption risks, mitigations, residual uncertainty, and reversibility.
9. **Route evidence.** Convert every material unknown into an `evidence_request` with the affected candidates, the decision impact, and one recommended route. Never browse, cite, or change the candidate pool from unauthorized research.
10. **Dispose and freeze.** Give every candidate exactly one disposition — `advance`, `evidence-needed`, `prototype-needed`, `retain`, `defer`, or `stop` — with a rationale and, when it advances, one recommended owner and intended use. Obtain the decision owner's explicit approval, then freeze the snapshot.

Complete the session when every candidate has a disposition, every advancing candidate has an owner route, every gate has a result, unresolved assumptions and dissent are retained, and either an approved snapshot exists or the missing approval is named as a blocker.

## Durable outputs

| Output | Creation mode | Authority | Rule |
|---|---|---|---|
| `ideation-register` | authored | supporting for session provenance, candidate space, and raw assessments | Mutable across rounds; never copies Discovery, Product Core, Findings, or Proposal Source content that another owner already holds. |
| `ideation-baseline` | authored | canonical for the approved snapshot, dispositions, and handoff | Small: frozen register version, dispositions, criteria and gates applied, dissent, limitations, and the approval block. |
| `ideation-evaluation` | derived | none | Calculation and presentation only, with `decision: null`; raw scores and reasons stay in the register. |

All three are created `Working` and stay `Working` under this skill's ownership. The adopting workflow's root orchestrator registers the exact version and performs any lifecycle transition; this skill never writes `00-workflow-state.yaml` or `00-artifact-index.yaml`.

## Bundled offline CLIs

The scripts are deterministic, standard-library Python and make no network, database, or model call. Use them instead of hand-maintaining register structure:

```bash
python3 scripts/session_scaffold.py --help
python3 scripts/validate_register.py --help
python3 scripts/evaluate_matrix.py --help
python3 scripts/freeze_baseline.py --help
```

The register structure is [`references/ideation-register.schema.json`](references/ideation-register.schema.json), enforced by `validate_register.py` together with the cross-field rules: profile fit, resolvable refs, criteria before ratings, gates outside the score, disclosed AI use, and one routed disposition per candidate. It checks structure, never truth, novelty, feasibility, or approval.

`freeze_baseline.py` refuses to produce a snapshot without a valid register, a named decision owner, a disposition for every candidate, and an `approval` block. It stamps the fixed `lifecycle: Working` and never assigns a state of its own.

## Anti-patterns

| # | Anti-pattern | How it shows up | Correct behavior |
|---|---|---|---|
| 1 | Ideation as fictitious discovery | Invented client or user needs are recorded as evidence of a real problem. | Record them as `opportunity-hypothesis` or assumptions with `evidence_status`, and route confirmation to the evidence owner. |
| 2 | AI-first generation and synthetic panels | Model suggestions anchor the room before the human round, or simulated roles are counted as independent participants, votes, or corroboration. | Freeze the human-only round first and record AI output as one disclosed lens with tool, purpose, and human editor. |
| 3 | Score as decision | The weighted matrix names a winner without human judgment, qualitative review, or gates. | Present scores, intervals, and sensitivity as decision aids and require the owner's explicit disposition. |
| 4 | Erased alternatives and dissent | Merges delete original candidates, minority reasons, or abstentions. | Preserve originals with a merge log and carry dissent into the snapshot. |
| 5 | Embedded research | The session browses sources and rewrites the candidate pool without an authorized brief. | Emit `evidence_requests` with routes and reopen only under `intent: reopen-after-evidence` with the returned artifact version. |
| 6 | Snapshot as downstream truth | An `advance` disposition becomes scope, a requirement, an ADR, a research question, or a commercial commitment because the session ended. | Hand the exact snapshot version to the named owner and let its procedure and approval decide. |
| 7 | Ceremony and overreach | A bounded decision is forced through the full ten-phase session, or the session is presented as consulting diagnosis, validation, or execution. | Run only the phases the decision needs, or decline and name the owning skill. |

## Completion

Return a valid `stage_result` naming the register, snapshot, and evaluation artifacts with versions, the candidate dispositions, open evidence requests, gate results, retained dissent, limitations, required approvals, and one next action. In standalone mode return `global_state_updated: false` and `reconciliation_required: true`; adoption and any lifecycle transition belong to the consuming workflow; a standalone approval lives in the snapshot's `approval` block, and adoption exists only when an adopting root records it.
