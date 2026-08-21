"""Freeze an approved ideation snapshot from a validated register.

Original Quasar script. It refuses to produce a snapshot without a valid
register, a named decision owner, a disposition for every candidate, and an
explicit approval block. It never assigns a lifecycle state of its own: the
snapshot always carries `lifecycle: Working`, and the adopting workflow's root
orchestrator performs any transition in the artifact index.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from typing import Any

sys.dont_write_bytecode = True

from _common import CliError, read_json, require_identifier, require_text, write_text
from validate_register import load_schema, validate_register

OPEN_REQUEST_STATUSES = {"open", "routed"}


def _scalar(value: Any) -> str:
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return json.dumps(value)
    return json.dumps(str(value), ensure_ascii=False)


def _lines(value: Any, indent: int) -> list[str]:
    """Render the deterministic YAML subset this package parses."""

    pad = " " * indent
    out: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            if isinstance(item, (dict, list)) and item:
                out.append(f"{pad}{key}:")
                out.extend(_lines(item, indent + 2))
            elif isinstance(item, dict):
                out.append(f"{pad}{key}: {{}}")
            elif isinstance(item, list):
                out.append(f"{pad}{key}: []")
            else:
                out.append(f"{pad}{key}: {_scalar(item)}")
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, (dict, list)) and item:
                nested = _lines(item, indent + 2)
                out.append(f"{pad}- {nested[0].lstrip()}")
                out.extend(nested[1:])
            elif isinstance(item, dict):
                out.append(f"{pad}- {{}}")
            elif isinstance(item, list):
                out.append(f"{pad}- []")
            else:
                out.append(f"{pad}- {_scalar(item)}")
    return out


def dump_yaml(document: dict[str, Any]) -> str:
    """Serialize the snapshot as YAML."""

    return "\n".join(_lines(document, 0)) + "\n"


def _artifact_ref(raw: str | None, label: str) -> dict[str, str] | None:
    """Parse `ARTIFACT_ID@VERSION` into an exact reference."""

    if raw is None:
        return None
    artifact_id, separator, version = raw.partition("@")
    if not separator:
        raise CliError(f"{label} must be ARTIFACT_ID@VERSION")
    return {
        "artifact_id": require_identifier(artifact_id.strip(), label),
        "version": require_text(version, f"{label} version", maximum=64),
    }


def build_baseline(
    register: dict[str, Any],
    *,
    baseline_id: str,
    version: str,
    as_of: str,
    register_version: str,
    evaluation_ref: dict[str, str] | None,
) -> dict[str, Any]:
    """Build the frozen snapshot; raise when the register is not freezable."""

    session = register.get("session", {})
    decision = register.get("decision_context", {})
    if not decision.get("decision_ref") or not decision.get("owner_ref"):
        raise CliError("a snapshot requires a decision reference and an accountable owner")

    approval = register.get("approval")
    if not isinstance(approval, dict):
        raise CliError("a snapshot requires an approval block; the session is not approved")
    for key in ("approved_by", "approval_ref", "approved_at"):
        if not isinstance(approval.get(key), str) or not approval[key].strip():
            raise CliError(f"approval requires a non-empty {key}")

    candidates = {
        candidate.get("candidate_id"): candidate
        for candidate in register.get("candidates", [])
        if isinstance(candidate, dict)
    }
    if not candidates:
        raise CliError("a snapshot requires at least one candidate")

    dispositions: list[dict[str, Any]] = []
    decided: set[str] = set()
    for entry in register.get("decision_log", []):
        if not isinstance(entry, dict):
            continue
        candidate_ref = entry.get("candidate_ref")
        candidate = candidates.get(candidate_ref)
        if candidate is None:
            raise CliError(f"disposition references unknown candidate {candidate_ref!r}")
        decided.add(candidate_ref)
        if entry.get("disposition") == "advance":
            if not candidate.get("assumption_refs"):
                raise CliError(f"{candidate_ref} advances without a recorded assumption")
            if not candidate.get("uncertainties"):
                raise CliError(f"{candidate_ref} advances without a recorded uncertainty")
        dispositions.append(
            {
                "candidate_ref": candidate_ref,
                "kind": candidate.get("kind"),
                "disposition": entry.get("disposition"),
                "rationale": entry.get("rationale"),
                "unresolved_assumption_refs": [
                    reference
                    for reference in candidate.get("assumption_refs", []) or []
                    if reference in _unresolved_assumptions(register)
                ],
                "gate_refs": _gate_refs(register, candidate_ref),
                "recommended_route": entry.get("recommended_route"),
            }
        )

    missing = sorted(set(candidates) - decided)
    if missing:
        raise CliError("every candidate needs one disposition; missing: %s" % ", ".join(missing))

    return {
        "schema_version": "1.0",
        "baseline": {
            "baseline_id": require_identifier(baseline_id, "baseline ID"),
            "version": require_text(version, "version", maximum=64),
            "lifecycle": "Working",
            "profile": session.get("profile"),
            "intent": session.get("intent"),
            "participation_mode": session.get("participation_mode"),
            "as_of": as_of,
        },
        "decision_context": {
            "decision_ref": decision.get("decision_ref"),
            "owner_ref": decision.get("owner_ref"),
            "decision_statement": decision.get("decision_statement"),
            "time_horizon": decision.get("time_horizon") or "unstated",
        },
        "source_register": {
            "artifact_id": session.get("session_id"),
            "version": require_text(register_version, "register version", maximum=64),
        },
        "evaluation_ref": evaluation_ref,
        "criteria_applied": [
            {
                "criterion_id": criterion.get("criterion_id"),
                "name": criterion.get("name"),
                "direction": criterion.get("direction"),
                "weight": criterion.get("weight"),
            }
            for criterion in register.get("criteria", [])
            if isinstance(criterion, dict)
        ],
        "gates_applied": [
            {
                "gate_id": gate.get("gate_id"),
                "name": gate.get("name"),
                "result": gate.get("result"),
                "owner_ref": gate.get("owner_ref"),
            }
            for gate in register.get("gate_reviews", [])
            if isinstance(gate, dict)
        ],
        "candidate_dispositions": dispositions,
        "evidence_requests": [
            {
                "request_id": request.get("request_id"),
                "candidate_refs": list(request.get("candidate_refs", []) or []),
                "uncertainty": request.get("uncertainty"),
                "decision_impact": request.get("decision_impact"),
                "recommended_route": request.get("recommended_route"),
            }
            for request in register.get("evidence_requests", [])
            if isinstance(request, dict) and request.get("status") in OPEN_REQUEST_STATUSES
        ],
        "dissent": [
            {
                "participant_ref": record.get("participant_ref"),
                "statement": record.get("statement"),
            }
            for record in register.get("dissent", [])
            if isinstance(record, dict)
        ],
        "limitations": list(register.get("limitations", []) or []),
        "approval": {
            "approved_by": approval["approved_by"],
            "approval_ref": approval["approval_ref"],
            "approved_at": approval["approved_at"],
        },
    }


def _unresolved_assumptions(register: dict[str, Any]) -> set[str]:
    return {
        assumption.get("assumption_id")
        for assumption in register.get("assumptions", [])
        if isinstance(assumption, dict)
        and assumption.get("status") in {"untested", "partially-supported", "challenged"}
    }


def _gate_refs(register: dict[str, Any], candidate_ref: str) -> list[str]:
    return [
        gate.get("gate_id")
        for gate in register.get("gate_reviews", [])
        if isinstance(gate, dict) and candidate_ref in (gate.get("candidate_refs") or [])
    ]


def build_parser() -> argparse.ArgumentParser:
    """Create the command-line parser."""

    parser = argparse.ArgumentParser(
        description=(
            "Freeze an approved ideation snapshot from a validated register. The snapshot "
            "records dispositions and the authorized handoff; it never assigns a lifecycle "
            "state, adopts itself downstream, or makes a candidate true."
        )
    )
    parser.add_argument("input", help="Session register .json file")
    parser.add_argument("--baseline-id", required=True, help="Stable snapshot ID")
    parser.add_argument("--version", required=True, help="Snapshot version, for example 1.0")
    parser.add_argument("--as-of", required=True, help="Explicit ISO date; no date is invented")
    parser.add_argument(
        "--register-version",
        required=True,
        help="Exact frozen register version this snapshot refers to",
    )
    parser.add_argument("--evaluation-ref", help="Evaluation artifact as ARTIFACT_ID@VERSION")
    parser.add_argument("--output", help="Destination .yaml file in an existing directory")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Explicitly replace an existing regular output file",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Freeze the snapshot."""

    args = build_parser().parse_args(argv)
    try:
        _, register = read_json(args.input, label="register")
        report = validate_register(register, load_schema())
        if not report["valid"]:
            print("error: the register is not valid; run validate_register.py", file=sys.stderr)
            print(json.dumps(report["errors"], ensure_ascii=False, indent=2), file=sys.stderr)
            return 1
        baseline = build_baseline(
            register,
            baseline_id=args.baseline_id,
            version=args.version,
            as_of=args.as_of,
            register_version=args.register_version,
            evaluation_ref=_artifact_ref(args.evaluation_ref, "evaluation ref"),
        )
        text = dump_yaml(baseline)
        if args.output is None:
            print(text, end="")
        else:
            write_text(args.output, text, suffixes={".yaml", ".yml"}, force=args.force)
    except CliError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
