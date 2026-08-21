#!/usr/bin/env python3
"""Validate Quasar market-analysis structure and cross-field lineage.

Original Quasar work. The validation approach is informed by K-Dense Inc.'s
MIT-licensed `market-research-reports`.
"""

from __future__ import annotations

import argparse
from typing import Any

from _common import ValidationError, error_exit, finding_ids, read_document, require_identifier, require_list, require_object, require_text, write_json

MODULES = {"market-sizing", "tam-sam-som", "forecast", "sensitivity", "unit-normalization", "top-down-bottom-up-reconciliation", "competitive-landscape", "concentration", "demand-segmentation", "scenario-analysis", "custom-method"}
SCENARIO_MODULES = {"market-sizing", "tam-sam-som", "forecast", "scenario-analysis"}


def _mapping(items: Any, collection: str, key: str, errors: list[str]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    if not isinstance(items, list):
        errors.append(f"{collection} must be an array")
        return result
    for index, raw in enumerate(items):
        if not isinstance(raw, dict):
            errors.append(f"{collection}[{index}] must be an object")
            continue
        identifier = raw.get(key)
        try:
            parsed = require_identifier(identifier, f"{collection}[{index}].{key}")
        except ValidationError as exc:
            errors.append(str(exc))
            continue
        if parsed in result:
            errors.append(f"duplicate {collection} ID {parsed!r}")
        result.setdefault(parsed, raw)
    return result


def validate(
    data: Any,
    registered_findings: set[str] | None = None,
    brief: Any = None,
    findings: Any = None,
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    if not isinstance(data, dict):
        return {"valid": False, "errors": ["root must be an object"], "warnings": []}
    required = {"schema_version", "analysis", "measurement_contract_ref", "modules", "assumptions", "calculations", "scenarios", "published_results", "exports", "limitations", "unresolved_reconciliation", "validation_summary"}
    missing_root = sorted(required - set(data))
    if missing_root:
        errors.append("root is missing: " + ", ".join(missing_root))
    if data.get("schema_version") != "1.0":
        errors.append("schema_version must be '1.0'")
    analysis = data.get("analysis", {})
    if not isinstance(analysis, dict):
        errors.append("analysis must be an object")
    else:
        for key in ("analysis_id", "version", "as_of"):
            if not isinstance(analysis.get(key), str) or not analysis.get(key, "").strip():
                errors.append(f"analysis.{key} must not be empty")
        if analysis.get("lifecycle") != "Working" or analysis.get("profile") != "market":
            errors.append("analysis must use lifecycle Working and profile market")
        for key in ("brief_ref", "findings_ref"):
            ref = analysis.get(key)
            if not isinstance(ref, dict) or not ref.get("artifact_id") or not ref.get("version"):
                errors.append(f"analysis.{key} requires artifact_id and exact version")
    contract_ref = data.get("measurement_contract_ref")
    if not isinstance(contract_ref, str) or not contract_ref.strip():
        errors.append("measurement_contract_ref must not be empty")
    if isinstance(brief, dict):
        brief_identity = brief.get("brief", {})
        brief_ref = analysis.get("brief_ref", {}) if isinstance(analysis, dict) else {}
        if (
            not isinstance(brief_identity, dict)
            or not isinstance(brief_ref, dict)
            or brief_ref.get("artifact_id") != brief_identity.get("brief_id")
            or brief_ref.get("version") != brief_identity.get("version")
        ):
            errors.append("analysis.brief_ref does not match the supplied Research Brief ID and version")
        contract = brief.get("measurement_contract")
        if not isinstance(contract, dict) or contract.get("contract_id") != contract_ref:
            errors.append("measurement_contract_ref does not resolve in the supplied Research Brief")
    if isinstance(findings, dict):
        register_identity = findings.get("register", {})
        findings_ref = analysis.get("findings_ref", {}) if isinstance(analysis, dict) else {}
        if (
            not isinstance(register_identity, dict)
            or not isinstance(findings_ref, dict)
            or findings_ref.get("artifact_id") != register_identity.get("register_id")
            or findings_ref.get("version") != register_identity.get("version")
        ):
            errors.append("analysis.findings_ref does not match the supplied Findings Register ID and version")

    modules = data.get("modules", [])
    if not isinstance(modules, list) or not modules:
        errors.append("modules requires at least one item")
        modules = []
    invalid_modules = sorted(set(modules) - MODULES)
    if invalid_modules:
        errors.append("unsupported modules: " + ", ".join(invalid_modules))
    if len(modules) != len(set(modules)):
        errors.append("modules contains duplicates")

    assumptions = _mapping(data.get("assumptions"), "assumptions", "assumption_id", errors)
    calculations = _mapping(data.get("calculations"), "calculations", "calculation_id", errors)
    scenarios = _mapping(data.get("scenarios"), "scenarios", "scenario_id", errors)
    results = _mapping(data.get("published_results"), "published_results", "result_id", errors)
    exports = _mapping(data.get("exports"), "exports", "export_id", errors)
    known_findings = registered_findings or set()

    for assumption_id, item in assumptions.items():
        for ref in item.get("finding_refs", []) if isinstance(item.get("finding_refs"), list) else []:
            if registered_findings is not None and ref not in known_findings:
                errors.append(f"assumption {assumption_id!r} references unknown finding {ref!r}")
        for field in ("value_or_range", "sensitivity_range"):
            bounds = item.get(field)
            if not isinstance(bounds, dict):
                errors.append(f"assumption {assumption_id!r} requires {field}")
                continue
            minimum, maximum = bounds.get("minimum"), bounds.get("maximum")
            if isinstance(minimum, (int, float)) and isinstance(maximum, (int, float)) and minimum > maximum:
                errors.append(f"assumption {assumption_id!r} has reversed {field}")

    for calculation_id, item in calculations.items():
        input_refs = item.get("input_refs", [])
        if not isinstance(input_refs, list) or not input_refs:
            errors.append(f"calculation {calculation_id!r} requires input_refs")
        else:
            for ref in input_refs:
                if not isinstance(ref, dict):
                    errors.append(f"calculation {calculation_id!r} has malformed input_ref")
                    continue
                ref_type, ref_id = ref.get("ref_type"), ref.get("ref_id")
                known = known_findings if ref_type == "finding" else assumptions if ref_type == "assumption" else calculations if ref_type == "calculation" else {}
                if registered_findings is not None or ref_type != "finding":
                    if ref_id not in known:
                        errors.append(f"calculation {calculation_id!r} references unknown {ref_type} {ref_id!r}")
        for ref in item.get("assumption_refs", []) if isinstance(item.get("assumption_refs"), list) else []:
            if ref not in assumptions:
                errors.append(f"calculation {calculation_id!r} references unknown assumption {ref!r}")
        script = item.get("script")
        for key in ("path", "version", "command", "hash"):
            if not isinstance(script, dict) or not isinstance(script.get(key), str) or not script.get(key, "").strip():
                errors.append(f"calculation {calculation_id!r} requires script.{key}")
        if not item.get("rounding_policy"):
            errors.append(f"calculation {calculation_id!r} requires rounding_policy")
        custom = item.get("custom_method")
        if item.get("method") == "custom" and not isinstance(custom, dict):
            errors.append(f"custom calculation {calculation_id!r} requires custom_method lineage")
        if isinstance(custom, dict):
            for key in ("reason", "code_path", "hash", "command", "input_refs", "verification", "limitations", "review_status", "approval_ref"):
                if key not in custom:
                    errors.append(f"custom calculation {calculation_id!r} is missing {key}")
            if custom.get("review_status") == "approved" and not custom.get("approval_ref"):
                errors.append(f"approved custom calculation {calculation_id!r} requires approval_ref")

    if set(modules).intersection(SCENARIO_MODULES) and len(scenarios) < 2:
        errors.append("scenario-based modules require at least two scenarios")
    signatures: set[tuple[str, ...]] = set()
    for scenario_id, item in scenarios.items():
        refs = item.get("assumption_refs", [])
        if not isinstance(refs, list) or not refs:
            errors.append(f"scenario {scenario_id!r} requires assumption_refs")
            refs = []
        for ref in refs:
            if ref not in assumptions:
                errors.append(f"scenario {scenario_id!r} references unknown assumption {ref!r}")
        signatures.add(tuple(sorted(refs)))
        if not item.get("invalidation_conditions"):
            errors.append(f"scenario {scenario_id!r} requires invalidation_conditions")
    if len(scenarios) > 1 and len(signatures) < 2:
        errors.append("scenarios must differ in their assumption sets")

    for result_id, item in results.items():
        if item.get("calculation_ref") not in calculations:
            errors.append(f"published result {result_id!r} references unknown calculation")
        if item.get("scenario_ref") is not None and item.get("scenario_ref") not in scenarios:
            errors.append(f"published result {result_id!r} references unknown scenario")
        for ref in item.get("finding_refs", []) if isinstance(item.get("finding_refs"), list) else []:
            if registered_findings is not None and ref not in known_findings:
                errors.append(f"published result {result_id!r} references unknown finding {ref!r}")
        for ref in item.get("assumption_refs", []) if isinstance(item.get("assumption_refs"), list) else []:
            if ref not in assumptions:
                errors.append(f"published result {result_id!r} references unknown assumption {ref!r}")
        bounds = item.get("range")
        minimum = bounds.get("minimum") if isinstance(bounds, dict) else None
        maximum = bounds.get("maximum") if isinstance(bounds, dict) else None
        if item.get("value") is None and minimum is None and maximum is None:
            errors.append(f"published result {result_id!r} requires a value or range")
        if isinstance(minimum, (int, float)) and isinstance(maximum, (int, float)) and minimum > maximum:
            errors.append(f"published result {result_id!r} has a reversed range")
        locator = item.get("export_locator")
        if locator is not None and locator not in exports:
            errors.append(f"published result {result_id!r} references unknown export {locator!r}")

    for export_id, item in exports.items():
        if item.get("creation_mode") != "derived" or item.get("semantic_authority") != "none":
            errors.append(f"export {export_id!r} must be derived with semantic_authority none")
        for key in ("path", "schema", "hash", "provenance"):
            if not item.get(key):
                errors.append(f"export {export_id!r} requires {key}")
    summary = data.get("validation_summary")
    if not isinstance(summary, dict):
        errors.append("validation_summary must be an object")
    elif summary.get("valid") is True and summary.get("errors"):
        errors.append("validation_summary cannot be valid with errors")
    if registered_findings is None:
        warnings.append("finding refs were syntax-checked only; pass --findings for referential integrity")
    return {"valid": not errors, "analysis_id": analysis.get("analysis_id") if isinstance(analysis, dict) else None, "published_result_ids": sorted(results), "errors": errors, "warnings": warnings}


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Validate one local Quasar market-analysis YAML or JSON artifact and its optional exact input refs.")
    result.add_argument("analysis", help="Local market-analysis YAML or JSON")
    result.add_argument("--findings", help="Exact local Findings Register YAML or JSON")
    result.add_argument("--brief", help="Exact local Research Brief YAML or JSON")
    result.add_argument("--output", help="Optional JSON diagnostic")
    result.add_argument("--force", action="store_true", help="Replace an existing output")
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        findings = read_document(args.findings) if args.findings else None
        brief = read_document(args.brief) if args.brief else None
        report = validate(
            read_document(args.analysis),
            finding_ids(args.findings) if args.findings else None,
            brief,
            findings,
        )
        write_json(report, args.output, force=args.force)
        return 0 if report["valid"] else 1
    except ValidationError as exc:
        return error_exit(exc)


if __name__ == "__main__":
    raise SystemExit(main())
