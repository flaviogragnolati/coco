#!/usr/bin/env python3
"""Calculate Quasar TAM/SAM/SOM scenarios and method reconciliation.

Adapted from K-Dense Inc.'s MIT-licensed `market-research-reports` script at
commit 13385c7c4db02fdcc84a020752c07cce91ef780e. Copyright (c) 2025
K-Dense Inc.
"""

from __future__ import annotations

import argparse
from typing import Any

from _common import ValidationError, error_exit, fraction, number, read_json, require_identifier, require_list, require_object, require_text, require_unique, write_json


def _ids(value: Any, context: str, known: set[str], minimum: int = 0) -> list[str]:
    values = [require_identifier(item, f"{context}[{index}]") for index, item in enumerate(require_list(value, context, minimum, 100))]
    require_unique(values, context)
    missing = sorted(set(values) - known)
    if missing:
        raise ValidationError(f"{context} contains unknown IDs: {', '.join(missing)}")
    return values


def calculate(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("schema_version") != "1.0":
        raise ValidationError("schema_version must be '1.0'")
    known_findings = set(require_list(payload.get("known_finding_ids"), "known_finding_ids", 1, 10_000))
    known_assumptions = set(require_list(payload.get("known_assumption_ids"), "known_assumption_ids", 1, 10_000))
    measurement = require_object(payload.get("measurement"), "measurement")
    denominator = require_identifier(measurement.get("denominator_id"), "measurement.denominator_id")
    unit = require_text(measurement.get("unit"), "measurement.unit", maximum=80)

    method_values: dict[str, float] = {}
    method_keys: dict[str, list[str]] = {}
    for method in ("top_down", "bottom_up"):
        rows = require_list(require_object(payload.get(method), method).get("components"), f"{method}.components", 1, 1_000)
        ids: list[str] = []
        coverage: list[str] = []
        total = 0.0
        for index, raw in enumerate(rows):
            row = require_object(raw, f"{method}.components[{index}]")
            component_id = require_identifier(row.get("component_id"), f"{method}.components[{index}].component_id")
            ids.append(component_id)
            coverage.append(require_identifier(row.get("coverage_key"), f"{method}.components[{index}].coverage_key"))
            if row.get("denominator_id") != denominator:
                raise ValidationError(f"{component_id} does not use denominator {denominator!r}")
            _ids(row.get("finding_refs"), f"{component_id}.finding_refs", known_findings, 1)
            _ids(row.get("assumption_refs", []), f"{component_id}.assumption_refs", known_assumptions)
            if method == "top_down":
                value = number(row.get("value"), f"{component_id}.value", 0.0)
            else:
                value = (
                    number(row.get("customer_count"), f"{component_id}.customer_count", 0.0)
                    * fraction(row.get("addressable_fraction"), f"{component_id}.addressable_fraction")
                    * number(row.get("annual_quantity_per_customer"), f"{component_id}.annual_quantity_per_customer", 0.0)
                    * number(row.get("price_per_unit"), f"{component_id}.price_per_unit", 0.0)
                )
            total += value
            if total > 1e18:
                raise ValidationError(f"{method} total exceeds the numeric bound")
        require_unique(ids, f"{method} component IDs")
        require_unique(coverage, f"{method} coverage keys (possible double counting)")
        method_values[method] = total
        method_keys[method] = coverage

    scenarios_raw = require_list(payload.get("scenarios"), "scenarios", 2, 20)
    scenarios: list[dict[str, Any]] = []
    scenario_ids: list[str] = []
    signatures: set[tuple[float, float]] = set()
    for index, raw in enumerate(scenarios_raw):
        row = require_object(raw, f"scenarios[{index}]")
        scenario_id = require_identifier(row.get("scenario_id"), f"scenarios[{index}].scenario_id")
        scenario_ids.append(scenario_id)
        serviceable = fraction(row.get("serviceable_fraction"), f"{scenario_id}.serviceable_fraction")
        obtainable = fraction(row.get("obtainable_share"), f"{scenario_id}.obtainable_share")
        signatures.add((serviceable, obtainable))
        assumption_refs = _ids(row.get("assumption_refs"), f"{scenario_id}.assumption_refs", known_assumptions, 1)
        invalidation = [require_text(value, f"{scenario_id}.invalidation_conditions[{position}]") for position, value in enumerate(require_list(row.get("invalidation_conditions"), f"{scenario_id}.invalidation_conditions", 1, 100))]
        methods = {
            method: {"tam": tam, "sam": tam * serviceable, "som": tam * serviceable * obtainable}
            for method, tam in method_values.items()
        }
        scenarios.append({"scenario_id": scenario_id, "label": require_text(row.get("label"), f"{scenario_id}.label"), "assumption_refs": assumption_refs, "invalidation_conditions": invalidation, "serviceable_fraction": serviceable, "obtainable_share": obtainable, "methods": methods})
    require_unique(scenario_ids, "scenario IDs")
    if len(signatures) < 2:
        raise ValidationError("at least two scenarios must use different sizing parameters")

    top = method_values["top_down"]
    bottom = method_values["bottom_up"]
    midpoint = (top + bottom) / 2.0
    gap = 0.0 if top == bottom == 0 else None if midpoint == 0 else abs(top - bottom) / midpoint * 100.0
    tolerance = number(payload.get("reconciliation_tolerance_percent", 20), "reconciliation_tolerance_percent", 0.0, 100.0)
    warnings: list[str] = []
    if gap is None or gap > tolerance:
        warnings.append("methods exceed the reconciliation tolerance or cannot be reconciled")
    if set(method_keys["top_down"]) != set(method_keys["bottom_up"]):
        warnings.append("methods use different coverage-key sets")
    return {"schema_version": "1.0", "measurement": {"unit": unit, "denominator_id": denominator}, "method_estimates": method_values, "reconciliation": {"absolute_difference": abs(top - bottom), "difference_percent_of_midpoint": gap, "tolerance_percent": tolerance, "within_tolerance": gap is not None and gap <= tolerance}, "scenarios": scenarios, "warnings": warnings, "interpretation": "Conditional scenario calculations; not one certain market truth."}


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Calculate bounded local top-down and bottom-up TAM/SAM/SOM scenarios with Quasar finding and assumption lineage.")
    result.add_argument("input", help="Local JSON sizing input")
    result.add_argument("--output", help="Optional JSON output")
    result.add_argument("--force", action="store_true", help="Replace an existing output")
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        write_json(calculate(require_object(read_json(args.input), "root")), args.output, force=args.force)
        return 0
    except ValidationError as exc:
        return error_exit(exc)


if __name__ == "__main__":
    raise SystemExit(main())
