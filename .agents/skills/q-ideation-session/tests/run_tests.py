"""Offline behavior tests for the q-ideation-session CLIs.

Run from anywhere:

    python3 skills/ideation/q-ideation-session/tests/run_tests.py
"""

from __future__ import annotations

import copy
import json
import sys
import tempfile
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
FIXTURES = SKILL_ROOT / "tests" / "fixtures"
sys.path.insert(0, str(SKILL_ROOT / "scripts"))
sys.dont_write_bytecode = True

import evaluate_matrix  # noqa: E402
import freeze_baseline  # noqa: E402
import session_scaffold  # noqa: E402
import validate_register  # noqa: E402
from _common import CliError  # noqa: E402

SCHEMA = validate_register.load_schema()
FAILURES: list[str] = []


def check(condition: bool, label: str) -> None:
    print("%s %s" % ("ok  " if condition else "FAIL", label))
    if not condition:
        FAILURES.append(label)


def messages(report: dict) -> str:
    return json.dumps(report["errors"], ensure_ascii=False)


def load_valid() -> dict:
    return json.loads((FIXTURES / "product-session.valid.json").read_text(encoding="utf-8"))


def test_scaffold() -> None:
    scaffold = session_scaffold.build_scaffold(
        session_id="IS-900",
        title="Scaffold smoke",
        profile="consulting",
        intent="frame-problem",
        participation_mode="facilitated-human",
        decision_statement="Which intervention to propose first.",
        decision_ref="DEC-900",
        decision_owner="P-001",
        participants=["P-001=partner"],
        input_refs=["DISC-BRIEF-001@1.2"],
    )
    report = validate_register.validate_register(scaffold, SCHEMA)
    check(report["valid"], "an empty scaffold is a valid register: %s" % messages(report))
    check(scaffold["approval"] is None, "a scaffold starts unapproved")
    check(scaffold["session"]["date"] is None, "no session date is invented")

    try:
        session_scaffold.build_scaffold(
            session_id="IS-901",
            title="No participants",
            profile="product",
            intent="generate-options",
            participation_mode="facilitated-human",
            decision_statement="Anything.",
        )
        check(False, "a facilitated session without participants is rejected")
    except CliError:
        check(True, "a facilitated session without participants is rejected")


def test_valid_register() -> None:
    report = validate_register.validate_register(load_valid(), SCHEMA)
    check(report["valid"], "the product fixture validates: %s" % messages(report))
    check(report["statistics"]["dispositions"] == 3, "every candidate carries a disposition")


def test_transient_orientation() -> None:
    document = load_valid()
    document["input_refs"].append({
        "orientation_id": "ORI-001",
        "kind": "transient-orientation",
        "producer": "q-code-explore",
        "scope": "checkout module structure and observed state transitions",
        "observed_at": "2026-08-14",
        "source_refs": ["src/checkout/state.ts", "src/checkout/routes.ts"],
        "limitations": ["No runtime trace was inspected."],
        "authority": "none",
        "usage": "opportunity-current-state",
    })
    report = validate_register.validate_register(document, SCHEMA)
    check(report["valid"], "traceable transient orientation is accepted")

    user_supplied = copy.deepcopy(document)
    user_supplied["input_refs"][-1]["orientation_id"] = "ORI-002"
    user_supplied["input_refs"][-1]["producer"] = "user"
    user_supplied["input_refs"][-1]["source_refs"] = ["session current-state context"]
    report = validate_register.validate_register(user_supplied, SCHEMA)
    check(report["valid"], "traceable user-supplied orientation is accepted")

    invalid = copy.deepcopy(document)
    invalid["input_refs"][-1]["limitations"] = []
    report = validate_register.validate_register(invalid, SCHEMA)
    check(
        not report["valid"] and "requires provenance" in messages(report),
        "transient orientation without limitations is rejected",
    )

    invalid = copy.deepcopy(document)
    invalid["session"]["intent"] = "reopen-after-evidence"
    invalid["input_refs"] = [invalid["input_refs"][-1]]
    report = validate_register.validate_register(invalid, SCHEMA)
    check(
        not report["valid"] and "formal artifact ID and exact version" in messages(report),
        "transient orientation cannot satisfy reopen-after-evidence",
    )


def mutated(mutate) -> dict:
    document = load_valid()
    mutate(document)
    return validate_register.validate_register(document, SCHEMA)


def test_rejections() -> None:
    cases = [
        (
            "a scientific candidate kind is rejected in a product session",
            lambda d: d["candidates"][0].update({"kind": "mechanism-hypothesis"}),
            "not a product candidate kind",
        ),
        (
            "an opportunity without an evidence status is rejected",
            lambda d: d["candidates"][1].pop("opportunity_evidence"),
            "requires an explicit evidence status",
        ),
        (
            "ratings before completed criteria are rejected",
            lambda d: d["workflow"][5].update({"status": "in-progress"}),
            "before the criteria-and-gates stage",
        ),
        (
            "a gate disguised as a criterion is rejected",
            lambda d: d["criteria"][0].update({"name": "gate_privacy"}),
            "outside the compensatory score",
        ),
        (
            "advancing through an unresolved gate is rejected",
            lambda d: d["gate_reviews"][1].update({"result": "review-required"}),
            "unresolved gate cannot advance",
        ),
        (
            "an evidence-needed disposition without a request is rejected",
            lambda d: d["evidence_requests"].clear(),
            "requires a routed evidence request",
        ),
        (
            "self-routing is rejected",
            lambda d: d["decision_log"][0]["recommended_route"].update({"skill": "q-ideation-session"}),
            "cannot be routed to this skill",
        ),
        (
            "AI candidates without a frozen human round are rejected",
            lambda d: d["ai_use"][0].update({"human_first_round_frozen": False}),
            "human-first round must be frozen",
        ),
        (
            "AI use under a prohibition is rejected",
            lambda d: d["information_governance"].update({"external_ai_use": "prohibited"}),
            "external AI use is prohibited",
        ),
        (
            "an unknown contributor is rejected",
            lambda d: d["candidates"][0]["provenance"]["contributor_refs"].append("P-999"),
            "is not a listed participant",
        ),
        (
            "an agent-only session cannot hold human candidates",
            lambda d: d["session"].update({"participation_mode": "agent-only"}),
            "cannot record non-AI candidate origins",
        ),
        (
            "two dispositions for one candidate are rejected",
            lambda d: d["decision_log"].append(dict(d["decision_log"][0], entry_id="DL-004")),
            "more than one disposition",
        ),
    ]
    for label, mutate, expected in cases:
        report = mutated(mutate)
        found = expected in messages(report)
        check(not report["valid"] and found, "%s (%s)" % (label, expected))


