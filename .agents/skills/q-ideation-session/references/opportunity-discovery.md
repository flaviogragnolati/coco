# Opportunity discovery

Use inside `profile: product` when the subject is an existing product, service, or area and the open question is which improvement opportunities are worth pursuing next. This is a route through the product profile, not a new profile, intent, or record shape: it replaces the profile's usual opening from one already selected opportunity with a broad sweep, then rejoins the standard clustering, evaluation, gate, and disposition path. Read [product profile](profile-product.md) first; this reference adds only the sweep.

## Declare the session

- `profile: product`, `intent: generate-options`. Run a separate `frame-problem` session first when the outcome the product should improve is itself unclear; `reopen-after-evidence` applies unchanged once requested evidence returns.
- Any `participation_mode`.
- Required inputs: at least one current-state input. Prefer an approved artifact or versioned product documentation. When the missing orientation can be answered from already accessible project context or bounded code evidence, this route may optionally call `q-ask-project` or `q-code-explore` as declared in the parent skill.

Record a collaborator answer or sufficient user-supplied context as `kind: transient-orientation`, `authority: none`, with a stable orientation ID, producer, bounded scope, observation date, inspected file, artifact, or session-context refs, usage, and limitations. It may orient the session without an artifact version; it never becomes evidence or a second project truth source. Without an approved artifact, a traceable transient orientation, or sufficient user-supplied context, stop and name the missing input instead of generating from memory.

Complete this step when the decision, its owner, the three dimensions, and at least one traceable current-state input are recorded.

## Evidence discipline

The session never investigates (anti-pattern 5). Current-state understanding is either an existing input or bounded read-only orientation produced by an optional collaborator; the session itself never browses or turns that answer into evidence.

- Every generated opportunity is an `opportunity-hypothesis` with `opportunity_evidence.status: assumed` unless a `source_refs` entry to an approved artifact justifies `evidenced`.
- Every claim about current value, usage, adoption, cost, or user complaints traces to a declared input or is recorded as an assumption in its matching category.
- Every material unknown becomes an `evidence_request` routed per [handoffs](handoffs.md). Market, competitor, and adoption questions leave the session; they are not answered inside it.

## Cluster by effort and impact scale

Declare *effort and impact scale* as the structuring relation that [method core](method-core.md) requires, with exactly three clusters:

| Cluster | Meaning |
|---|---|
| `transformative` | Fundamentally expands what the product can do or who it can serve. |
| `leverage` | Multiplies the value of the existing core experience without replacing it. |
| `quick-win` | Small effort, disproportionate value for the effort spent. |

Generate into all three before evaluation starts. When a cluster still has no candidate at the end of the divergence window, record it as empty with its reason; never relabel a candidate to fill it and never leave the gap silent.

A scale label describes expected effort and reach. It is not priority, quality, or sequence: an unevaluated `transformative` candidate outranks nothing, and a `quick-win` is not automatically safe.

## Sweep the coverage categories

Visit every category once as a divergence checklist:

| Category | Ask |
|---|---|
| Speed | What takes too many steps, minutes, or waits to finish? |
| Automation | What repetitive work does the product still leave to the user? |
| Intelligence | Where could the product suggest, decide, or predict instead of asking? |
| Integration | Which system does the user move data to or from by hand? |
| Collaboration | What breaks when a second person, role, or team touches the same work? |
| Personalization | Where does one fixed behavior serve segments with genuinely different needs? |
| Visibility | What state, progress, or cost stays invisible until it becomes a problem? |
| Confidence | Where does the user hesitate, double-check, or fear an irreversible action? |
| Delight | Which frequent moment is merely tolerable and could be satisfying? |
| Access | Who cannot use this today because of device, ability, language, price, or permission? |

The list is a divergence aid. Record `none found` explicitly for a category that yields nothing and never invent a candidate to fill a row. It is not a quota, not an evaluation axis, and not a clustering relation: a candidate found under any category may land in any of the three scales.

## Unstick a stalled round

Use these prompts when generation stops producing non-redundant candidates. They produce candidates and assumptions, never facts:

- What do power users do by hand, outside the product, that the product could do natively?
- What would a competitor have to build to make this product easy to leave?
- Which single action, if it took one minute less, would save the most minutes overall?
- Which recurring anxiety could one visible indicator remove?
- What could the product do with what it already stores but never uses?
- Which step exists only because of a past technical or organizational constraint?
- If the next release could ship one thing and had to be noticed, what would it be?

## Evaluate

The mechanics stay in [evaluation and gates](evaluation-and-gates.md). Draw criteria from the product profile's menu under its "select three to seven" rule; this route typically selects `user value`, `reach`, `frequency`, `differentiation`, `defensibility-compounding`, and `feasibility`.

Rate through the register's criteria, anchors, weights, and intervals. Do not import a symbolic, emoji, or single fused opportunity score, and do not carry a shorthand that hides which criterion produced which rating. Gates stay outside the score: `transformative` candidates commonly trigger minimum capability and non-negotiable incompatibility, and a `quick-win` commonly triggers none — record both results rather than skipping the gate for small candidates.

## Dispose

Roadmap language usually arrives with the request. Translate it once, then use the session's vocabulary:

| Arrives as | Record as |
|---|---|
| do now, next sprint | `advance`, with one recommended owner and intended use |
| promising but unproven | `evidence-needed`, or `prototype-needed` when only a throwaway build settles it |
| good, not now | `retain` to keep it in the pool, `defer` with a named revisit trigger |
| not worth it | `stop`, with the reason |

Any ranked presentation of the sweep is a decision aid; the decision owner's explicit disposition is the decision (anti-pattern 3). An advancing candidate leaves through [handoffs](handoffs.md), inside the ownership limits recorded in the [product profile](profile-product.md) boundaries.

Complete the route when every category was visited or recorded empty, every cluster is populated or recorded empty with its reason, every candidate carries an evidence status and one disposition, and every material unknown has a routed evidence request.
