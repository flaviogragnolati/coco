"""Generate a deterministic JSON scaffold for an ideation session register.

Adapted from `scripts/session_scaffold.py` of the MIT-licensed
`scientific-brainstorming` skill, copyright (c) 2025 K-Dense Inc.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from typing import Any

sys.dont_write_bytecode = True

from _common import (
    CliError,
    bounded_strings,
    emit_json,
    require_identifier,
    require_iso_date,
    require_text,
)

PROFILES = ("scientific", "product", "consulting", "general")
INTENTS = (
    "frame-problem",
    "generate-options",
    "stress-test-options",
    "reopen-after-evidence",
)
PARTICIPATION_MODES = (
    "facilitated-human",
    "solo-assisted",
    "asynchronous",
    "agent-only",
)
CLASSIFICATIONS = (
    "public",
    "internal",
    "client-confidential",
    "personal-data",
    "regulated",
    "restricted",
    "not-assessed",
)
EXTERNAL_AI_USE = (
    "permitted",
    "permitted-with-abstraction",
    "prohibited",
    "not-assessed",
)
WORKFLOW_STAGES = (
    "frame",
    "perspective-map",
    "independent-generation",
    "structured-sharing",
    "structuring",
    "criteria-and-gates",
    "independent-evaluation",
    "adversarial-review",
    "evidence-routing",
    "disposition-and-snapshot",
)


def _participant(raw: str, index: int, kind: str) -> dict[str, str]:
    """Parse `REF` or `REF=role` into one participant record."""

    reference, separator, role = raw.partition("=")
    label = f"{kind} participant {index + 1}"
    return {
        "participant_ref": require_identifier(reference.strip(), label),
        "kind": kind,
        "role": require_text(role, f"{label} role", maximum=200) if separator else "",
    }


def _input_ref(raw: str, index: int) -> dict[str, Any]:
    """Parse `ARTIFACT_ID@VERSION` into one versioned input reference."""

    artifact_id, separator, version = raw.partition("@")
    label = f"input ref {index + 1}"
    return {
        "artifact_id": require_identifier(artifact_id.strip(), label),
        "version": require_text(version, f"{label} version", maximum=64)
        if separator
        else None,
        "authority": "supporting",
        "usage": "session-input",
    }


def build_scaffold(
    *,
    session_id: str,
    title: str,
    profile: str,
    intent: str,
    participation_mode: str,
    decision_statement: str,
    decision_ref: str | None = None,
    decision_owner: str | None = None,
    time_horizon: str | None = None,
    session_date: str | None = None,
    facilitator: str | None = None,
    participants: Sequence[str] = (),
    synthetic_lenses: Sequence[str] = (),
    input_refs: Sequence[str] = (),
    in_scope: Sequence[str] = (),
    out_of_scope: Sequence[str] = (),
    constraints: Sequence[str] = (),
    perspectives: Sequence[str] = (),
    classification: str = "not-assessed",
    external_ai_use: str = "not-assessed",
) -> dict[str, Any]:
    """Build an empty register from explicit inputs; nothing is invented."""

    if profile not in PROFILES:
        raise CliError(f"profile must be one of {list(PROFILES)}")
    if intent not in INTENTS:
        raise CliError(f"intent must be one of {list(INTENTS)}")
    if participation_mode not in PARTICIPATION_MODES:
        raise CliError(f"participation mode must be one of {list(PARTICIPATION_MODES)}")
    if classification not in CLASSIFICATIONS:
        raise CliError(f"classification must be one of {list(CLASSIFICATIONS)}")
    if external_ai_use not in EXTERNAL_AI_USE:
        raise CliError(f"external AI use must be one of {list(EXTERNAL_AI_USE)}")

    people = [_participant(raw, index, "human") for index, raw in enumerate(participants)]
    people.extend(
        _participant(raw, index, "synthetic-lens")
        for index, raw in enumerate(synthetic_lenses)
    )
    if not people and participation_mode != "agent-only":
        raise CliError(
            "at least one participant is required unless participation mode is agent-only"
        )
    if len(people) > 100:
        raise CliError("participant count exceeds the limit of 100")
    references = [record["participant_ref"] for record in people]
    if len(set(references)) != len(references):
        raise CliError("participant references must be unique")
    if facilitator is not None and facilitator not in references:
        raise CliError("facilitator must be one of the listed participants")

    return {
        "schema_version": "1.0",
        "session": {
            "session_id": require_identifier(session_id, "session ID"),
            "title": require_text(title, "title", maximum=200),
            "profile": profile,
            "intent": intent,
            "participation_mode": participation_mode,
            "date": require_iso_date(session_date, "session date")
            if session_date is not None
            else None,
            "facilitator_ref": facilitator,
            "participants": people,
        },
        "decision_context": {
            "decision_ref": require_identifier(decision_ref, "decision ref")
            if decision_ref is not None
            else None,
            "owner_ref": require_identifier(decision_owner, "decision owner")
            if decision_owner is not None
            else None,
            "decision_statement": require_text(
                decision_statement,
                "decision statement",
                maximum=2_000,
            ),
            "time_horizon": require_text(time_horizon, "time horizon", maximum=200)
            if time_horizon is not None
            else None,
            "controllable_levers": [],
            "non_controllable_factors": [],
        },
        "input_refs": [_input_ref(raw, index) for index, raw in enumerate(input_refs)],
        "scope": {
            "in_scope": bounded_strings(in_scope, "in-scope items"),
            "out_of_scope": bounded_strings(out_of_scope, "out-of-scope items"),
            "constraints": [
                {"statement": statement, "classification": "unclassified"}
                for statement in bounded_strings(constraints, "constraints")
            ],
            "prohibited_outputs": [],
        },
        "information_governance": {
            "classification": classification,
            "external_ai_use": external_ai_use,
            "approved_record_location": None,
        },
        "workflow": [
            {
                "order": index + 1,
                "stage": stage,
                "status": "pending",
                "method_or_deviation": None,
            }
            for index, stage in enumerate(WORKFLOW_STAGES)
        ],
        "perspectives": {
            "represented": bounded_strings(perspectives, "perspectives"),
            "affected_not_represented": [],
            "missing": [],
            "conflicts_or_power_asymmetries": [],
        },
        "candidates": [],
        "assumptions": [],
        "clusters": [],
        "merge_log": [],
        "criteria": [],
        "ratings": [],
        "adversarial_reviews": [],
        "evidence_requests": [],
        "evidence_links": [],
        "gate_reviews": [],
        "decision_log": [],
        "dissent": [],
        "ai_use": [],
        "deviations": [],
        "limitations": [],
        "approval": None,
    }


def build_parser() -> argparse.ArgumentParser:
    """Create the command-line parser."""

    parser = argparse.ArgumentParser(
        description=(
            "Generate a deterministic ideation session register scaffold. "
            "No network, model, or database call is made and no date is invented."
        )
    )
    parser.add_argument("--session-id", required=True, help="Stable session ID")
    parser.add_argument("--title", required=True, help="Session title")
    parser.add_argument("--profile", required=True, choices=list(PROFILES))
    parser.add_argument("--intent", required=True, choices=list(INTENTS))
    parser.add_argument(
        "--participation-mode",
        required=True,
        choices=list(PARTICIPATION_MODES),
    )
    parser.add_argument(
        "--decision-statement",
        required=True,
        help="What the owner must actually decide",
    )
    parser.add_argument("--decision-ref", help="Stable decision ID when one exists")
    parser.add_argument("--decision-owner", help="Accountable decision owner reference")
    parser.add_argument("--time-horizon", help="Decision horizon, for example 'Q4 2026'")
    parser.add_argument("--date", dest="session_date", help="Explicit ISO date")
    parser.add_argument("--facilitator", help="Participant reference of the facilitator")
    parser.add_argument(
        "--participant",
        action="append",
        default=[],
        dest="participants",
        help="Human participant as REF or REF=role; repeat as needed",
    )
    parser.add_argument(
        "--synthetic-lens",
        action="append",
        default=[],
        dest="synthetic_lenses",
        help="Disclosed AI lens as REF or REF=role; never a consulted stakeholder",
    )
    parser.add_argument(
        "--input-ref",
        action="append",
        default=[],
        dest="input_refs",
        help="Input artifact as ARTIFACT_ID@VERSION; repeat as needed",
    )
    parser.add_argument("--in-scope", action="append", default=[])
    parser.add_argument("--out-of-scope", action="append", default=[])
    parser.add_argument("--constraint", action="append", default=[])
    parser.add_argument("--perspective", action="append", default=[])
    parser.add_argument(
        "--classification",
        default="not-assessed",
        choices=list(CLASSIFICATIONS),
        help="Information classification for the session record",
    )
    parser.add_argument(
        "--external-ai-use",
        default="not-assessed",
        choices=list(EXTERNAL_AI_USE),
    )
    parser.add_argument("--output", help="Destination .json file in an existing directory")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Explicitly replace an existing regular output file",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the scaffold generator."""

    args = build_parser().parse_args(argv)
    try:
        payload = build_scaffold(
            session_id=args.session_id,
            title=args.title,
            profile=args.profile,
            intent=args.intent,
            participation_mode=args.participation_mode,
            decision_statement=args.decision_statement,
            decision_ref=args.decision_ref,
            decision_owner=args.decision_owner,
            time_horizon=args.time_horizon,
            session_date=args.session_date,
            facilitator=args.facilitator,
            participants=args.participants,
            synthetic_lenses=args.synthetic_lenses,
            input_refs=args.input_refs,
            in_scope=args.in_scope,
            out_of_scope=args.out_of_scope,
            constraints=args.constraint,
            perspectives=args.perspective,
            classification=args.classification,
            external_ai_use=args.external_ai_use,
        )
        emit_json(payload, args.output, force=args.force)
    except CliError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