def test_matrix() -> None:
    criteria = evaluate_matrix.load_criteria(str(FIXTURES / "criteria.json"))
    rows = evaluate_matrix.load_scores(str(FIXTURES / "scores.csv"), criteria)
    result = evaluate_matrix.calculate_matrix(criteria, rows, weight_delta=0.10)
    first = result["results"][0]
    check(result["decision"] is None, "the matrix never selects a candidate")
    check(
        result["method"]["gate_columns_excluded_from_score"] == ["gate_privacy"],
        "gate columns stay outside the score",
    )
    check("gate_privacy" not in first["criteria"], "a gate column is never scored")
    check(first["gates"]["gate_privacy"] == "passed", "gate columns stay visible")
    # time_to_learning: (5-2)/4 = 0.75 at weight 0.6; user_value: (4-1)/4 = 0.75 at weight 0.4.
    check(abs(first["base_score"] - 75.0) < 0.001, "the disclosed formula is reproducible")
    check(
        first["input_uncertainty_score_interval"][0] < first["base_score"] < first["input_uncertainty_score_interval"][1],
        "input ranges widen the reported interval",
    )

    try:
        evaluate_matrix.load_criteria(str(FIXTURES / "criteria-gate.json"))
        check(False, "a gate-named criterion is rejected")
    except CliError:
        check(True, "a gate-named criterion is rejected")


def test_freeze() -> None:
    document = load_valid()
    baseline = freeze_baseline.build_baseline(
        document,
        baseline_id="IB-001",
        version="1.0",
        as_of="2026-08-13",
        register_version="1.3",
        evaluation_ref={"artifact_id": "IE-001", "version": "1.0"},
    )
    check(baseline["baseline"]["lifecycle"] == "Working", "a frozen snapshot stays Working")
    check(len(baseline["candidate_dispositions"]) == 3, "every candidate reaches the snapshot")
    check(baseline["approval"]["approval_ref"] == "APR-021", "the approval reference is carried")
    check(
        baseline["candidate_dispositions"][0]["unresolved_assumption_refs"] == ["ASM-001"],
        "unresolved assumptions travel with an advancing candidate",
    )
    text = freeze_baseline.dump_yaml(baseline)
    check(text.startswith('schema_version: "1.0"'), "the snapshot serializes as YAML")

    for label, mutate in (
        ("freezing without approval is refused", lambda d: d.update({"approval": None})),
        ("freezing without a decision owner is refused", lambda d: d["decision_context"].update({"owner_ref": None})),
        ("freezing with an undisposed candidate is refused", lambda d: d["decision_log"].pop()),
        (
            "advancing without a recorded uncertainty is refused",
            lambda d: d["candidates"][0].update({"uncertainties": []}),
        ),
    ):
        broken = copy.deepcopy(load_valid())
        mutate(broken)
        try:
            freeze_baseline.build_baseline(
                broken,
                baseline_id="IB-002",
                version="1.0",
                as_of="2026-08-13",
                register_version="1.3",
                evaluation_ref=None,
            )
            check(False, label)
        except CliError:
            check(True, label)


def test_output_safety() -> None:
    with tempfile.TemporaryDirectory() as directory:
        target = Path(directory) / "snapshot.yaml"
        freeze_baseline.write_text("%s" % target, "schema_version: \"1.0\"\n", suffixes={".yaml"})
        try:
            freeze_baseline.write_text("%s" % target, "overwrite\n", suffixes={".yaml"})
            check(False, "an existing output is not replaced without --force")
        except CliError:
            check(True, "an existing output is not replaced without --force")
        freeze_baseline.write_text("%s" % target, "forced\n", suffixes={".yaml"}, force=True)
        check(target.read_text(encoding="utf-8") == "forced\n", "--force replaces the output atomically")


def main() -> int:
    (FIXTURES / "criteria-gate.json").write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "criteria": [
                    {
                        "name": "gate_privacy",
                        "description": "A gate that must not be scored",
                        "weight": 1,
                        "direction": "higher",
                        "minimum": 1,
                        "maximum": 5,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    try:
        test_scaffold()
        test_valid_register()
        test_transient_orientation()
        test_rejections()
        test_matrix()
        test_freeze()
        test_output_safety()
    finally:
        (FIXTURES / "criteria-gate.json").unlink(missing_ok=True)
    print("\n%d checks failed" % len(FAILURES) if FAILURES else "\nall checks passed")
    return 1 if FAILURES else 0


if __name__ == "__main__":
    raise SystemExit(main())
