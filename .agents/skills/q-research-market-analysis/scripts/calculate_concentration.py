#!/usr/bin/env python3
"""Calculate descriptive HHI and CRn from registered market-share inputs.

Original Quasar work informed by the concentration-method discussion in
K-Dense Inc.'s MIT-licensed `market-research-reports`.
"""

from __future__ import annotations

import argparse
from typing import Any

from _common import ValidationError, error_exit, number, read_json, require_identifier, require_list, require_object, require_unique, write_json


def calculate(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("schema_version") != "1.0":
        raise ValidationError("schema_version must be '1.0'")
    unit = payload.get("share_unit")
    if unit not in {"fraction", "percent"}:
        raise ValidationError("share_unit must be fraction or percent")
    known_findings = set(require_list(payload.get("known_finding_ids"), "known_finding_ids", 1, 10_000))
    rows = require_list(payload.get("shares"), "shares", 1, 10_000)
    competitors: list[str] = []
    percent_shares: list[tuple[str, float]] = []
    for index, raw in enumerate(rows):
        row = require_object(raw, f"shares[{index}]")
        competitor = require_identifier(row.get("competitor_id"), f"shares[{index}].competitor_id")
        competitors.append(competitor)
        share = number(row.get("share"), f"shares[{index}].share", 0.0, 1.0 if unit == "fraction" else 100.0)
        refs = [require_identifier(value, f"shares[{index}].finding_refs[{position}]") for position, value in enumerate(require_list(row.get("finding_refs"), f"shares[{index}].finding_refs", 1, 100))]
        missing = sorted(set(refs) - known_findings)
        if missing:
            raise ValidationError(f"{competitor} references unknown findings: {', '.join(missing)}")
        percent_shares.append((competitor, share * 100 if unit == "fraction" else share))
    require_unique(competitors, "competitor IDs")
    total = sum(value for _, value in percent_shares)
    tolerance = number(payload.get("coverage_tolerance_percent", 0.01), "coverage_tolerance_percent", 0.0, 5.0)
    if total > 100 + tolerance:
        raise ValidationError(f"shares total {total}, above 100% plus tolerance")
    residual = max(0.0, 100 - total)
    orders = payload.get("crn", [1, 3, 4])
    orders = require_list(orders, "crn", 1, 20)
    crn: dict[str, float] = {}
    sorted_values = sorted((value for _, value in percent_shares), reverse=True)
    for position, order in enumerate(orders):
        if type(order) is not int or not 1 <= order <= len(sorted_values):
            raise ValidationError(f"crn[{position}] must be from 1 through {len(sorted_values)}")
        crn[f"CR{order}"] = sum(sorted_values[:order])
    hhi = sum(value * value for value in sorted_values)
    return {"schema_version": "1.0", "share_unit": "percent", "input_share_total": total, "residual_or_unknown_share": residual, "hhi": hhi, "crn": crn, "shares": [{"competitor_id": competitor, "percent_share": value} for competitor, value in sorted(percent_shares)], "interpretation": "Descriptive concentration screen only; not a legal or antitrust conclusion."}


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Calculate deterministic descriptive HHI and CRn from bounded, non-negative, finding-linked shares.")
    result.add_argument("input", help="Local JSON share input")
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
