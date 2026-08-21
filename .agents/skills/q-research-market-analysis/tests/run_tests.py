#!/usr/bin/env python3
"""Deterministic offline tests for q-research-market-analysis CLIs."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).resolve().parent / "fixtures"
sys.path.insert(0, str(SKILL / "scripts"))

from _common import ValidationError, finding_ids, read_csv_records, read_document  # noqa: E402
from calculate_concentration import calculate as concentration  # noqa: E402
from calculate_market_sizing import calculate as sizing  # noqa: E402
from check_unit_consistency import FIELDS as UNIT_FIELDS, check as units  # noqa: E402
from forecast_sensitivity import forecast  # noqa: E402
from validate_competitor_matrix import FIELDS as COMPETITOR_FIELDS, validate as competitors  # noqa: E402
from validate_market_analysis import validate as validate_analysis  # noqa: E402


def load_json(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def expect_error(callback, label: str) -> None:
    try:
        callback()
    except ValidationError:
        return
    raise AssertionError(f"{label} did not fail")


def main() -> int:
    known = finding_ids(FIXTURES / "findings.valid.json")

    flow_document = read_document(FIXTURES / "flow.valid.yaml")
    assert flow_document["brief"]["brief_id"] == "RB-FLOW-001"
    assert flow_document["analysis_modules"] == ["market-sizing", "tam-sam-som", "scenario-analysis"]
    assert flow_document["measurement_contract"]["active"] is True

    sizing_report = sizing(load_json("sizing.valid.json"))
    assert sizing_report["method_estimates"] == {"top_down": 1000.0, "bottom_up": 900.0}
    assert sizing_report["reconciliation"]["within_tolerance"] is True
    divergent_sizing = load_json("sizing.valid.json")
    divergent_sizing["top_down"]["components"][0]["value"] = 2000
    divergent_report = sizing(divergent_sizing)
    assert divergent_report["reconciliation"]["within_tolerance"] is False
    assert divergent_report["warnings"]
    expect_error(lambda: sizing(load_json("sizing.invalid.json")), "duplicate sizing coverage")

    forecast_report = forecast(load_json("forecast.valid.json"))
    assert len(forecast_report["scenario_range_by_year"]) == 3
    assert forecast_report["scenarios"][0]["endpoint"] == 1210.0
    probabilistic_forecast = load_json("forecast.valid.json")
    probabilistic_forecast["scenarios"][0]["probability"] = 0.5
    expect_error(lambda: forecast(probabilistic_forecast), "unmodeled scenario probability")
    expect_error(lambda: forecast(load_json("forecast.invalid.json")), "identical forecast scenarios")

    concentration_report = concentration(load_json("shares.valid.json"))
    assert concentration_report["hhi"] == 3800.0
    assert concentration_report["crn"]["CR2"] == 80.0
    expect_error(lambda: concentration(load_json("shares.invalid.json")), "invalid concentration shares")

    units_valid = units(read_csv_records(FIXTURES / "units.valid.csv", UNIT_FIELDS), known)
    assert units_valid["valid"] is True
    units_invalid = units(read_csv_records(FIXTURES / "units.invalid.csv", UNIT_FIELDS), known)
    assert units_invalid["valid"] is False and units_invalid["errors"]

    competitors_valid = competitors(read_csv_records(FIXTURES / "competitors.valid.csv", COMPETITOR_FIELDS), known)
    assert competitors_valid["valid"] is True and competitors_valid["expected_pair_count"] == 4
    competitors_invalid = competitors(read_csv_records(FIXTURES / "competitors.invalid.csv", COMPETITOR_FIELDS), known)
    assert competitors_invalid["valid"] is False and competitors_invalid["errors"]

    artifact = read_document(SKILL / "assets" / "market-analysis.example.yaml")
    brief = read_document(FIXTURES / "brief.valid.json")
    findings = read_document(FIXTURES / "findings.valid.json")
    artifact_report = validate_analysis(artifact, known, brief, findings)
    assert artifact_report["valid"] is True, artifact_report
    wrong_inputs = validate_analysis(
        artifact,
        known,
        {**brief, "brief": {**brief["brief"], "version": "2.0"}},
        {**findings, "register": {**findings["register"], "register_id": "FR-OTHER-001"}},
    )
    assert wrong_inputs["valid"] is False
    assert any("Brief ID and version" in error for error in wrong_inputs["errors"])
    assert any("Findings Register ID and version" in error for error in wrong_inputs["errors"])
    invalid = dict(artifact)
    invalid["published_results"] = [dict(artifact["published_results"][0], calculation_ref="CALC-404")]
    invalid_report = validate_analysis(invalid, known, read_document(FIXTURES / "brief.valid.json"))
    assert invalid_report["valid"] is False and invalid_report["errors"]

    print("q-research-market-analysis tests: 16 passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
