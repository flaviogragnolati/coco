# Design It Twice

For an architectural decision that is **wide and genuinely disputed** — a key interface, the collaboration pattern between two contexts, the data/ownership model — a single recommendation is premature. Use this parallel sub-agent pattern instead: have several agents design the same decision in radically different ways, then compare. Based on "Design It Twice" (Ousterhout) — your first idea is unlikely to be the best.

Uses the vocabulary in [GLOSSARY.md](GLOSSARY.md) — **module**, **interface**, **seam**, **adapter**, **leverage**, **locality** — plus the project's domain terms from `CONTEXT.md`.

**When to reach for it.** The decision is hard to reverse, the alternatives are non-obviously ranked, and the user pushed back on (or you can't confidently produce) a single default. For everything else, the normal one-recommendation-with-trade-offs format of `SKILL.md` §3.2 is faster and enough.

## Process

### 1. Frame the problem space

Before spawning sub-agents, write a user-facing explanation of the problem space for the decision at hand:

- The constraints any answer would need to satisfy
- The dependencies involved, and which category they fall into (see [DEEPENING.md](DEEPENING.md))
- A rough illustrative sketch to ground the constraints — not a proposal, just a way to make the constraints concrete

Show this to the user, then immediately proceed to Step 2. The user reads and thinks while the sub-agents work in parallel.

### 2. Spawn sub-agents

Spawn 3+ sub-agents in parallel using the Agent tool. Each must produce a **radically different** answer to the same decision.

Prompt each sub-agent with a separate technical brief (file paths, coupling details, dependency category from [DEEPENING.md](DEEPENING.md), what sits behind the seam, the relevant invariants). The brief is independent of the user-facing problem-space explanation in Step 1. Give each agent a different design constraint.

**When the decision is an interface:**

- Agent 1: "Minimize the interface — aim for 1–3 entry points max. Maximise leverage per entry point."
- Agent 2: "Maximise flexibility — support many use cases and extension."
- Agent 3: "Optimise for the most common caller — make the default case trivial."
- Agent 4 (if applicable): "Design around ports & adapters for cross-seam dependencies."

**When the decision is not an interface** (collaboration pattern, data ownership, consistency model), use analogous constraints:

- Agent 1: "Optimise for minimal coupling between the parts, even at the cost of latency or extra machinery."
- Agent 2: "Optimise for operability — the shape that is easiest to observe, retry, and remediate in production."
- Agent 3: "Optimise for delivery simplicity — the least machinery that satisfies the invariants."
- Agent 4 (if applicable): "Optimise for evolvability — the shape that absorbs the most likely future variants."

Include both [GLOSSARY.md](GLOSSARY.md) vocabulary and `CONTEXT.md` vocabulary in the brief so each sub-agent names things consistently with the architecture language and the project's domain language.

Each sub-agent outputs:

1. The design (for an interface: types, methods, params, plus invariants, ordering, error modes; otherwise: the ownership/flow/contract model)
2. A usage or flow example showing how the rest of the system meets it
3. What is hidden behind the seam
4. Dependency strategy and adapters (see [DEEPENING.md](DEEPENING.md))
5. Trade-offs — where leverage is high, where it's thin

### 3. Present and compare

Present designs sequentially so the user can absorb each one, then compare them in prose. Contrast by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**. When the decision is not an interface, add the criteria of the branch it came from — coupling, consistency guarantees, operational complexity, testability.

After comparing, give your own recommendation: which design you think is strongest and why. If elements from different designs would combine well, propose a hybrid. Be opinionated — the user wants a strong read, not a menu.

Feed the outcome back into the session: the chosen design becomes a row in the architecture document's **Architectural decisions made** table, and the rejected designs become rows in **Alternatives rejected** (they are already written up — don't waste them).
