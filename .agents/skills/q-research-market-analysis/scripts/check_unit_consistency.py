#!/usr/bin/env python3
"""Check Quasar market comparison groups for measurement consistency.

Adapted from K-Dense Inc.'s MIT-licensed `market-research-reports` script at
commit 13385c7c4db02fdcc84a020752c07cce91ef780e. Copyright (c) 2025
K-Dense Inc.
"""

from __future__ import annotations

import argparse
from typing import Any

from _common import ValidationError, error_exit, finding_ids, number, read_csv_records, require_identifier, require_text, require_unique, write_json

FIELDS = ("record_id", "comparison_group", "value", "unit", "currency", "base_year", "price_basis", "measure_type", "stock_or_flow", "gross_or_net", "geography", "period", "taxonomy", "taxonomy_version", "denominator_id", "finding_ref")
CONSISTENCY = ("unit", "currency", "base_year", "price_basis", "measure_type", "stock_or_flow", "gross_or_net", "geography", "period", "taxonomy", "taxonomy_version", "denominator_id")


def check(rows: list[dict[str, str]], known_findings: set[str]) -> dict[str, Any]:
    errors: list[str] = []
    record_ids: list[str] = []
    groups: dict[str, dict[str, set[str]]] = {}
    for row_number, row in enumerate(rows, 2):
        try:
            record_id = require_identifier(row["record_id"], f"row {row_number}.record_id")
            record_ids.append(record_id)
            group = require_identifier(row["comparison_group"], f"row {row_number}.comparison_group")
            number(row["value"], f"row {row_number}.value")
            finding_ref = require_identifier(row["finding_ref"], f"row {row_number}.finding_ref")
            if finding_ref not in known_findings:
                raise ValidationError(f"row {row_number} references unknown finding {finding_ref!r}")
            currency = require_text(row["currency"], f"row {row_number}.currency", allow_empty=True, maximum=3)
            base_year = require_text(row["base_year"], f"row {row_number}.base_year", allow_empty=True, maximum=4)
            price_basis = require_text(row["price_basis"], f"row {row_number}.price_basis", maximum=20)
            if currency and (len(currency) != 3 or currency.upper() != currency or not base_year or price_basis == "not-applicable"):
                raise ValidationError(f"row {row_number} has incomplete monetary basis")
            if not currency and price_basis != "not-applicable":
                raise ValidationError(f"row {row_number} non-monetary value must use price_basis not-applicable")
            normalized = {field: require_text(row[field], f"row {row_number}.{field}", allow_empty=field in {"currency", "base_year", "taxonomy", "taxonomy_version"}, maximum=200) for field in CONSISTENCY}
            values = groups.setdefault(group, {field: set() for field in CONSISTENCY})
            for field, value in normalized.items():
                values[field].add(value)
        except ValidationError as exc:
            errors.append(str(exc))
    try:
        require_unique(record_ids, "record IDs")
    except ValidationError as exc:
        errors.append(str(exc))
    mismatches: dict[str, dict[str, list[str]]] = {}
    for group, values in sorted(groups.items()):
        current = {field: sorted(observed) for field, observed in values.items() if len(observed) > 1}
        if current:
            mismatches[group] = current
            errors.append(f"comparison group {group!r} mixes: {', '.join(sorted(current))}")
    return {"valid": not errors, "record_count": len(rows), "comparison_group_count": len(groups), "mismatches": mismatches, "errors": errors}


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Check local market values for comparable units, denominators, price bases, periods, taxonomies, and registered finding refs.")
    result.add_argument("input", help="Local CSV comparison input")
    result.add_argument("--findings", required=True, help="Exact local Findings Register YAML or JSON")
    result.add_argument("--output", help="Optional JSON output")
    result.add_argument("--force", action="store_true", help="Replace an existing output")
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        report = check(read_csv_records(args.input, FIELDS), finding_ids(args.findings))
        write_json(report, args.output, force=args.force)
        return 0 if report["valid"] else 1
    except ValidationError as exc:
        return error_exit(exc)


if __name__ == "__main__":
    raise SystemExit(main())
