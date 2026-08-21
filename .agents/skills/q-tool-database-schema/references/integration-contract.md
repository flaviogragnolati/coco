# Database-schema delegation contract

Use this contract when another Quasar skill delegates database design, review, migration strategy, or evidence-led performance analysis. The caller owns the domain model, architecture decisions, feature meaning, the confirmed technical foundation, every command execution, the artifact-index delta, and the decision to adopt any candidate design. `q-tool-database-schema` owns engine-coverage labeling, the analysis, candidate designs, migration strategies, and its `database_analysis` result.

## Request

Pass one `database_request` conforming to [`database-request.schema.yaml`](database-request.schema.yaml) with the selected task, caller identity and mode, the request scope, the caller context at exact artifact versions, the confirmed or inferred database profile, exact source refs, redacted supplied evidence, operational constraints, the intended result, the output policy, and the forbidden material.

Every `supplied_evidence` entry declares `redacted: true`: the caller sanitizes DDL, schemas, queries, plans, metrics, distributions, and samples before delegation. `database_profile.confirmed` states whether the engine and version are established rather than assumed; an unconfirmed profile bounds every conclusion to `portable` or `unverified` coverage. `output.overwrite` is always `false`; a persisted analysis needs an authorized path and an `approval_ref` from the caller.

Complete the request when the task, owner, evidence, profile confirmation, constraints, and output policy are explicit.

## Result

Return one `database_analysis` conforming to [`database-analysis.schema.yaml`](database-analysis.schema.yaml) with the same `request_id` and task, an `outcome` of `completed`, `completed_with_warnings`, or `blocked`, observed facts separated from assumptions and coverage gaps, findings carrying evidence and a coverage label, the candidate design, semantic feedback, stack contradictions, required architecture decisions, the verification handoff, and one next recommended action.

Return `blocked` with the schema errors when the request does not conform, and when credentials, unsanitized production records, or an unauthorized output path are supplied. A finding without a representative query, plan, metric, or distribution is a hypothesis with an evidence request, never a recommendation.

## Unsupported routes

Missing engine-specific ground truth for the confirmed profile is a coverage gap routed to `q-code-research` or the caller, never a portable assumption presented as verified. Query and migration execution, database connections, credential handling, and edits to a caller's artifact are outside this tool. Only the root orchestrator registers a persisted analysis — derived, `semantic_authority: none` — or changes workflow state and the artifact index.
