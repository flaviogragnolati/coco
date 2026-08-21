# Method core

Shared procedure for every profile. Choose each method for a purpose; never stack methods to look rigorous. Every stage needs a stated purpose, an output, and a stop rule.

The best-supported classic finding is narrow: interacting face-to-face groups often produce fewer non-redundant ideas than the same people working independently, with turn-taking (production blocking) an important mechanism. That does not make independent work better for learning, integration, commitment, or selection. See [sources](sources.md).

## Choose the pattern by purpose

| Need | Pattern | Main caution |
|---|---|---|
| Broad initial candidate pool | Independent generation, then structured sharing | A larger pool is not a better decision |
| Equal participation and same-day prioritization | Nominal group technique | Votes show panel preference, not truth |
| Distributed judgment over several rounds | Delphi with controlled feedback | Consensus can stabilize around shared bias |
| Quantities for a decision model | Structured elicitation with ranges | Judgment does not replace evidence |
| Combinatorial option space | Morphological analysis | Combinations may be infeasible or meaningless |
| Reframing an existing concept | Assumption reversal, constraint ladder, SCAMPER | Prompt heuristics have context-dependent evidence |
| Stress-testing finalists | Premortem, red team, alternative explanations | Every challenge needs a response and an owner |

## Participation modes

| Mode | Run it as | Hard rule |
|---|---|---|
| `facilitated-human` | Live session with a facilitator and a fixed divergence window | Freeze the human-only round before any AI candidate is shown |
| `solo-assisted` | One human generating with an assistant | Record which candidates existed before assistance |
| `asynchronous` | Written rounds with controlled feedback between them | Report attrition and non-responses per round |
| `agent-only` | No human contributors available for generation | Mark every candidate `ai-generated` or `ai-assisted`; record no participant votes and no synthetic panel |

The facilitator discloses conflicts, does not offer a preferred answer first, prevents senior participants from dominating, and asks decision makers to contribute last.

## 1. Perspective map

Record, before generating:

- represented perspectives and who holds them;
- affected stakeholders who are not present;
- missing functional perspectives;
- conflicts of interest and authority asymmetries;
- who can veto an outcome.

An AI lens is a `synthetic-lens`: a prompt frame, never a consulted stakeholder, an independent source, or a vote.

## 2. Independent generation

Give every participant the same neutral prompt, constraints, and time window. Capture each candidate before anyone sees another participant's answer, with:

- a stable ID and one-sentence statement in the contributor's wording;
- `kind` from the active profile;
- provenance: origin, contributor refs, recorded stage, source refs, and AI tool when applicable;
- at least one assumption and one uncertainty;
- expected signals and, when the candidate is testable, disconfirming signals.

Do not show example solutions before this round. If examples are unavoidable, record them as anchors.

## 3. Structured sharing

Run round-robin or pooled silent sharing. Clarify wording without advocacy or scoring. Offer an anonymous channel. Ask each participant what is missing, what contradicts the dominant framing, and which candidate became less obvious after hearing the group. Then run a second independent round and record every candidate it produced with its trigger.

## 4. Structuring

Cluster by an explicit declared relation: shared outcome, mechanism, population, scale, lever, or delivery model. Keep original IDs and text. Log merges and splits with a rationale. Similar wording is not semantic equivalence — retain distinct candidates whose assumptions, population, intervention, or expected signals differ. Preserve minority candidates even when the cluster consensus rejects them.

Optional structures, when the profile calls for them: opportunity solution tree, issue tree, option map, morphological matrix, scenario set.

## Bias and failure controls

- **Production blocking:** private parallel generation before discussion.
- **Anchoring and fixation:** no leader answer, worked example, or AI output before the independent round; reopen generation after new evidence.
- **Authority effects:** leader-last sharing, anonymous input, independent ratings, visible dissent.
- **Convergent framing:** assign a genuine alternative-generation role and document rejected options.
- **Evaluation apprehension:** separate contribution from attribution where possible; critique candidates, not contributors.
- **Premature convergence:** fixed divergence window, explicit transition, predeclared criteria.
- **False precision:** anchored scales, uncertainty ranges, sensitivity analysis, narrative review.
- **Gap inflation:** record search and consultation boundaries; write "no evidence located in this boundary", never "does not exist".
- **AI homogenization:** see [responsible AI](responsible-ai.md).

## Stop conditions

Pause or end the session when:

- the decision cannot be scoped without confidential or controlled material the session may not hold;
- a perspective essential to safety, legality, or interpretation is absent;
- a gate is triggered and its owner has not reviewed it;
- participants cannot dissent safely;
- criteria or weights are being changed to favor a known preferred option;
- the accountable decision owner is absent;
- the request is already a bounded decision that belongs to another owner.

Record the stop reason, what exists so far, and one recovery action. A stopped session still returns its register with explicit gaps.
