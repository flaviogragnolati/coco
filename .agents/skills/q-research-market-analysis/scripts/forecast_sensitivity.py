#!/usr/bin/env python3
"""Generate Quasar scenario forecasts and one-way sensitivity.

Adapted from K-Dense Inc.'s MIT-licensed `market-research-reports` script at
commit 13385c7c4db02fdcc84a020752c07cce91ef780e. Copyright (c) 2025
K-Dense Inc.
"""

from __future__ import annotations

import argparse
from typing import Any

from _common import ValidationError, error_exit, number, read_json, require_identifier, require_list, require_object, require_text, require_unique, write_json


def _project(start_year: int, start_value: float, rates: list[float]) -> list[dict[str, float | int]]:
    result: list[dict[str, float | int]] = [{"year": start_year, "value": start_value}]
    value = start_value
    for offset, rate in enumerate(rates, 1):
        value *= 1 + rate
        if not 0 <= value <= 1e18:
            raise ValidationError("forecast exceeds the numeric bound")
        result.append({"year": start_year + offset, "value": value, "growth_rate": rate})
    return result


def forecast(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("schema_version") != "1.0":
        raise ValidationError("schema_version must be '1.0'")
    known_findings = set(require_list(payload.get("known_finding_ids"), "known_finding_ids", 1, 10_000))
    known_assumptions = set(require_list(payload.get("known_assumption_ids"), "known_assumption_ids", 1, 10_000))
    start_year = payload.get("start_year")
    horizon = payload.get("horizon_years")
    if type(start_year) is not int or not 1800 <= start_year <= 2200:
        raise ValidationError("start_year must be an integer from 1800 through 2200")
    if type(horizon) is not int or not 1 <= horizon <= 50:
        raise ValidationError("horizon_years must be an integer from 1 through 50")
    start_value = number(payload.get("start_value"), "start_value", 0.0)
    base_finding_ref = require_identifier(payload.get("base_finding_ref"), "base_finding_ref")
    if base_finding_ref not in known_findings:
        raise ValidationError("base_finding_ref is not registered")

    raw_scenarios = require_list(payload.get("scenarios"), "scenarios", 2, 20)
    scenario_ids: list[str] = []
    paths: set[tuple[float, ...]] = set()
    rates_by_id: dict[str, list[float]] = {}
    scenarios: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_scenarios):
        row = require_object(raw, f"scenarios[{index}]")
        if "probability" in row:
            raise ValidationError("scenario probabilities require a separately validated probabilistic model")
        scenario_id = require_identifier(row.get("scenario_id"), f"scenarios[{index}].scenario_id")
        scenario_ids.append(scenario_id)
        rates = [number(value, f"{scenario_id}.annual_growth_rates[{position}]", -0.99, 10.0) for position, value in enumerate(require_list(row.get("annual_growth_rates"), f"{scenario_id}.annual_growth_rates", horizon, horizon))]
        paths.add(tuple(rates))
        rates_by_id[scenario_id] = rates
        assumption_refs = [require_identifier(value, f"{scenario_id}.assumption_refs[{position}]") for position, value in enumerate(require_list(row.get("assumption_refs"), f"{scenario_id}.assumption_refs", 1, 100))]
        missing = sorted(set(assumption_refs) - known_assumptions)
        if missing:
            raise ValidationError(f"{scenario_id} contains unknown assumptions: {', '.join(missing)}")
        invalidation = [require_text(value, f"{scenario_id}.invalidation_conditions[{position}]") for position, value in enumerate(require_list(row.get("invalidation_conditions"), f"{scenario_id}.invalidation_conditions", 1, 100))]
        observations = _project(start_year, start_value, rates)
        scenarios.append({"scenario_id": scenario_id, "label": require_text(row.get("label"), f"{scenario_id}.label"), "assumption_refs": assumption_refs, "invalidation_conditions": invalidation, "annual_growth_rates": rates, "observations": observations, "endpoint": observations[-1]["value"]})
    require_unique(scenario_ids, "scenario IDs")
    if len(paths) < 2:
        raise ValidationError("at least two scenarios must use different rate paths")

    sensitivity = require_object(payload.get("sensitivity"), "sensitivity")
    base_id = require_identifier(sensitivity.get("base_scenario_id"), "sensitivity.base_scenario_id")
    if base_id not in rates_by_id:
        raise ValidationError("sensitivity.base_scenario_id must reference a scenario")
    shifts = [number(value, f"sensitivity.growth_rate_shifts[{index}]", -0.5, 0.5) for index, value in enumerate(require_list(sensitivity.get("growth_rate_shifts"), "sensitivity.growth_rate_shifts", 2, 21))]
    if len(shifts) != len(set(shifts)):
        raise ValidationError("growth-rate shifts must be unique")
    sensitivity_rows: list[dict[str, Any]] = []
    for shift in sorted(shifts):
        shifted = [rate + shift for rate in rates_by_id[base_id]]
        if any(rate < -0.99 or rate > 10 for rate in shifted):
            raise ValidationError(f"sensitivity shift {shift} creates an invalid rate")
        observations = _project(start_year, start_value, shifted)
        sensitivity_rows.append({"growth_rate_shift": shift, "endpoint": observations[-1]["value"], "observations": observations})
    ranges = []
    for offset in range(horizon + 1):
        values = [float(item["observations"][offset]["value"]) for item in scenarios]
        ranges.append({"year": start_year + offset, "minimum": min(values), "maximum": max(values)})
    return {"schema_version": "1.0", "base_finding_ref": base_finding_ref, "start_year": start_year, "start_value": start_value, "horizon_years": horizon, "scenarios": scenarios, "scenario_range_by_year": ranges, "sensitivity": {"base_scenario_id": base_id, "results": sensitivity_rows}, "interpretation": "Conditional scenarios, not confidence intervals or assigned probabilities."}


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Generate bounded local market forecasts and one-way growth sensitivity with no network or randomness.")
    result.add_argument("input", help="Local JSON forecast input")
    result.add_argument("--output", help="Optional JSON output")
    result.add_argument("--force", action="store_true", help="Replace an existing output")
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        write_json(forecast(require_object(read_json(args.input), "root")), args.output, force=args.force)
        return 0
    except ValidationError as exc:
        return error_exit(exc)


if __name__ == "__main__":
    raise SystemExit(main())
