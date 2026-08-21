---
name: q-ask-analyze
description: "Evaluate a concrete proposal against a project's documented intent, decisions, constraints, workflow state, and observable implementation. Use when the user asks whether an idea, change, technology, architecture, process, or scope proposal fits the project and wants a multidimensional analysis of benefits, risks, problems, downsides, compatibility, alternatives, and conditions. Runs a conditional mini-grill before investigation and can recommend a deeper Quasar planning or analysis route without starting it; requires q-core-contract and q-ask-project."
---

# Analyze a proposal

Return an evidence-grounded decision aid, not a decision or implementation plan. Keep the analysis transient and read-only.

Read the `q-core-contract` companion and [`q-ask-project`](../q-ask-project/SKILL.md). If either is missing, stop and install both with `npx skills add flaviogragnolati/ai-workflow --skill q-core-contract --skill q-ask-project`.

## 1. Lock the proposal before investigation

Apply the alignment procedure from `q-ask-project`, treating the proposal and target decision as the question. Normalize:

- the concrete change or option being proposed;
- the outcome or decision it is meant to support;
- the current baseline and credible alternatives to compare;
- affected scope, actors, systems, and lifecycle stage;
- explicit non-goals, constraints, invariants, and must-not-break behavior;
- time horizon, success criteria, and material assumptions.

When two interpretations could change the analysis, restate the proposal with one concrete project example and run one short mini-grill before gathering evidence. Group only the questions needed to distinguish those interpretations or establish boundaries. Proceed immediately when the proposal frame is already clear.

Complete this step when the proposal, decision, baseline, boundaries, and success criteria describe one assessable option, or the unresolved ambiguity is waiting on the user.

## 2. Reconcile proposal and project evidence

Apply the evidence procedure from `q-ask-project`. Inspect only the project slice affected by the proposal, including applicable requirements, accepted scope, decisions, risks, technical foundation, domain or architecture artifacts, workflow state, and observable implementation. Add current primary external sources only for material facts the project does not own.

Trace each proposal claim to evidence or label it as an assumption. Identify upstream authorities, downstream consumers, existing commitments, irreversible boundaries, and migrations or compatibility surfaces the proposal would touch. When project intent and implementation disagree, analyze both rather than choosing one silently.

Complete this step when the relevant current baseline, authority chain, implementation facts, dependencies, and evidence gaps are explicit.

## 3. Analyze every relevant dimension

Evaluate each dimension below as `favorable`, `mixed`, `unfavorable`, `not applicable`, or `unknown`, with concise evidence and consequence. Use `not applicable` only with a reason and `unknown` when evidence is missing.

| Dimension | Test |
|---|---|
| Product and strategic fit | Does it advance accepted outcomes, users, scope, and priorities? |
| User and operational value | Who benefits, what improves, and what new burden or behavior appears? |
| Domain, data, and interfaces | Does it preserve concepts, ownership, invariants, contracts, and data lifecycle? |
| Architecture and technical fit | Does it respect boundaries, adopted guidance, maintainability, and integration seams? |
| Security, privacy, and compliance | Does it change trust, authorization, data exposure, auditability, or obligations? |
| Delivery and operations | What does it do to sequencing, skills, testing, migration, rollout, support, and recovery? |
| Reliability and NFRs | How does it affect performance, availability, scalability, observability, and resilience? |
| Economics and opportunity cost | What time, complexity, operating cost, lock-in, or displaced work does it add? |
| Compatibility and evolution | Can current consumers, data, deployments, and future changes coexist with it? |
| Evidence and reversibility | How confident is the case, what would falsify it, and how costly is reversal? |

Compare against the current baseline and any credible alternative already in scope. Classify positive outcomes as **benefits**, accepted negative trade-offs as **downsides**, possible future failures as **risks**, and evidenced incompatibilities or obstacles as **problems**. Do not mix these categories.

Assess compatibility per affected surface as `compatible`, `compatible with conditions`, `incompatible`, or `undetermined`. A global compatible verdict is allowed only when every material surface is covered; otherwise state the conditions or unknowns that prevent it.

Complete this step when every relevant dimension and compatibility surface has a supported result, non-applicable dimensions have reasons, and the decisive trade-offs are visible.

## 4. Conclude without planning

Return, in the conversation:

1. overall disposition: `fits`, `fits with conditions`, `does not fit`, or `insufficient evidence`, plus confidence;
2. the normalized proposal and comparison baseline;
3. a compact multidimensional scorecard;
4. compatibility results and required conditions;
5. benefits, downsides, risks, and problems, kept distinct;
6. assumptions, evidence gaps, and what could change the disposition;
7. one recommended next route, or `none` when the analysis is sufficient.

Recommend `q-code-research` for durable primary-source investigation; the applicable `q-plan-*` owner for product, technical, domain, architecture, feature, or backlog decisions; and `q-code-grill-simple`, `q-code-grill-feature`, or `q-code-grill-design` for execution planning at the matching depth. Name why the route fits and do not start it unless the user separately authorizes that work.

Do not create an analysis artifact, update workflow state or the artifact index, select a proposal on the user's behalf, or silently mutate accepted meaning. Complete the skill when the proposal has an evidence-bounded disposition and the user has one truthful next choice.
