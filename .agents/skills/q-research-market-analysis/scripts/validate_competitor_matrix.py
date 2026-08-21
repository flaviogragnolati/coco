#!/usr/bin/env python3
"""Validate a complete Quasar competitor-feature matrix.

Adapted from K-Dense Inc.'s MIT-licensed `market-research-reports` script at
commit 13385c7c4db02fdcc84a020752c07cce91ef780e. Copyright (c) 2025
K-Dense Inc. Quasar resolves evidence to the
Findings Register rather than an upstream source ledger.
"""

from __future__ import annotations

import argparse
from typing import Any

from _common import ValidationError, error_exit, finding_ids, read_csv_records, require_identifier, require_text, write_json

FIELDS = ("competitor_id", "competitor_name", "feature_id", "feature_name", "status", "finding_refs", "as_of", "geography", "product_scope", "notes")
STATUSES = {"yes", "no", "partial", "unknown", "not-applicable"}


def _refs(raw: str, context: str) -> list[str]:
    if not raw:
        return []
    values = [require_identifier(value.strip(), context) for value in raw.split(";")]
    if any(not value for value in values) or len(values) != len(set(values)):
        raise ValidationError(f"{context} contains an empty or duplicate ID")
    return values


def validate(rows: list[dict[str, str]], known_findings: set[str]) -> dict[str, Any]:
    errors: list[str] = []
    competitors: dict[str, str] = {}
    features: dict[str, str] = {}
    pairs: set[tuple[str, str]] = set()
    scopes: set[tuple[str, str, str]] = set()
    counts: dict[str, int] = {}
    for row_number, row in enumerate(rows, 2):
        try:
            competitor_id = require_identifier(row["competitor_id"], f"row {row_number}.competitor_id")
            feature_id = require_identifier(row["feature_id"], f"row {row_number}.feature_id")
            competitor_name = require_text(row["competitor_name"], f"row {row_number}.competitor_name", maximum=200)
            feature_name = require_text(row["feature_name"], f"row {row_number}.feature_name", maximum=200)
            if competitor_id in competitors and competitors[competitor_id] != competitor_name:
                raise ValidationError(f"row {row_number} changes competitor name for {competitor_id}")
            if feature_id in features and features[feature_id] != feature_name:
                raise ValidationError(f"row {row_number} changes feature name for {feature_id}")
            competitors[competitor_id] = competitor_name
            features[feature_id] = feature_name
            pair = (competitor_id, feature_id)
            if pair in pairs:
                raise ValidationError(f"row {row_number} duplicates pair {competitor_id}/{feature_id}")
            pairs.add(pair)
            status = require_text(row["status"], f"row {row_number}.status", maximum=20)
            if status not in STATUSES:
                raise ValidationError(f"row {row_number} has unsupported status {status!r}")
            refs = _refs(row["finding_refs"], f"row {row_number}.finding_refs")
            if status not in {"unknown", "not-applicable"} and not refs:
                raise ValidationError(f"row {row_number} status {status!r} requires finding_refs")
            missing = sorted(set(refs) - known_findings)
            if missing:
                raise ValidationError(f"row {row_number} references unknown findings: {', '.join(missing)}")
            scopes.add((require_text(row["as_of"], f"row {row_number}.as_of", maximum=10), require_text(row["geography"], f"row {row_number}.geography", maximum=200), require_text(row["product_scope"], f"row {row_number}.product_scope", maximum=500)))
            require_text(row["notes"], f"row {row_number}.notes", allow_empty=True)
            counts[status] = counts.get(status, 0) + 1
        except ValidationError as exc:
            errors.append(str(exc))
    expected = {(competitor, feature) for competitor in competitors for feature in features}
    missing_pairs = sorted(expected - pairs)
    if missing_pairs:
        errors.append(f"matrix is incomplete; missing {len(missing_pairs)} competitor-feature pairs")
    if len(scopes) > 1:
        errors.append("matrix rows use inconsistent as_of/geography/product_scope")
    return {"valid": not errors, "row_count": len(rows), "competitor_count": len(competitors), "feature_count": len(features), "expected_pair_count": len(expected), "status_counts": dict(sorted(counts.items())), "errors": errors}


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Validate a bounded local competitor matrix for complete coverage, common scope, and Quasar finding refs.")
    result.add_argument("matrix", help="Local CSV competitor matrix")
    result.add_argument("--findings", required=True, help="Exact local Findings Register YAML or JSON")
    result.add_argument("--output", help="Optional JSON output")
    result.add_argument("--force", action="store_true", help="Replace an existing output")
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        report = validate(read_csv_records(args.matrix, FIELDS), finding_ids(args.findings))
        write_json(report, args.output, force=args.force)
        return 0 if report["valid"] else 1
    except ValidationError as exc:
        return error_exit(exc)


if __name__ == "__main__":
    raise SystemExit(main())
