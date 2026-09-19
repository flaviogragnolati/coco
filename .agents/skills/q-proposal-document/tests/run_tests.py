"""Behavior tests for Proposal Document mapping and Draft 2020-12 schemas."""

from __future__ import annotations

import copy
import json
import sys
import tempfile
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
FIXTURES = SKILL_ROOT / "tests" / "fixtures"
SCRIPTS = SKILL_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))
sys.dont_write_bytecode = True

from document_model import load_yaml, parse_mapping, schema_errors  # noqa: E402
from font_resolution import resolve_generation_font  # noqa: E402

SOURCE_SCHEMA = (
    SKILL_ROOT.parent / "q-proposal-design" / "references" /
    "02-proposal-source.schema.yaml"
)
MAPPING_SCHEMA = SKILL_ROOT / "references" / "04-document-mapping.schema.yaml"
FAILURES: list[str] = []
CHECKS = 0


def check(condition: bool, label: str) -> None:
    global CHECKS
    CHECKS += 1
    print(f"{'ok  ' if condition else 'FAIL'} {label}")
    if not condition:
        FAILURES.append(label)


def has_error(value: dict, schema: Path, fragment: str) -> bool:
    return fragment in "\n".join(schema_errors(value, schema))


def main() -> int:
    source = load_yaml(FIXTURES / "proposal-source.valid.json")
    mapping_path = FIXTURES / "04-document-mapping.valid.md"
    mapping = parse_mapping(mapping_path)

    source_errors = schema_errors(source, SOURCE_SCHEMA)
    mapping_errors = schema_errors(mapping, MAPPING_SCHEMA)
    dependency_gap = "Draft 2020-12" in "\n".join(source_errors + mapping_errors)
    check(not dependency_gap, "jsonschema provides a real Draft 2020-12 validator")
    if dependency_gap:
        print("\n".join(source_errors + mapping_errors))
        return 1

    check(not source_errors, f"the valid Proposal Source passes: {source_errors}")
    check(not mapping_errors, f"the Markdown mapping frontmatter passes: {mapping_errors}")

    invalid = copy.deepcopy(source)
    invalid["artifact"]["version"] = "version-one"
    check(has_error(invalid, SOURCE_SCHEMA, "does not match"), "pattern is enforced")

    invalid = copy.deepcopy(source)
    invalid["proposal"]["proposal_id"] = ""
    min_length_errors = "\n".join(schema_errors(invalid, SOURCE_SCHEMA))
    check(
        "too short" in min_length_errors or "non-empty" in min_length_errors,
        "minLength is enforced",
    )

    valid_criterion_errors = schema_errors(source, SOURCE_SCHEMA)
    check(
        not valid_criterion_errors,
        "an acceptance criterion with satisfies passes",
    )
    invalid_criterion = load_yaml(FIXTURES / "proposal-source-criterion.invalid.json")
    check(
        has_error(invalid_criterion, SOURCE_SCHEMA, "satisfies"),
        "an acceptance criterion without satisfies fails",
    )

    invalid = copy.deepcopy(source)
    invalid["downstream_interfaces"]["document"]["object_refs"] = ["OBJ-001", "OBJ-001"]
    check(has_error(invalid, SOURCE_SCHEMA, "non-unique"), "uniqueItems is enforced")

    invalid = copy.deepcopy(source)
    invalid["objects"]["objectives"] = [{"id": "OBJ-001"}]
    ref_errors = schema_errors(invalid, SOURCE_SCHEMA)
    check(
        any("required" in error for error in ref_errors),
        "$ref and $defs are resolved",
    )

    invalid_mapping = copy.deepcopy(mapping)
    invalid_mapping["document"]["include"]["alternatives"] = 1
    check(has_error(invalid_mapping, MAPPING_SCHEMA, "not valid under"), "oneOf is enforced")

    invalid_mapping = copy.deepcopy(mapping)
    invalid_mapping["decisions"][0]["source_refs"] = ["DEC-001", "DEC-001"]
    check(has_error(invalid_mapping, MAPPING_SCHEMA, "non-unique"), "mapping uniqueness is enforced")

    try:
        parse_mapping(FIXTURES / "04-document-mapping.invalid.yaml")
        check(False, "a YAML mapping file is rejected")
    except ValueError as exc:
        check("04-document-mapping.md" in str(exc), "a YAML mapping file is rejected")

    font = resolve_generation_font()
    check(
        font["declared_family"] == "Aptos"
        and font["declared_fallback"] == "Arial"
        and font["generation_slot"] == "Arial"
        and font["generation_resolved"] in {"Arial", "Liberation Sans", "DejaVu Sans"}
        and Path(font["regular_path"]).is_file()
        and Path(font["bold_path"]).is_file(),
        "the Arial generation slot resolves with declared and runtime provenance",
    )
    with tempfile.TemporaryDirectory() as directory:
        missing = Path(directory) / "missing.ttf"
        try:
            resolve_generation_font((("Unavailable Sans", (missing,), (missing,)),))
            check(False, "missing generation fonts produce an honest capability gap")
        except RuntimeError as exc:
            check(
                "Arial -> Liberation Sans -> DejaVu Sans" in str(exc),
                "missing generation fonts produce an honest capability gap",
            )

    if FAILURES:
        print(f"\nProposal Document tests: {len(FAILURES)} failed")
        return 1
    print(f"\nProposal Document tests: {CHECKS} passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
