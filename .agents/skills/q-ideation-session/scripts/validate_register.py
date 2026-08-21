"""Validate an ideation session register structurally and semantically.

Adapted from `scripts/validate_register.py` of the MIT-licensed
`scientific-brainstorming` skill, copyright (c) 2025 K-Dense Inc.
The Quasar register schema, profile fit, gate, routing, and disposition checks
are new.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from collections.abc import Sequence
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True

from _common import CliError, emit_json, read_json

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "references" / "ideation-register.schema.json"

TYPE_MAP = {
    "object": dict,
    "array": list,
    "string": str,
    "boolean": bool,
    "number": (int, float),
    "integer": int,
    "null": type(None),
}

PROFILE_KINDS = {
    "scientific": {
        "research-question",
        "mechanism-hypothesis",
        "causal-hypothesis",
        "prediction",
        "study-concept",
        "measurement-option",
        "analysis-option",
    },
    "product": {
        "problem-frame",
        "opportunity-hypothesis",
        "solution-concept",
        "service-concept",
        "business-model-option",
        "experiment-concept",
        "metric-option",
        "rollout-option",
    },
    "consulting": {
        "problem-frame",
        "diagnostic-hypothesis",
        "causal-hypothesis",
        "strategic-option",
        "intervention-option",
        "workstream-option",
        "governance-option",
        "operating-model-option",
        "scenario",
        "measurement-option",
        "stakeholder-action",
        "evidence-request",
    },
    "general": {
        "problem-frame",
        "option",
        "question",
        "risk",
        "experiment-concept",
        "measurement-option",
    },
}

PROFILE_ASSUMPTION_CATEGORIES = {
    "scientific": {
        "causal",
        "mechanistic",
        "measurement",
        "sampling",
        "statistical",
        "operational",
        "feasibility",
        "ethical",
        "value",
    },
    "product": {
        "customer-problem",
        "desirability",
        "usability",
        "value",
        "adoption",
        "channel",
        "viability",
        "pricing",
        "feasibility",
        "operations",
        "data",
        "privacy",
        "security",
        "legal",
    },
    "consulting": {
        "client-problem",
        "causal-mechanism",
        "capability",
        "capacity",
        "data-availability",
        "stakeholder-acceptance",
        "governance",
        "incentives",
        "operations",
        "cost",
        "timing",
        "dependency",
        "legal",
        "privacy",
        "security",
    },
    "general": {
        "problem",
        "value",
        "feasibility",
        "adoption",
        "operations",
        "cost",
        "dependency",
        "legal",
        "privacy",
        "security",
        "other",
    },
}

AI_ORIGINS = {"ai-assisted", "ai-generated", "mixed"}
BLOCKING_GATE_RESULTS = {"failed", "redesign-required", "review-required"}
OWN_SKILL_ID = "q-ideation-session"


def _issue(path: str, message: str) -> dict[str, str]:
    return {"path": path, "message": message}


def schema_errors(value: Any, schema: dict[str, Any], path: str = "$") -> list[dict[str, str]]:
    """Validate against the JSON Schema subset used by this package."""

    out: list[dict[str, str]] = []
    if "const" in schema and value != schema["const"]:
        out.append(_issue(path, "expected %r" % (schema["const"],)))
    if "enum" in schema and value not in schema["enum"]:
        out.append(_issue(path, "must be one of %r" % (schema["enum"],)))
    expected = schema.get("type")
    if expected is not None:
        names = expected if isinstance(expected, list) else [expected]
        ok = any(
            name in TYPE_MAP
            and isinstance(value, TYPE_MAP[name])
            and not (name in {"number", "integer"} and isinstance(value, bool))
            for name in names
        )
        if not ok:
            out.append(_issue(path, "expected type %r, got %s" % (names, type(value).__name__)))
            return out
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                out.append(_issue(path, "missing required key %r" % key))
        properties = schema.get("properties", {})
        additional = schema.get("additionalProperties", True)
        for key, item in value.items():
            child = "%s.%s" % (path, key)
            if key in properties:
                out.extend(schema_errors(item, properties[key], child))
            elif additional is False:
                out.append(_issue(child, "additional property is not allowed"))
    if isinstance(value, list):
        minimum = schema.get("minItems")
        if isinstance(minimum, int) and len(value) < minimum:
            out.append(_issue(path, "requires at least %d item(s)" % minimum))
        if isinstance(schema.get("items"), dict):
            for index, item in enumerate(value):
                out.extend(schema_errors(item, schema["items"], "%s[%d]" % (path, index)))
    return out


def _normalized_statement(value: str) -> str:
    """Normalize exact text features only; this is not semantic matching."""

    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value).casefold()).strip()


def _identifiers(records: Sequence[Any], key: str) -> list[str]:
    return [
        record[key]
        for record in records
        if isinstance(record, dict) and isinstance(record.get(key), str)
    ]


def _duplicates(values: Sequence[str]) -> list[str]:
    return sorted({value for value in values if values.count(value) > 1})


def semantic_errors(document: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """Apply cross-field rules the structural schema cannot express."""

    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []

    session = document.get("session", {})
    profile = session.get("profile")
    participation_mode = session.get("participation_mode")
    participants = session.get("participants", [])
    participant_refs = {
        record.get("participant_ref")
        for record in participants
        if isinstance(record, dict)
    }
    human_refs = {
        record.get("participant_ref")
        for record in participants
        if isinstance(record, dict) and record.get("kind") == "human"
    }

    candidates = document.get("candidates", [])
    assumptions = document.get("assumptions", [])
    criteria = document.get("criteria", [])
    ratings = document.get("ratings", [])
    requests = document.get("evidence_requests", [])
    gates = document.get("gate_reviews", [])
    decisions = document.get("decision_log", [])
    input_refs = document.get("input_refs", [])

    input_ids: list[str] = []
    formal_versioned_inputs = 0
    for index, item in enumerate(input_refs if isinstance(input_refs, list) else []):
        if not isinstance(item, dict):
            continue
        path = "$.input_refs[%d]" % index
        artifact_id = item.get("artifact_id")
        orientation_id = item.get("orientation_id")
        transient = item.get("kind") == "transient-orientation"
        if transient:
            required = (
                "orientation_id", "producer", "scope", "observed_at",
                "source_refs", "limitations",
            )
            for key in required:
                value = item.get(key)
                if value in (None, "", []):
                    errors.append(_issue(f"{path}.{key}", "transient orientation requires provenance"))
            if artifact_id is not None or item.get("version") is not None:
                errors.append(_issue(path, "transient orientation cannot claim an artifact ID or version"))
            if item.get("authority") != "none":
                errors.append(_issue(f"{path}.authority", "transient orientation must have authority none"))
            if isinstance(orientation_id, str):
                input_ids.append(orientation_id)
        else:
            if not isinstance(artifact_id, str) or not artifact_id.strip():
                errors.append(_issue(f"{path}.artifact_id", "formal input requires an artifact ID"))
            elif orientation_id is not None:
                errors.append(_issue(path, "formal input cannot also be a transient orientation"))
            else:
                input_ids.append(artifact_id)
            if isinstance(item.get("version"), str) and item["version"].strip():
                formal_versioned_inputs += 1

    duplicated_inputs = _duplicates(input_ids)
    if duplicated_inputs:
        errors.append(_issue("$.input_refs", "duplicate input IDs: %s" % ", ".join(duplicated_inputs)))
    if session.get("intent") == "reopen-after-evidence" and formal_versioned_inputs == 0:
        errors.append(_issue(
            "$.input_refs",
            "reopen-after-evidence requires a formal artifact ID and exact version",
        ))

    candidate_ids = _identifiers(candidates, "candidate_id")
    assumption_ids = _identifiers(assumptions, "assumption_id")
    criterion_ids = _identifiers(criteria, "criterion_id")
    request_ids = _identifiers(requests, "request_id")
    gate_ids = _identifiers(gates, "gate_id")

    for label, values in (
        ("$.candidates", candidate_ids),
        ("$.assumptions", assumption_ids),
        ("$.criteria", criterion_ids),
        ("$.evidence_requests", request_ids),
        ("$.gate_reviews", gate_ids),
        ("$.ratings", _identifiers(ratings, "rating_id")),
        ("$.clusters", _identifiers(document.get("clusters", []), "cluster_id")),
        ("$.merge_log", _identifiers(document.get("merge_log", []), "entry_id")),
        (
            "$.adversarial_reviews",
            _identifiers(document.get("adversarial_reviews", []), "review_id"),
        ),
        ("$.evidence_links", _identifiers(document.get("evidence_links", []), "link_id")),
        ("$.decision_log", _identifiers(decisions, "entry_id")),
        ("$.session.participants", sorted(reference for reference in participant_refs if reference)),
    ):
        duplicated = _duplicates(values)
        if duplicated:
            errors.append(_issue(label, "duplicate IDs: %s" % ", ".join(duplicated)))

    known_candidates = set(candidate_ids)
    known_assumptions = set(assumption_ids)
    allowed_kinds = PROFILE_KINDS.get(profile, set())
    allowed_categories = PROFILE_ASSUMPTION_CATEGORIES.get(profile, set())

    statements: defaultdict[str, list[str]] = defaultdict(list)
    ai_candidates = 0
    linked_assumptions: set[str] = set()

    for index, candidate in enumerate(candidates):
        if not isinstance(candidate, dict):
            continue
        path = "$.candidates[%d]" % index
        candidate_id = candidate.get("candidate_id")
        kind = candidate.get("kind")
        if allowed_kinds and kind not in allowed_kinds:
            errors.append(
                _issue(
                    "%s.kind" % path,
                    "%r is not a %s candidate kind; allowed: %s"
                    % (kind, profile, ", ".join(sorted(allowed_kinds))),
                )
            )
        statement = candidate.get("statement")
        if isinstance(statement, str) and isinstance(candidate_id, str):
            statements[_normalized_statement(statement)].append(candidate_id)

        provenance = candidate.get("provenance", {})
        origin = provenance.get("origin") if isinstance(provenance, dict) else None
        contributors = provenance.get("contributor_refs", []) if isinstance(provenance, dict) else []
        sources = provenance.get("source_refs", []) if isinstance(provenance, dict) else []
        ai_tool = provenance.get("ai_tool") if isinstance(provenance, dict) else None
        if origin in AI_ORIGINS:
            ai_candidates += 1
            if not isinstance(ai_tool, str) or not ai_tool.strip():
                errors.append(
                    _issue("%s.provenance.ai_tool" % path, "AI-derived candidates require a tool")
                )
        elif isinstance(ai_tool, str) and ai_tool.strip():
            warnings.append(
                _issue(
                    "%s.provenance.ai_tool" % path,
                    "an AI tool is recorded but the origin is not AI-derived",
                )
            )
        if origin in {"human", "mixed"} and not contributors:
            errors.append(
                _issue(
                    "%s.provenance.contributor_refs" % path,
                    "human or mixed candidates require at least one contributor",
                )
            )
        if origin == "evidence-inspired" and not sources:
            errors.append(
                _issue(
                    "%s.provenance.source_refs" % path,
                    "evidence-inspired candidates require at least one source reference",
                )
            )
        for contributor in contributors:
            if participant_refs and contributor not in participant_refs:
                errors.append(
                    _issue(
                        "%s.provenance.contributor_refs" % path,
                        "%r is not a listed participant" % contributor,
                    )
                )
        if participation_mode == "agent-only" and origin not in AI_ORIGINS:
            errors.append(
                _issue(
                    "%s.provenance.origin" % path,
                    "an agent-only session cannot record non-AI candidate origins",
                )
            )

        opportunity = candidate.get("opportunity_evidence")
        if profile == "product" and kind == "opportunity-hypothesis" and not isinstance(opportunity, dict):
            errors.append(
                _issue(
                    "%s.opportunity_evidence" % path,
                    "a product opportunity requires an explicit evidence status",
                )
            )
        if isinstance(opportunity, dict):
            if opportunity.get("status") == "evidenced" and not opportunity.get("source_refs"):
                errors.append(
                    _issue(
                        "%s.opportunity_evidence.source_refs" % path,
                        "an evidenced opportunity requires at least one source reference",
                    )
                )

        for reference in candidate.get("assumption_refs", []) or []:
            linked_assumptions.add(reference)
            if reference not in known_assumptions:
                errors.append(
                    _issue("%s.assumption_refs" % path, "unknown assumption %r" % reference)
                )
        if not candidate.get("assumption_refs"):
            warnings.append(_issue("%s.assumption_refs" % path, "candidate has no linked assumption"))
        if not candidate.get("uncertainties"):
            warnings.append(_issue("%s.uncertainties" % path, "candidate has no recorded uncertainty"))

    for normalized, duplicated_ids in sorted(statements.items()):
        if normalized and len(duplicated_ids) > 1:
            warnings.append(
                _issue(
                    "$.candidates",
                    "normalized-text duplicates %s; this is not a claim of semantic equivalence"
                    % sorted(duplicated_ids),
                )
            )

    for index, assumption in enumerate(assumptions):
        if not isinstance(assumption, dict):
            continue
        path = "$.assumptions[%d]" % index
        if allowed_categories and assumption.get("category") not in allowed_categories:
            errors.append(
                _issue(
                    "%s.category" % path,
                    "%r is not a %s assumption category" % (assumption.get("category"), profile),
                )
            )
        owner = assumption.get("owner_ref")
        if owner is not None and participant_refs and owner not in participant_refs:
            errors.append(_issue("%s.owner_ref" % path, "%r is not a listed participant" % owner))
        if assumption.get("status") not in {"untested", "not-applicable"} and not assumption.get(
            "evidence_refs"
        ):
            warnings.append(
                _issue("%s.evidence_refs" % path, "assessed assumption has no evidence reference")
            )
    for orphan in sorted(known_assumptions - linked_assumptions):
        warnings.append(_issue("$.assumptions", "assumption %r is not linked from any candidate" % orphan))

    for collection, key, field in (
        ("clusters", "cluster_id", "candidate_refs"),
        ("gate_reviews", "gate_id", "candidate_refs"),
        ("evidence_requests", "request_id", "candidate_refs"),
    ):
        for index, record in enumerate(document.get(collection, [])):
            if not isinstance(record, dict):
                continue
            for reference in record.get(field, []) or []:
                if reference not in known_candidates:
                    errors.append(
                        _issue(
                            "$.%s[%d].%s" % (collection, index, field),
                            "unknown candidate %r" % reference,
                        )
                    )

    for index, entry in enumerate(document.get("merge_log", [])):
        if not isinstance(entry, dict):
            continue
        for reference in entry.get("source_candidate_refs", []) or []:
            if reference not in known_candidates:
                errors.append(
                    _issue("$.merge_log[%d].source_candidate_refs" % index, "unknown candidate %r" % reference)
                )
        result = entry.get("result_candidate_ref")
        if result is not None and result not in known_candidates:
            errors.append(
                _issue("$.merge_log[%d].result_candidate_ref" % index, "unknown candidate %r" % result)
            )

    for index, review in enumerate(document.get("adversarial_reviews", [])):
        if not isinstance(review, dict):
            continue
        path = "$.adversarial_reviews[%d]" % index
        if review.get("candidate_ref") not in known_candidates:
            errors.append(_issue("%s.candidate_ref" % path, "unknown candidate %r" % review.get("candidate_ref")))
        reviewer = review.get("reviewer_ref")
        if participant_refs and reviewer not in participant_refs:
            warnings.append(_issue("%s.reviewer_ref" % path, "%r is not a listed participant" % reviewer))

    for index, criterion in enumerate(criteria):
        if not isinstance(criterion, dict):
            continue
        path = "$.criteria[%d]" % index
        name = criterion.get("name", "")
        if isinstance(name, str) and name.startswith("gate_"):
            errors.append(
                _issue("%s.name" % path, "a gate must stay outside the compensatory score")
            )
        weight = criterion.get("weight")
        if isinstance(weight, (int, float)) and not isinstance(weight, bool) and weight <= 0:
            errors.append(_issue("%s.weight" % path, "weight must be greater than 0"))
        minimum = criterion.get("minimum")
        maximum = criterion.get("maximum")
        if isinstance(minimum, (int, float)) and isinstance(maximum, (int, float)) and minimum >= maximum:
            errors.append(_issue("%s.minimum" % path, "minimum must be less than maximum"))
    if len(criteria) > 7:
        warnings.append(_issue("$.criteria", "more than seven criteria dilute the comparison"))

    criteria_by_id = {
        criterion.get("criterion_id"): criterion
        for criterion in criteria
        if isinstance(criterion, dict)
    }
    stage_status = {
        entry.get("stage"): entry.get("status")
        for entry in document.get("workflow", [])
        if isinstance(entry, dict)
    }
    if ratings and stage_status.get("criteria-and-gates") != "completed":
        errors.append(
            _issue("$.ratings", "ratings exist before the criteria-and-gates stage is completed")
        )

    for index, rating in enumerate(ratings):
        if not isinstance(rating, dict):
            continue
        path = "$.ratings[%d]" % index
        if rating.get("candidate_ref") not in known_candidates:
            errors.append(_issue("%s.candidate_ref" % path, "unknown candidate %r" % rating.get("candidate_ref")))
        criterion = criteria_by_id.get(rating.get("criterion_ref"))
        if criterion is None:
            errors.append(_issue("%s.criterion_ref" % path, "unknown criterion %r" % rating.get("criterion_ref")))
        rater = rating.get("rater_ref")
        if participant_refs and rater not in participant_refs:
            errors.append(_issue("%s.rater_ref" % path, "%r is not a listed participant" % rater))
        score = rating.get("score")
        low = rating.get("low")
        high = rating.get("high")
        if rating.get("assessability") == "assessed":
            if score is None:
                errors.append(_issue("%s.score" % path, "an assessed rating requires a score"))
            elif criterion is not None:
                minimum = criterion.get("minimum")
                maximum = criterion.get("maximum")
                if isinstance(minimum, (int, float)) and isinstance(maximum, (int, float)):
                    if not minimum <= score <= maximum:
                        errors.append(
                            _issue("%s.score" % path, "score is outside [%s, %s]" % (minimum, maximum))
                        )
            if score is not None and low is not None and high is not None and not low <= score <= high:
                errors.append(_issue("%s.low" % path, "requires low <= score <= high"))
        elif score is not None:
            errors.append(
                _issue("%s.score" % path, "an abstained or not-assessable rating cannot carry a score")
            )

    blocked_candidates: set[str] = set()
    for gate in gates:
        if not isinstance(gate, dict):
            continue
        if gate.get("result") in BLOCKING_GATE_RESULTS:
            for reference in gate.get("candidate_refs", []) or []:
                blocked_candidates.add(reference)
        if gate.get("result") in BLOCKING_GATE_RESULTS and not gate.get("owner_ref"):
            errors.append(
                _issue("$.gate_reviews", "gate %r blocks without naming a deciding owner" % gate.get("gate_id"))
            )

    requested_candidates: set[str] = set()
    for index, request in enumerate(requests):
        if not isinstance(request, dict):
            continue
        path = "$.evidence_requests[%d]" % index
        requested_candidates.update(request.get("candidate_refs", []) or [])
        route = request.get("recommended_route")
        if not isinstance(route, str) or not route.startswith("q-") or route == OWN_SKILL_ID:
            errors.append(_issue("%s.recommended_route" % path, "route to another registered owner"))
        if not request.get("decision_impact"):
            errors.append(_issue("%s.decision_impact" % path, "a request without decision impact is noise"))

    for index, link in enumerate(document.get("evidence_links", [])):
        if not isinstance(link, dict):
            continue
        if link.get("request_ref") not in set(request_ids):
            errors.append(
                _issue("$.evidence_links[%d].request_ref" % index, "unknown request %r" % link.get("request_ref"))
            )
        if not link.get("version"):
            errors.append(_issue("$.evidence_links[%d].version" % index, "adopted evidence requires an exact version"))

    decided: list[str] = []
    for index, entry in enumerate(decisions):
        if not isinstance(entry, dict):
            continue
        path = "$.decision_log[%d]" % index
        candidate_ref = entry.get("candidate_ref")
        decided.append(candidate_ref)
        if candidate_ref not in known_candidates:
            errors.append(_issue("%s.candidate_ref" % path, "unknown candidate %r" % candidate_ref))
        if not entry.get("rationale"):
            errors.append(_issue("%s.rationale" % path, "every disposition requires a rationale"))
        if not entry.get("decided_by"):
            errors.append(_issue("%s.decided_by" % path, "a disposition requires an accountable human"))
        disposition = entry.get("disposition")
        route = entry.get("recommended_route")
        if disposition == "advance":
            if not isinstance(route, dict) or not route.get("skill") or not route.get("intended_use"):
                errors.append(
                    _issue("%s.recommended_route" % path, "an advancing candidate requires an owner route")
                )
            if candidate_ref in blocked_candidates:
                errors.append(
                    _issue("%s.disposition" % path, "a candidate with an unresolved gate cannot advance")
                )
        if disposition in {"evidence-needed", "prototype-needed"} and candidate_ref not in requested_candidates:
            errors.append(
                _issue("%s.disposition" % path, "this disposition requires a routed evidence request")
            )
        if isinstance(route, dict) and route.get("skill") == OWN_SKILL_ID:
            errors.append(_issue("%s.recommended_route.skill" % path, "a candidate cannot be routed to this skill"))
    duplicated = _duplicates([reference for reference in decided if isinstance(reference, str)])
    if duplicated:
        errors.append(_issue("$.decision_log", "candidates with more than one disposition: %s" % ", ".join(duplicated)))

    for index, record in enumerate(document.get("dissent", [])):
        if not isinstance(record, dict):
            continue
        if participant_refs and record.get("participant_ref") not in participant_refs:
            errors.append(
                _issue("$.dissent[%d].participant_ref" % index, "%r is not a listed participant" % record.get("participant_ref"))
            )

    governance = document.get("information_governance", {})
    ai_use = document.get("ai_use", [])
    if governance.get("external_ai_use") == "prohibited" and ai_use:
        errors.append(_issue("$.ai_use", "AI use is recorded although external AI use is prohibited"))
    if ai_candidates and not ai_use:
        errors.append(_issue("$.ai_use", "AI-derived candidates require a disclosed AI-use entry"))
    if ai_candidates and human_refs:
        frozen = any(
            isinstance(entry, dict) and entry.get("human_first_round_frozen") is True
            for entry in ai_use
        )
        if not frozen:
            errors.append(
                _issue("$.ai_use", "with human participants the human-first round must be frozen before AI output")
            )

    approval = document.get("approval")
    if isinstance(approval, dict):
        for key in ("approved_by", "approval_ref", "approved_at"):
            value = approval.get(key)
            if not isinstance(value, str) or not value.strip():
                errors.append(_issue("$.approval.%s" % key, "approval requires a non-empty %s" % key))

    return errors, warnings


def validate_register(document: Any, schema: dict[str, Any]) -> dict[str, Any]:
    """Return a deterministic validation report."""

    limitations = [
        "Validation is structural and deterministic; it does not verify claims, novelty, feasibility, or value.",
        "Normalized-text duplicate warnings do not assert semantic equivalence.",
        "A valid register is not a decision, an approval, or downstream authorization.",
    ]
    if not isinstance(document, dict):
        return {
            "valid": False,
            "errors": [_issue("$", "the register must be a JSON object")],
            "warnings": [],
            "statistics": {},
            "limitations": limitations,
        }

    errors = schema_errors(document, schema)
    warnings: list[dict[str, str]] = []
    if not errors:
        semantic, warnings = semantic_errors(document)
        errors.extend(semantic)

    session = document.get("session", {}) if isinstance(document.get("session"), dict) else {}
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "statistics": {
            "profile": session.get("profile"),
            "intent": session.get("intent"),
            "participation_mode": session.get("participation_mode"),
            "participants": len(session.get("participants", []) or []),
            "candidates": len(document.get("candidates", []) or []),
            "assumptions": len(document.get("assumptions", []) or []),
            "criteria": len(document.get("criteria", []) or []),
            "ratings": len(document.get("ratings", []) or []),
            "evidence_requests": len(document.get("evidence_requests", []) or []),
            "dispositions": len(document.get("decision_log", []) or []),
            "approved": isinstance(document.get("approval"), dict),
            "errors": len(errors),
            "warnings": len(warnings),
        },
        "limitations": limitations,
    }


def load_schema() -> dict[str, Any]:
    """Load the bundled register schema."""

    try:
        return json.loads(SCHEMA_PATH.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CliError(f"cannot load the bundled register schema: {exc}") from exc


def build_parser() -> argparse.ArgumentParser:
    """Create the command-line parser."""

    parser = argparse.ArgumentParser(
        description=(
            "Validate the structure, provenance, profile fit, gates, routing, and "
            "dispositions of an ideation register. No network or model call is made."
        )
    )
    parser.add_argument("input", help="Session register .json file")
    parser.add_argument("--output", help="Optional validation-report .json file")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Return exit status 1 for warnings as well as errors",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Explicitly replace an existing regular output file",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run register validation."""

    args = build_parser().parse_args(argv)
    try:
        schema = load_schema()
        _, document = read_json(args.input, label="register")
        report = validate_register(document, schema)
        emit_json(report, args.output, force=args.force)
    except CliError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    if not report["valid"] or (args.strict and report["warnings"]):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
